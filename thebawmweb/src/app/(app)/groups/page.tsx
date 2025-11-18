
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { GroupInfo, GroupCreationPermissions } from "@/lib/types";
import { Loader2, PlusCircle, Users, Lock, Globe, Settings, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { JoinGroupButton } from "@/components/groups/join-group-button";
import { DefaultGroupCreationPermissions } from "@/lib/types";
import { Input } from "@/components/ui/input";


function GroupCard({ group }: { group: GroupInfo }) {
    return (
        <Card className="flex flex-col">
            <CardHeader className="p-4">
                 <Link href={`/groups/${group.groupId}`} className="block hover:bg-muted/50 rounded-lg">
                    <div className="flex items-center">
                        <Avatar className="h-12 w-12 mr-4">
                            <AvatarImage src={group.profilePictureUrl || undefined} />
                            <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-grow">
                            <p className="font-semibold hover:underline">{group.name}</p>
                            <p className="text-sm text-muted-foreground">@{group.groupId}</p>
                        </div>
                    </div>
                </Link>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-grow">
                 <div className="text-sm text-muted-foreground flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1">
                        {group.groupType === 'private' ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                        <span>{group.groupType.charAt(0).toUpperCase() + group.groupType.slice(1)}</span>
                    </div>
                     <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{(group.members || []).length} Members</span>
                    </div>
                </div>
            </CardContent>
            <div className="p-4 pt-0">
                <JoinGroupButton group={group} />
            </div>
        </Card>
    )
}


export default function GroupsListPage() {
    const { user, userProfile } = useAuth();
    const [groups, setGroups] = useState<GroupInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState<GroupCreationPermissions>(DefaultGroupCreationPermissions);
    const [searchTerm, setSearchTerm] = useState("");
    
    useEffect(() => {
        const groupsRef = collection(db, "groups");
        const unsubscribe = onSnapshot(groupsRef, (querySnapshot) => {
            const fetchedGroups = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                } as GroupInfo;
            });
            setGroups(fetchedGroups);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching groups:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            const permsRef = doc(db, "app_settings", "groupCreationPermissions");
            const unsubscribe = onSnapshot(permsRef, (permsSnap) => {
                if (permsSnap.exists()) {
                    setPermissions(permsSnap.data() as GroupCreationPermissions);
                }
            });
            return () => unsubscribe();
        }
    }, [user]);

    const isAdmin = userProfile?.userType === 'Admin';
    const canCreateGroup = user && (permissions.allowedUserIds.includes(user.uid) || isAdmin);

    const filteredGroups = groups.filter(group => 
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        group.groupId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                <p className="text-[18px] font-bold font-headline flex-1">Groups</p>
                <div className="flex w-full md:w-auto items-center gap-2">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            placeholder="Search groups..."
                            className="pl-10 bg-background"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canCreateGroup && (
                        <Button asChild>
                            <Link href="/groups/create">
                                <PlusCircle className="mr-1 h-4 w-4"/>
                                Create
                            </Link>
                        </Button>
                    )}
                    {isAdmin && (
                            <Button asChild variant="outline" size="icon">
                            <Link href="/admin/group-settings">
                                <Settings className="h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
            <div>
                {loading ? (
                        <div className="flex h-48 items-center justify-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : filteredGroups.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredGroups.map(group => <GroupCard key={group.id} group={group} />)}
                    </div>
                ) : (
                    <div className="text-center py-16 text-muted-foreground">
                        <p>No groups found. {canCreateGroup ? "Be the first to create one!" : ""}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
