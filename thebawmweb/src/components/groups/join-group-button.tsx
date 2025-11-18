
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove, Timestamp, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Loader2, UserPlus, UserCheck, HelpCircle, MoreVertical, LogOut, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GroupInfo } from "@/lib/types";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { differenceInHours, formatDistanceToNowStrict } from "date-fns";

type JoinGroupButtonProps = {
  group: GroupInfo;
  variant?: "default" | "secondary" | "ghost" | "link" | "outline" | "destructive";
};

type JoinStatus = 'not_joined' | 'pending' | 'joined' | 'declined';

export function JoinGroupButton({ group, variant = "default" }: JoinGroupButtonProps) {
  const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();
  const [status, setStatus] = useState<JoinStatus>('not_joined');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState("");

  useEffect(() => {
    if (userProfile && group) {
        if (group.members?.includes(userProfile.uid)) {
            setStatus('joined');
        } else if (group.pendingMembers?.includes(userProfile.uid)) {
            setStatus('pending');
        } else if (group.declinedMembers && group.declinedMembers[userProfile.uid]) {
            const declinedAt = new Date(group.declinedMembers[userProfile.uid]);
            const hoursSinceDecline = differenceInHours(new Date(), declinedAt);
            if (hoursSinceDecline < 24) {
                setStatus('declined');
                const timeLeft = 24 - hoursSinceDecline;
                setCooldownTimeLeft(formatDistanceToNowStrict(new Date(Date.now() + timeLeft * 60 * 60 * 1000)));
            } else {
                 setStatus('not_joined');
            }
        }
        else {
            setStatus('not_joined');
        }
    }
  }, [userProfile, group]);


  const handleJoin = async () => {
    if (!user) {
        toast({ title: "Please log in to join groups.", variant: "destructive" });
        return;
    }
    setLoading(true);
    const groupRef = doc(db, 'groups', group.id);
    const userRef = doc(db, 'users', user.uid);
    try {
        if (group.groupType === 'public') {
            await updateDoc(groupRef, { members: arrayUnion(user.uid) });
            await updateDoc(userRef, { followedGroups: arrayUnion(group.id) });
            setStatus('joined');
            toast({ title: "Group Joined!" });
        } else {
            await updateDoc(groupRef, { pendingMembers: arrayUnion(user.uid) });

            // Create a notification for the group owner
            await addDoc(collection(db, 'notifications'), {
                recipientId: group.ownerId,
                senderId: user.uid,
                type: 'group_join_request',
                entityId: group.id,
                entityType: 'group',
                createdAt: serverTimestamp(),
                read: false,
            });

            setStatus('pending');
            toast({ title: "Request Sent", description: "Your request to join has been sent to the group owner." });
        }
        await refreshUserProfile();
        router.refresh();
    } catch (error) {
        console.error("Error joining group:", error);
        toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!user) return;
    setLoading(true);
    const groupRef = doc(db, 'groups', group.id);
    const userRef = doc(db, 'users', user.uid);
    try {
        await updateDoc(groupRef, { members: arrayRemove(user.uid) });
        await updateDoc(userRef, { followedGroups: arrayRemove(group.id) });
        setStatus('not_joined');
        toast({ title: "You have left the group." });
        await refreshUserProfile();
        router.refresh();
    } catch (error) {
        console.error("Error leaving group:", error);
        toast({ title: "Error", description: "Could not leave the group.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }
  
  if (status === 'joined') {
      return (
        <div className="flex items-center gap-2">
            <Button disabled className="w-full" variant={variant}>
                <UserCheck className="mr-2 h-4 w-4" />
                Joined
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
                        Leave Group
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
            Requesting
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
      Join
    </Button>
  );
}
