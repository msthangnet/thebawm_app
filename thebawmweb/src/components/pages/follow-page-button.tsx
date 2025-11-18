
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { Loader2, UserPlus, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type FollowPageButtonProps = {
  pageId: string;
  variant?: "default" | "secondary" | "ghost" | "link" | "outline" | "destructive";
};

export function FollowPageButton({ pageId, variant = "default" }: FollowPageButtonProps) {
  const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (userProfile && userProfile.followedPages?.includes(pageId)) {
        setIsFollowing(true);
    } else {
        setIsFollowing(false);
    }
  }, [userProfile, pageId]);


  const handleFollow = async () => {
    if (!user) {
        toast({ title: "Please log in to follow.", variant: "destructive" });
        return;
    }
    setLoading(true);
    const pageRef = doc(db, 'pages', pageId);
    const userRef = doc(db, 'users', user.uid);
    try {
        if (isFollowing) {
            await updateDoc(pageRef, { followers: arrayRemove(user.uid) });
            await updateDoc(userRef, { followedPages: arrayRemove(pageId) });
            setIsFollowing(false);
            toast({ title: "Unfollowed" });
        } else {
            await updateDoc(pageRef, { followers: arrayUnion(user.uid) });
            await updateDoc(userRef, { followedPages: arrayUnion(pageId) });
            setIsFollowing(true);
            toast({ title: "Followed!" });
        }
        await refreshUserProfile();
    } catch (error) {
        console.error("Error following/unfollowing page:", error);
        toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };
  
  const text = isFollowing ? "Following" : "Follow";
  const Icon = isFollowing ? UserCheck : UserPlus;

  return (
    <Button onClick={handleFollow} disabled={loading || authLoading} className="w-full" variant={variant}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />}
      {text}
    </Button>
  );
}
