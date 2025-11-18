
"use client";

import { Bell, Loader2, UserPlus, Users, Calendar, Trophy, Group } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { collection, query, where, onSnapshot, doc, getDoc, writeBatch, getDocs, documentId, updateDoc, arrayUnion, arrayRemove, Timestamp, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, GroupInfo, EventInfo, QuizInfo, Notification as NotificationType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/lib/utils";

type EnrichedNotification = NotificationType & {
    sender?: UserProfile;
    group?: GroupInfo;
    event?: EventInfo;
    quiz?: QuizInfo;
};

function ConnectionNotificationItem({ request, showActions }: { request: EnrichedNotification, showActions: boolean }) {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const handleResponse = async (accept: boolean) => {
        if (!currentUser || !request.sender) return;
        setLoading(true);

        const userConnectionRef = doc(db, 'users', currentUser.uid, 'connections', request.sender.uid);
        const targetConnectionRef = doc(db, 'users', request.sender.uid, 'connections', currentUser.uid);

        try {
            if (accept) {
                 await writeBatch(db)
                    .set(userConnectionRef, { status: 'connected' })
                    .set(targetConnectionRef, { status: 'connected' })
                    .commit();
                toast({ title: "Connection accepted!" });
            } else {
                await writeBatch(db)
                    .delete(userConnectionRef)
                    .delete(targetConnectionRef)
                    .commit();
                toast({ title: "Connection declined." });
            }
             await deleteDoc(doc(db, 'notifications', request.id));
        } catch (error) {
            console.error("Error responding to connection request:", error);
            toast({ title: "Error", description: "Could not process your response.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    if (!request.sender) return null;

    return (
        <div className={cn("flex items-center gap-3 p-2 rounded-md", showActions && "hover:bg-muted")}>
            <Avatar className="h-8 w-8">
                <AvatarImage src={request.sender.profilePictureUrl || undefined} />
                <AvatarFallback>{request.sender.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="grid gap-1 flex-1">
                <p className="text-sm">
                    <UserPlus className="inline-block mr-2 h-4 w-4" />
                    <Link href={`/profile/${request.sender.username}`} className="font-semibold hover:underline">{request.sender.displayName}</Link> wants to connect.
                </p>
                {showActions && (
                    <div className="mt-1 flex gap-2">
                        <Button size="sm" onClick={() => handleResponse(true)} disabled={loading}>
                            {loading && <Loader2 className="h-4 w-4 animate-spin"/>}
                            Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleResponse(false)} disabled={loading}>Decline</Button>
                    </div>
                )}
            </div>
        </div>
    )
}

function GroupJoinNotificationItem({ request, showActions }: { request: EnrichedNotification, showActions: boolean }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    if (!request.group || !request.sender) return null;

    const handleResponse = async (accept: boolean) => {
        setLoading(true);
        const groupRef = doc(db, 'groups', request.group!.id);
        const userRef = doc(db, 'users', request.senderId);

        try {
            if (accept) {
                await updateDoc(groupRef, {
                    members: arrayUnion(request.senderId),
                    pendingMembers: arrayRemove(request.senderId)
                });
                await updateDoc(userRef, { followedGroups: arrayUnion(request.group!.id) });
                toast({ title: "Request Accepted", description: `${request.sender?.displayName} has joined ${request.group?.name}.` });
            } else {
                 await updateDoc(groupRef, {
                    pendingMembers: arrayRemove(request.senderId),
                    [`declinedMembers.${request.senderId}`]: Timestamp.now()
                });
                toast({ title: "Request Declined" });
            }
            await deleteDoc(doc(db, 'notifications', request.id));
        } catch (error) {
            console.error("Error responding to group join request:", error);
            toast({ title: "Error", description: "Could not process the request.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={cn("flex items-center gap-3 p-2 rounded-md", showActions && "hover:bg-muted")}>
            <Avatar className="h-8 w-8">
                <AvatarImage src={request.sender.profilePictureUrl || undefined} />
                <AvatarFallback>{request.sender.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="grid gap-1 flex-1">
                <p className="text-sm">
                    <Group className="inline-block mr-2 h-4 w-4" />
                    <Link href={`/profile/${request.sender.username}`} className="font-semibold hover:underline">{request.sender.displayName}</Link> wants to join <Link href={`/groups/${request.group.groupId}`} className="font-semibold hover:underline">{request.group.name}</Link>.
                </p>
                {showActions && (
                    <div className="mt-1 flex gap-2">
                        <Button size="sm" onClick={() => handleResponse(true)} disabled={loading}>
                            {loading && <Loader2 className="h-4 w-4 animate-spin"/>}
                            Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleResponse(false)} disabled={loading}>Decline</Button>
                    </div>
                )}
            </div>
        </div>
    );
}

function EventJoinNotificationItem({ request, showActions }: { request: EnrichedNotification, showActions: boolean }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    if (!request.event || !request.sender) return null;

    const handleResponse = async (accept: boolean) => {
        setLoading(true);
        const eventRef = doc(db, 'events', request.event!.id);
        const userRef = doc(db, 'users', request.senderId);

        try {
            if (accept) {
                await updateDoc(eventRef, {
                    participants: arrayUnion(request.senderId),
                    pendingParticipants: arrayRemove(request.senderId)
                });
                await updateDoc(userRef, { participatedEvents: arrayUnion(request.event!.id) });
                toast({ title: "Request Accepted", description: `${request.sender?.displayName} is now a participant.` });
            } else {
                 await updateDoc(eventRef, {
                    pendingParticipants: arrayRemove(request.senderId),
                    [`declinedParticipants.${request.senderId}`]: Timestamp.now()
                });
                toast({ title: "Request Declined" });
            }
            await deleteDoc(doc(db, 'notifications', request.id));
        } catch (error) {
            console.error("Error responding to event join request:", error);
            toast({ title: "Error", description: "Could not process the request.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={cn("flex items-center gap-3 p-2 rounded-md", showActions && "hover:bg-muted")}>
            <Avatar className="h-8 w-8">
                <AvatarImage src={request.sender.profilePictureUrl || undefined} />
                <AvatarFallback>{request.sender.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="grid gap-1 flex-1">
                <p className="text-sm">
                    <Calendar className="inline-block mr-2 h-4 w-4" />
                    <Link href={`/profile/${request.sender.username}`} className="font-semibold hover:underline">{request.sender.displayName}</Link> wants to join <Link href={`/events/${request.event.eventId}`} className="font-semibold hover:underline">{request.event.name}</Link>.
                </p>
                {showActions && (
                    <div className="mt-1 flex gap-2">
                        <Button size="sm" onClick={() => handleResponse(true)} disabled={loading}>
                            {loading && <Loader2 className="h-4 w-4 animate-spin"/>}
                            Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleResponse(false)} disabled={loading}>Decline</Button>
                    </div>
                )}
            </div>
        </div>
    );
}

function QuizJoinNotificationItem({ request, showActions }: { request: EnrichedNotification, showActions: boolean }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    if (!request.quiz || !request.sender) return null;

    const handleResponse = async (accept: boolean) => {
        setLoading(true);
        const quizRef = doc(db, 'quizzes', request.quiz!.id);
        const userRef = doc(db, 'users', request.senderId);

        try {
            if (accept) {
                await updateDoc(quizRef, {
                    participants: arrayUnion(request.senderId),
                    pendingParticipants: arrayRemove(request.senderId)
                });
                await updateDoc(userRef, { participatedQuizzes: arrayUnion(request.quiz!.id) });
                toast({ title: "Request Accepted", description: `${request.sender?.displayName} is now a participant.` });
            } else {
                 await updateDoc(quizRef, {
                    pendingParticipants: arrayRemove(request.senderId),
                    [`declinedParticipants.${request.senderId}`]: Timestamp.now()
                });
                toast({ title: "Request Declined" });
            }
            await deleteDoc(doc(db, 'notifications', request.id));
        } catch (error) {
            console.error("Error responding to quiz join request:", error);
            toast({ title: "Error", description: "Could not process the request.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={cn("flex items-center gap-3 p-2 rounded-md", showActions && "hover:bg-muted")}>
            <Avatar className="h-8 w-8">
                <AvatarImage src={request.sender.profilePictureUrl || undefined} />
                <AvatarFallback>{request.sender.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="grid gap-1 flex-1">
                <p className="text-sm">
                    <Trophy className="inline-block mr-2 h-4 w-4" />
                    <Link href={`/profile/${request.sender.username}`} className="font-semibold hover:underline">{request.sender.displayName}</Link> wants to join the quiz <Link href={`/quizzes/${request.quiz.quizId}`} className="font-semibold hover:underline">{request.quiz.name}</Link>.
                </p>
                {showActions && (
                    <div className="mt-1 flex gap-2">
                        <Button size="sm" onClick={() => handleResponse(true)} disabled={loading}>
                            {loading && <Loader2 className="h-4 w-4 animate-spin"/>}
                            Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleResponse(false)} disabled={loading}>Decline</Button>
                    </div>
                )}
            </div>
        </div>
    );
}

export function NotificationItem({ notification, showActions = true }: { notification: EnrichedNotification, showActions?: boolean }) {
    switch (notification.type) {
        case 'connection_request':
            return <ConnectionNotificationItem request={notification} showActions={showActions} />;
        case 'group_join_request':
            return <GroupJoinNotificationItem request={notification} showActions={showActions} />;
        case 'event_join_request':
            return <EventJoinNotificationItem request={notification} showActions={showActions} />;
        case 'quiz_join_request':
            return <QuizJoinNotificationItem request={notification} showActions={showActions} />;
        default:
            return null;
    }
}
