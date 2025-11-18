
"use client";

import { GroupInfo, UserProfile } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { doc, deleteDoc, writeBatch, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "../ui/input";
import { Loader2, Trash2, X, Search } from "lucide-react";
import { Separator } from "../ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";


function PostersSettings({ group, onUpdate }: { group: GroupInfo, onUpdate: () => void }) {
    const { userProfile } = useAuth();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [allowedPosters, setAllowedPosters] = useState<UserProfile[]>([]);
    const [loadingPosters, setLoadingPosters] = useState(true);

    const postersIds = useMemo(() => Array.isArray(group.posters) ? group.posters : [], [group.posters]);

    const fetchAllowedPosters = useCallback(async () => {
        setLoadingPosters(true);
        if (postersIds.length === 0) {
            setAllowedPosters([]);
            setLoadingPosters(false);
            return;
        }
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where('uid', 'in', postersIds.slice(0, 30)));
            const usersSnapshot = await getDocs(q);
            const fetchedUsers = usersSnapshot.docs.map(doc => doc.data() as UserProfile);
            setAllowedPosters(fetchedUsers);
        } catch (error) {
            console.error("Error fetching allowed posters:", error);
        } finally {
            setLoadingPosters(false);
        }
    }, [postersIds]);


    useEffect(() => {
        fetchAllowedPosters();
    }, [fetchAllowedPosters]);

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
                        .filter(u => !postersIds.includes(u.uid) && u.uid !== group.ownerId);
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

    }, [searchQuery, postersIds, group.ownerId]);

    const handleAddPoster = async (userId: string) => {
        setSaving(true);
        try {
            const groupRef = doc(db, "groups", group.id);
            await updateDoc(groupRef, {
                posters: arrayUnion(userId)
            });
            toast({ title: "User Added", description: "This user can now post in the group." });
            setSearchQuery("");
            setSearchResults([]);
            onUpdate();
        } catch (error) {
            console.error("Error adding poster:", error);
            toast({ title: "Error", description: "Could not grant permission.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleRemovePoster = async (userId: string) => {
        setSaving(true);
        try {
            const groupRef = doc(db, "groups", group.id);
            await updateDoc(groupRef, {
                posters: arrayRemove(userId)
            });
            toast({ title: "User Removed", description: "This user can no longer post in the group." });
            onUpdate();
        } catch (error) {
            console.error("Error removing poster:", error);
            toast({ title: "Error", description: "Could not revoke permission.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle>Posting Permissions</CardTitle>
                <CardDescription>Control who can create posts in this group.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="text-lg font-medium mb-2">Grant Posting Access</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search by display name to add user..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                        {(isSearching) && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin" />}
                        {searchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg">
                                {searchResults.map(u => (
                                    <div key={u.uid} onClick={() => handleAddPoster(u.uid)} className="flex items-center gap-3 p-2 hover:bg-muted cursor-pointer text-sm">
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
                    <h3 className="text-lg font-medium mb-4">Users with Posting Access</h3>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                            <p className="font-semibold text-gray-500">Site Admins (Always allowed)</p>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                            <p className="font-semibold text-gray-500">Group Owner (Always allowed)</p>
                        </div>

                        {loadingPosters ? (
                             <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                        ) : allowedPosters.length > 0 ? (
                           allowedPosters.map(u => (
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
                                   <Button variant="ghost" size="icon" onClick={() => handleRemovePoster(u.uid)} disabled={saving}>
                                       <X className="h-4 w-4" />
                                   </Button>
                               </div>
                           ))
                        ) : (
                           !loadingPosters && <p className="text-sm text-muted-foreground text-center py-4">No other users have been granted posting access.</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}


export function GroupSettingsTab({ group, onGroupUpdate }: { group: GroupInfo, onGroupUpdate: () => void }) {
    const { user, userProfile } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");

    const isOwner = user?.uid === group.ownerId;
    const isAdmin = userProfile?.userType === 'Admin';
    const canEdit = isOwner || isAdmin;
    
    const handleDeleteGroup = async () => {
        setIsDeleting(true);
        try {
            const batch = writeBatch(db);

            const postsQuery = query(collection(db, "groupPost"), where("groupId", "==", group.id));
            const postsSnapshot = await getDocs(postsQuery);
            postsSnapshot.forEach(doc => batch.delete(doc.ref));

            const groupRef = doc(db, "groups", group.id);
            batch.delete(groupRef);

            await batch.commit();

            toast({ title: "Group Deleted", description: `The group "${group.name}" has been permanently deleted.` });
            router.push('/groups');

        } catch (error) {
            console.error("Error deleting group:", error);
            toast({ title: "Error", description: "Could not delete the group.", variant: "destructive" });
        } finally {
            setIsDeleting(false);
            setDeleteDialogOpen(false);
        }
    };


    if (!canEdit) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Settings</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">You do not have permission to change settings for this group.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-8">
            <PostersSettings group={group} onUpdate={onGroupUpdate} />
            
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle>Delete Group</CardTitle>
                    <CardDescription>Permanently delete this group and all of its content, including posts. This action cannot be undone.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="destructive">Delete This Group</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Are you absolutely sure?</DialogTitle>
                                <DialogDescription>
                                   This will permanently delete the group <strong>{group.name}</strong>.
                                   To confirm, type <span className="font-bold text-foreground">{group.groupId}</span> below.
                                </DialogDescription>
                            </DialogHeader>
                            <Input 
                                placeholder="Type group ID to confirm"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                            />
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                                <Button 
                                    variant="destructive" 
                                    onClick={handleDeleteGroup} 
                                    disabled={isDeleting || confirmText !== group.groupId}
                                >
                                    {isDeleting ? <Loader2 className="animate-spin mr-2" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    Delete Group
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
        </div>
    );
}
