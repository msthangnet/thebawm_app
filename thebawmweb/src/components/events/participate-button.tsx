
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove, Timestamp, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Loader2, UserPlus, UserCheck, HelpCircle, MoreVertical, LogOut, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EventInfo } from "@/lib/types";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { differenceInHours, formatDistanceToNowStrict } from "date-fns";

type ParticipateButtonProps = {
  event: EventInfo;
  variant?: "default" | "secondary" | "ghost" | "link" | "outline" | "destructive";
};

type JoinStatus = 'not_participating' | 'pending' | 'participating' | 'declined';

export function ParticipateButton({ event, variant = "default" }: ParticipateButtonProps) {
  const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();
  const [status, setStatus] = useState<JoinStatus>('not_participating');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState("");

  useEffect(() => {
    if (userProfile && event) {
        if (event.participants?.includes(userProfile.uid)) {
            setStatus('participating');
        } else if (event.pendingParticipants?.includes(userProfile.uid)) {
            setStatus('pending');
        } else if (event.declinedParticipants && event.declinedParticipants[userProfile.uid]) {
            const declinedAt = new Date(event.declinedParticipants[userProfile.uid]);
            const hoursSinceDecline = differenceInHours(new Date(), declinedAt);
            if (hoursSinceDecline < 24) {
                setStatus('declined');
                const timeLeft = 24 - hoursSinceDecline;
                setCooldownTimeLeft(formatDistanceToNowStrict(new Date(Date.now() + timeLeft * 60 * 60 * 1000)));
            } else {
                 setStatus('not_participating');
            }
        }
        else {
            setStatus('not_participating');
        }
    }
  }, [userProfile, event]);


  const handleJoin = async () => {
    if (!user) {
        toast({ title: "Please log in to participate in events.", variant: "destructive" });
        return;
    }
    setLoading(true);
    const eventRef = doc(db, 'events', event.id);
    const userRef = doc(db, 'users', user.uid);
    try {
        if (event.eventType === 'public') {
            await updateDoc(eventRef, { participants: arrayUnion(user.uid) });
            await updateDoc(userRef, { participatedEvents: arrayUnion(event.id) });
            setStatus('participating');
            toast({ title: "Participation Confirmed!" });
        } else {
            await updateDoc(eventRef, { pendingParticipants: arrayUnion(user.uid) });

            // Create a notification for the event owner
            await addDoc(collection(db, 'notifications'), {
                recipientId: event.ownerId,
                senderId: user.uid,
                type: 'event_join_request',
                entityId: event.id,
                entityType: 'event',
                createdAt: serverTimestamp(),
                read: false,
            });

            setStatus('pending');
            toast({ title: "Request Sent", description: "Your request to participate has been sent to the event owner." });
        }
        await refreshUserProfile();
        router.refresh();
    } catch (error) {
        console.error("Error participating in event:", error);
        toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!user) return;
    setLoading(true);
    const eventRef = doc(db, 'events', event.id);
    const userRef = doc(db, 'users', user.uid);
    try {
        await updateDoc(eventRef, { participants: arrayRemove(user.uid) });
        await updateDoc(userRef, { participatedEvents: arrayRemove(event.id) });
        setStatus('not_participating');
        toast({ title: "You are no longer participating in the event." });
        await refreshUserProfile();
        router.refresh();
    } catch (error) {
        console.error("Error leaving event:", error);
        toast({ title: "Error", description: "Could not leave the event.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }
  
  if (status === 'participating') {
      return (
        <div className="flex items-center gap-2">
            <Button disabled className="w-full" variant={variant}>
                <UserCheck className="mr-2 h-4 w-4" />
                Participating
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleLeave} className="text-destructive focus:text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        Leave Event
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      )
  }
   if (status === 'pending') {
      return (
        <Button disabled className="w-full" variant="secondary">
            <HelpCircle className="mr-2 h-4 w-4" />
            Request Sent
        </Button>
      )
  }

  if (status === 'declined') {
    return (
        <Button disabled className="w-full" variant="secondary">
            <Ban className="mr-2 h-4 w-4" />
            Request Declined (try again in {cooldownTimeLeft})
        </Button>
    )
  }

  return (
    <Button onClick={handleJoin} disabled={loading || authLoading} className="w-full" variant={variant}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
      Participate
    </Button>
  );
}
