
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Loader2, X, Search } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, updateDoc, arrayUnion, arrayRemove, query, where, getDocs, limit, setDoc } from "firebase/firestore";
import { UserProfile, AboutBawmCreationPermissions, DefaultAboutBawmCreationPermissions } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

export default function AboutBawmSettingsPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [allowedUsers, setAllowedUsers] = useState<UserProfile[]>([]);
    const [permissions, setPermissions] = useState<AboutBawmCreationPermissions>(DefaultAboutBawmCreationPermissions);
    const [saving, setSaving] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (!authLoading) {
            if (!user || userProfile?.userType !== 'Admin') {
                toast({ title: "Access Denied", description: "You must be an administrator to view this page.", variant: "destructive" });
                router.replace('/feed');
            }
        }
    }, [user, userProfile, authLoading, router, toast]);

    const fetchAllowedUsers = useCallback(async (userIds: string[]) => {
        if (userIds.length === 0) {
            setAllowedUsers([]);
            return;
        }
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where('uid', 'in', userIds.slice(0, 30)));
            const usersSnapshot = await getDocs(q);
            const fetchedUsers = usersSnapshot.docs.map(doc => doc.data() as UserProfile);
            setAllowedUsers(fetchedUsers.sort((a,b) => (a.displayName || "").localeCompare(b.displayName || "")));
        } catch (error) {
            console.error("Error fetching allowed users:", error);
            toast({ title: "Error", description: "Could not load allowed user profiles.", variant: "destructive" });
        }
    }, [toast]);
    
    const fetchPermissions = useCallback(async () => {
        setLoadingData(true);
        try {
            const settingsRef = doc(db, "app_settings", "aboutBawmCreationPermissions");
            const docSnap = await getDoc(settingsRef);
            if (docSnap.exists()) {
                const perms = docSnap.data() as AboutBawmCreationPermissions;
                setPermissions(perms);
                await fetchAllowedUsers(perms.allowedUserIds);
            } else {
                await setDoc(settingsRef, DefaultAboutBawmCreationPermissions);
                setPermissions(DefaultAboutBawmCreationPermissions);
                setAllowedUsers([]);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ title: "Error", description: "Could not load settings.", variant: "destructive" });
        } finally {
            setLoadingData(false);
        }
    }, [toast, fetchAllowedUsers]);


    useEffect(() => {
        if(userProfile?.userType === 'Admin') {
            fetchPermissions();
        }
    }, [fetchPermissions, userProfile]);
    
    useEffect(() => {
        const handler = setTimeout(async () => {
            if (searchQuery.trim().length > 2) {
                setIsSearching(true);
                try {
                    const usersRef = collection(db, "users");
                    const q = query(
                        usersRef, 
                        where('displayName', '>=', searchQuery),
                        where('displayName', '<=', searchQuery + '\uf8ff'),
                        limit(10)
                    );
                    const usersSnapshot = await getDocs(q);
                    const results = usersSnapshot.docs.map(doc => doc.data() as UserProfile)
                        .filter(u => !permissions.allowedUserIds.includes(u.uid)); // Exclude already allowed users
                    setSearchResults(results);
                } catch (error) {
                    console.error("Error searching users:", error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(handler);

    }, [searchQuery, permissions.allowedUserIds]);

    const handleAddUser = async (userId: string) => {
        setSaving(true);
        try {
            const settingsRef = doc(db, "app_settings", "aboutBawmCreationPermissions");
            await updateDoc(settingsRef, {
                allowedUserIds: arrayUnion(userId)
            });
            toast({ title: "User Added", description: "Permission to create About BAWM content has been granted." });
            await fetchPermissions(); // Refetch all data
            setSearchQuery("");
            setSearchResults([]);
        } catch (error) {
            console.error("Error adding user:", error);
            toast({ title: "Error", description: "Could not grant permission.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveUser = async (userId: string) => {
        setSaving(true);
         try {
            const settingsRef = doc(db, "app_settings", "aboutBawmCreationPermissions");
            await updateDoc(settingsRef, {
                allowedUserIds: arrayRemove(userId)
            });
            toast({ title: "User Removed", description: "Permission to create About BAWM content has been revoked." });
            await fetchPermissions(); // Refetch all data
        } catch (error) {
            console.error("Error removing user:", error);
            toast({ title: "Error", description: "Could not revoke permission.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };


    if (authLoading || loadingData) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle>About BAWM Creation Settings</CardTitle>
                    <CardDescription>Grant specific users the permission to create new 'About BAWM' content.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium mb-2">Add User</h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input 
                                    placeholder="Search by display name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                                {(isSearching) && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin" />}
                                {searchResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg">
                                        {searchResults.map(u => (
                                            <div key={u.uid} onClick={() => handleAddUser(u.uid)} className="flex items-center gap-3 p-2 hover:bg-muted cursor-pointer text-sm">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={u.profilePictureUrl || undefined} />
                                                    <AvatarFallback>{u.displayName?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-semibold">{u.displayName}</p>
                                                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator />
                        
                        <div>
                            <h3 className="text-lg font-medium mb-4">Allowed Users ({allowedUsers.length})</h3>
                            {allowedUsers.length > 0 ? (
                                <div className="space-y-2">
                                    {allowedUsers.map(u => (
                                         <div key={u.uid} className="flex items-center justify-between p-2 rounded-md hover:bg-muted text-sm">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={u.profilePictureUrl || undefined} alt={u.displayName} />
                                                    <AvatarFallback>{u.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-semibold">{u.displayName}</div>
                                                    <div className="text-xs text-muted-foreground">@{u.username}</div>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveUser(u.uid)} disabled={saving}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">No users have been granted permission yet.</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

    