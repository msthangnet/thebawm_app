
"use client";

import { useState, useEffect, useCallback } from "react";
import { EventInfo, UserProfile } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Loader2, Trash2 } from "lucide-react";
import { collection, getDocs, query, where, documentId, doc, updateDoc, arrayUnion, arrayRemove, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";


function ParticipantCard({ user: participant, event, isModerator }: { user: UserProfile, event: EventInfo, isModerator: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const handleRemove = async () => {
      const eventRef = doc(db, 'events', event.id);
      try {
          await updateDoc(eventRef, {
              participants: arrayRemove(participant.uid),
              [`declinedParticipants.${participant.uid}`]: Timestamp.now()
          });
          toast({ title: "Participant Removed", description: `${participant.displayName} has been removed from the event.`});
      } catch (error) {
          console.error("Error removing participant:", error);
          toast({ title: "Error", description: "Could not remove participant.", variant: "destructive" });
      }
  }
  
  const isSelf = user?.uid === participant.uid;

  return (
    <Card className="p-4 flex items-center gap-4">
       <Link href={`/profile/${participant.username}`} className="flex-grow flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={participant.profilePictureUrl || undefined} alt={participant.displayName} />
          <AvatarFallback>{participant.displayName?.charAt(0).toUpperCase() || participant.username?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-grow">
            <p className="font-semibold hover:underline">{participant.displayName}</p>
            <p className="text-sm text-muted-foreground">@{participant.username}</p>
        </div>
      </Link>
      {isModerator && !isSelf && participant.uid !== event.ownerId && (
        <Button variant="ghost" size="icon" className="text-destructive" onClick={handleRemove}>
            <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </Card>
  );
}

function EventRequestsTab({ event, onUpdateRequest }: { event: EventInfo, onUpdateRequest: () => void }) {
    const [requests, setRequests] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        if (!event.pendingParticipants || event.pendingParticipants.length === 0) {
            setRequests([]);
            setLoading(false);
            return;
        }
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where(documentId(), 'in', event.pendingParticipants.slice(0, 30)));
            const snapshot = await getDocs(q);
            const fetchedUsers = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
            setRequests(fetchedUsers);
        } catch (error) {
            console.error("Error fetching requests:", error);
        } finally {
            setLoading(false);
        }
    }, [event.pendingParticipants]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleResponse = async (userToHandle: UserProfile, accept: boolean) => {
        const eventRef = doc(db, 'events', event.id);
        const userRef = doc(db, 'users', userToHandle.uid);
        
        try {
            if (accept) {
                await updateDoc(eventRef, {
                    participants: arrayUnion(userToHandle.uid),
                    pendingParticipants: arrayRemove(userToHandle.uid)
                });
                await updateDoc(userRef, { participatedEvents: arrayUnion(event.id) });
                toast({ title: "Request Accepted", description: `${userToHandle.displayName} is now a participant.` });
            } else {
                await updateDoc(eventRef, {
                    pendingParticipants: arrayRemove(userToHandle.uid),
                    [`declinedParticipants.${userToHandle.uid}`]: Timestamp.now()
                });
                toast({ title: "Request Declined" });
            }
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
                <p className="text-muted-foreground text-center py-8">No pending participation requests.</p>
            )}
        </div>
    );
}


export function EventParticipantsTab({ event }: { event: EventInfo }) {
    const { user, userProfile } = useAuth();
    const [participants, setParticipants] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    const isOwner = event.ownerId === user?.uid;
    const isAdmin = userProfile?.userType === 'Admin';
    const canModerate = isOwner || isAdmin;

    const fetchParticipants = useCallback(async () => {
        setLoading(true);
        if (event.participants.length === 0) {
             setParticipants([]);
            setLoading(false);
            return;
        }
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where(documentId(), 'in', event.participants.slice(0,30)));
            const snapshot = await getDocs(q);
            const fetchedParticipants = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
            setParticipants(fetchedParticipants);
        } catch (error) {
            console.error("Error fetching participants:", error);
        } finally {
            setLoading(false);
        }
    }, [event.participants]);

    useEffect(() => {
        fetchParticipants();
    }, [fetchParticipants]);


    return (
        <Card>
            <CardHeader>
                <CardTitle>Participants</CardTitle>
                <CardDescription>{event.name} has {event.participants.length} {event.participants.length === 1 ? 'participant' : 'participants'}.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Tabs defaultValue="all" className="w-full">
                    <TabsList>
                        <TabsTrigger value="all">All Participants</TabsTrigger>
                        {isOwner && event.eventType === 'private' && (
                             <TabsTrigger value="requests">
                                Join Requests 
                                {event.pendingParticipants && event.pendingParticipants.length > 0 && <span className="ml-2 bg-primary text-primary-foreground h-5 w-5 rounded-full flex items-center justify-center text-xs">{event.pendingParticipants.length}</span>}
                            </TabsTrigger>
                        )}
                    </TabsList>
                    <TabsContent value="all" className="mt-4">
                        {loading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                        ) : participants.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {participants.map(participant => <ParticipantCard key={participant.uid} user={participant} event={event} isModerator={canModerate} />)}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-8">This event doesn't have any participants yet.</p>
                        )}
                    </TabsContent>
                    {isOwner && event.eventType === 'private' && (
                         <TabsContent value="requests" className="mt-4">
                            <EventRequestsTab event={event} onUpdateRequest={() => {}} />
                        </TabsContent>
                    )}
                </Tabs>
            </CardContent>
        </Card>
    );
}
