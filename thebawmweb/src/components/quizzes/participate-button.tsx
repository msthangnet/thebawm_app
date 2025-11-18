
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove, Timestamp, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Loader2, UserPlus, UserCheck, HelpCircle, MoreVertical, LogOut, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QuizInfo } from "@/lib/types";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { differenceInHours, formatDistanceToNowStrict } from "date-fns";

type ParticipateButtonProps = {
  quiz: QuizInfo;
  variant?: "default" | "secondary" | "ghost" | "link" | "outline" | "destructive";
};

type JoinStatus = 'not_participating' | 'pending' | 'participating' | 'declined';

export function ParticipateButton({ quiz, variant = "default" }: ParticipateButtonProps) {
  const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();
  const [status, setStatus] = useState<JoinStatus>('not_participating');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState("");

  useEffect(() => {
    if (userProfile && quiz) {
        if (quiz.participants?.includes(userProfile.uid)) {
            setStatus('participating');
        } else if (quiz.pendingParticipants?.includes(userProfile.uid)) {
            setStatus('pending');
        } else if (quiz.declinedParticipants && quiz.declinedParticipants[userProfile.uid]) {
            const declinedAt = new Date(quiz.declinedParticipants[userProfile.uid]);
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
  }, [userProfile, quiz]);


  const handleJoin = async () => {
    if (!user) {
        toast({ title: "Please log in to participate in quizzes.", variant: "destructive" });
        return;
    }
    setLoading(true);
    const quizRef = doc(db, 'quizzes', quiz.id);
    const userRef = doc(db, 'users', user.uid);
    try {
        if (quiz.quizType === 'public') {
            await updateDoc(quizRef, { participants: arrayUnion(user.uid) });
            await updateDoc(userRef, { participatedQuizzes: arrayUnion(quiz.id) });
            setStatus('participating');
            toast({ title: "Participation Confirmed!" });
        } else {
            await updateDoc(quizRef, { pendingParticipants: arrayUnion(user.uid) });

            // Create a notification for the quiz owner
            await addDoc(collection(db, 'notifications'), {
                recipientId: quiz.ownerId,
                senderId: user.uid,
                type: 'quiz_join_request',
                entityId: quiz.id,
                entityType: 'quiz',
                createdAt: serverTimestamp(),
                read: false,
            });

            setStatus('pending');
            toast({ title: "Request Sent", description: "Your request to participate has been sent to the quiz owner." });
        }
        await refreshUserProfile();
        router.refresh();
    } catch (error) {
        console.error("Error participating in quiz:", error);
        toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!user) return;
    setLoading(true);
    const quizRef = doc(db, 'quizzes', quiz.id);
    const userRef = doc(db, 'users', user.uid);
    try {
        await updateDoc(quizRef, { participants: arrayRemove(user.uid) });
        await updateDoc(userRef, { participatedQuizzes: arrayRemove(quiz.id) });
        setStatus('not_participating');
        toast({ title: "You are no longer participating in the quiz." });
        await refreshUserProfile();
        router.refresh();
    } catch (error) {
        console.error("Error leaving quiz:", error);
        toast({ title: "Error", description: "Could not leave the quiz.", variant: "destructive" });
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
                        Leave Quiz
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
