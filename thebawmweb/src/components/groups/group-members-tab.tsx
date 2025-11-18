
"use client";

import { useState, useEffect, useCallback } from "react";
import { GroupInfo, UserProfile } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Loader2, UserCheck, UserX, Trash2 } from "lucide-react";
import { collection, getDocs, query, where, documentId, doc, updateDoc, arrayUnion, arrayRemove, Timestamp, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";


function MemberCard({ user: member, group, isModerator }: { user: UserProfile, group: GroupInfo, isModerator: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const handleRemove = async () => {
      const groupRef = doc(db, 'groups', group.id);
      try {
          await updateDoc(groupRef, {
              members: arrayRemove(member.uid),
              [`declinedMembers.${member.uid}`]: Timestamp.now()
          });
          toast({ title: "Member Removed", description: `${member.displayName} has been removed from the group.`});
      } catch (error) {
          console.error("Error removing member:", error);
          toast({ title: "Error", description: "Could not remove member.", variant: "destructive" });
      }
  }
  
  const isSelf = user?.uid === member.uid;

  return (
    <Card className="p-4 flex items-center gap-4">
       <Link href={`/profile/${member.username}`} className="flex-grow flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={member.profilePictureUrl || undefined} alt={member.displayName} />
          <AvatarFallback>{member.displayName?.charAt(0).toUpperCase() || member.username?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-grow">
            <p className="font-semibold hover:underline">{member.displayName}</p>
            <p className="text-sm text-muted-foreground">@{member.username}</p>
        </div>
      </Link>
      {isModerator && !isSelf && member.uid !== group.ownerId && (
        <Button variant="ghost" size="icon" className="text-destructive" onClick={handleRemove}>
            <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </Card>
  );
}

function GroupRequestsTab({ group, onUpdateRequest }: { group: GroupInfo, onUpdateRequest: () => void }) {
    const [requests, setRequests] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        if (!group.pendingMembers || group.pendingMembers.length === 0) {
            setRequests([]);
            setLoading(false);
            return;
        }
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where(documentId(), 'in', group.pendingMembers.slice(0, 30)));
            const snapshot = await getDocs(q);
            const fetchedUsers = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
            setRequests(fetchedUsers);
        } catch (error) {
            console.error("Error fetching requests:", error);
        } finally {
            setLoading(false);
        }
    }, [group.pendingMembers]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleResponse = async (userToHandle: UserProfile, accept: boolean) => {
        const groupRef = doc(db, 'groups', group.id);
        const userRef = doc(db, 'users', userToHandle.uid);
        
        try {
            if (accept) {
                await updateDoc(groupRef, {
                    members: arrayUnion(userToHandle.uid),
                    pendingMembers: arrayRemove(userToHandle.uid)
                });
                await updateDoc(userRef, { followedGroups: arrayUnion(group.id) });
                toast({ title: "Request Accepted", description: `${userToHandle.displayName} is now a member.` });
            } else {
                await updateDoc(groupRef, {
                    pendingMembers: arrayRemove(userToHandle.uid),
                    [`declinedMembers.${userToHandle.uid}`]: Timestamp.now()
                });
                toast({ title: "Request Declined" });
            }
            // The parent component is subscribed to real-time updates, so we don't need to call onUpdateRequest.
        } catch (error) {
            console.error("Error handling request:", error);
            toast({ title: "Error", description: "Could not process the request.", variant: "destructive" });
        }
    }


    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div>
            {requests.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {requests.map(user => (
                        <Card key={user.uid} className="p-4">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12">
                                <AvatarImage src={user.profilePictureUrl || undefined} alt={user.displayName} />
                                <AvatarFallback>{user.displayName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-grow">
                                    <p className="font-semibold">{user.displayName}</p>
                                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <Button size="sm" className="w-full" onClick={() => handleResponse(user, true)} disabled={loading}>
                                    Accept
                                </Button>
                                <Button size="sm" variant="outline" className="w-full" onClick={() => handleResponse(user, false)} disabled={loading}>
                                    Decline
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <p className="text-muted-foreground text-center py-8">No pending join requests.</p>
            )}
        </div>
    );
}


export function GroupMembersTab({ group }: { group: GroupInfo }) {
    const { user, userProfile } = useAuth();
    const [members, setMembers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    const isOwner = group.ownerId === user?.uid;
    const isAdmin = userProfile?.userType === 'Admin';
    const canModerate = isOwner || isAdmin;

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        if (group.members.length === 0) {
             setMembers([]);
            setLoading(false);
            return;
        }
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where(documentId(), 'in', group.members.slice(0,30)));
            const snapshot = await getDocs(q);
            const fetchedMembers = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
            setMembers(fetchedMembers);
        } catch (error) {
            console.error("Error fetching members:", error);
        } finally {
            setLoading(false);
        }
    }, [group.members]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);


    return (
        <Card>
            <CardHeader>
                <CardTitle>Members</CardTitle>
                <CardDescription>{group.name} has {group.members.length} {group.members.length === 1 ? 'member' : 'members'}.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Tabs defaultValue="all" className="w-full">
                    <TabsList>
                        <TabsTrigger value="all">All Members</TabsTrigger>
                        {isOwner && group.groupType === 'private' && (
                             <TabsTrigger value="requests">
                                Join Requests 
                                {group.pendingMembers && group.pendingMembers.length > 0 && <span className="ml-2 bg-primary text-primary-foreground h-5 w-5 rounded-full flex items-center justify-center text-xs">{group.pendingMembers.length}</span>}
                            </TabsTrigger>
                        )}
                    </TabsList>
                    <TabsContent value="all" className="mt-4">
                        {loading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                        ) : members.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {members.map(member => <MemberCard key={member.uid} user={member} group={group} isModerator={canModerate} />)}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-8">This group doesn't have any members yet.</p>
                        )}
                    </TabsContent>
                    {isOwner && group.groupType === 'private' && (
                         <TabsContent value="requests" className="mt-4">
                            <GroupRequestsTab group={group} onUpdateRequest={() => {}} />
                        </TabsContent>
                    )}
                </Tabs>
            </CardContent>
        </Card>
    );
}
