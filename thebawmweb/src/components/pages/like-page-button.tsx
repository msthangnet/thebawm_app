
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { Loader2, ThumbsUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function LikePageButton({ pageId }: { pageId: string }) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (userProfile && userProfile.likedPages?.includes(pageId)) {
      setIsLiked(true);
    } else {
        setIsLiked(false);
    }
  }, [userProfile, pageId]);


  const handleLike = async () => {
    if (!user) {
        toast({ title: "Please log in to like a page.", variant: "destructive" });
        return;
    }
    setLoading(true);
    const pageRef = doc(db, 'pages', pageId);
    const userRef = doc(db, 'users', user.uid);
    try {
        if (isLiked) {
            await updateDoc(pageRef, { likes: arrayRemove(user.uid) });
            await updateDoc(userRef, { likedPages: arrayRemove(pageId) });
            setIsLiked(false);
            toast({ title: "Unliked" });
        } else {
            await updateDoc(pageRef, { likes: arrayUnion(user.uid) });
            await updateDoc(userRef, { likedPages: arrayUnion(pageId) });
            setIsLiked(true);
            toast({ title: "Liked!" });
        }
    } catch (error) {
        console.error("Error liking page:", error);
        toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };
  
  const text = isLiked ? "Liked" : "Like";
  
  return (
    <Button onClick={handleLike} disabled={loading || authLoading} className="w-full">
        {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
            <ThumbsUp className={`mr-2 h-4 w-4 ${isLiked ? 'text-blue-500 fill-current' : ''}`} />
        )}
      {text}
    </Button>
  );
}
