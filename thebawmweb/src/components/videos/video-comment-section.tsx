
"use client";

import type { Comment, UserProfile, Video } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { addDoc, collection, doc, documentId, getDoc, getDocs, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, ChevronDown } from "lucide-react";
import Link from "next/link";
import { UserTypeIcon } from "../user-type-icon";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";


function CommentList({ comments }: { comments: Comment[] }) {
    if (comments.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Be the first to comment!</p>;
    }
    
    return (
        <div className="space-y-4">
            {comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-3 text-sm">
                    <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.author.profilePictureUrl || undefined} />
                    <AvatarFallback>{comment.author.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="bg-muted/50 p-2 rounded-lg flex-1">
                    <div className="flex items-center gap-1">
                        <Link href={`/profile/${comment.author.username}`} className="font-semibold hover:underline">{comment.author.displayName}</Link>
                        <UserTypeIcon userType={comment.author.userType} className="h-3 w-3" />
                    </div>
                    <p className="whitespace-pre-wrap">{comment.text}</p>
                    </div>
                </div>
            ))}
        </div>
    )
}

export function VideoCommentSection({ videoId }: { videoId: string }) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setLoadingComments(true);
    const commentsQuery = query(
      collection(db, "videoComments"),
      where("videoId", "==", videoId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(commentsQuery, async (snapshot) => {
        if (snapshot.empty) {
            setComments([]);
            setLoadingComments(false);
            return;
        }

        const commentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const authorIds = [...new Set(commentData.map(c => c.authorId).filter(Boolean))];

        if(authorIds.length > 0) {
            const usersQuery = query(collection(db, "users"), where(documentId(), "in", authorIds));
            const usersSnapshot = await getDocs(usersQuery);
            const authorsMap = new Map<string, UserProfile>();
            usersSnapshot.forEach(doc => authorsMap.set(doc.id, { uid: doc.id, ...doc.data() } as UserProfile));
            
            const populatedComments = commentData.map(c => ({
                ...c,
                author: authorsMap.get(c.authorId),
                createdAt: c.createdAt?.toDate ? c.createdAt.toDate().toISOString() : new Date().toISOString(),
            })).filter(c => c.author) as Comment[];

            setComments(populatedComments);
        } else {
            setComments([]);
        }
        setLoadingComments(false);
    }, (error) => {
        console.error("Error fetching comments:", error);
        toast({ title: "Error", description: "Could not load comments.", variant: "destructive" });
        setLoadingComments(false);
    });

    return () => unsubscribe();
  }, [videoId, toast]);

  const handlePostComment = async () => {
    if (!newComment.trim() || !user || !userProfile) return;
    setIsPosting(true);
    
    try {
        const videoRef = doc(db, 'videos', videoId);

        await addDoc(collection(db, "videoComments"), {
            authorId: user.uid,
            videoId: videoId,
            text: newComment,
            createdAt: serverTimestamp(),
        });
        
        await updateDoc(videoRef, { commentCount: increment(1) });

        setNewComment("");
        toast({ title: "Comment posted!" });
    } catch(error) {
        console.error("Error posting comment:", error);
        toast({ title: "Error", description: "Could not post your comment.", variant: "destructive" });
    } finally {
        setIsPosting(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
            <div className="flex justify-between items-center w-full py-2">
                <h3 className="text-xl font-bold">Comments ({comments.length})</h3>
                <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
        </CollapsibleTrigger>
      <CollapsibleContent className="space-y-6">
        {user && (
            <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                <AvatarImage src={userProfile?.profilePictureUrl || undefined} />
                <AvatarFallback>{userProfile?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="w-full">
                <Textarea 
                    placeholder="Add a comment..." 
                    className="w-full text-sm bg-muted border-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={isPosting}
                />
                <div className="flex justify-end mt-2">
                    <Button size="sm" onClick={handlePostComment} disabled={!newComment.trim() || isPosting}>
                    {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Comment
                    </Button>
                </div>
                </div>
            </div>
        )}
        {loadingComments ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8" /></div>
        ) : (
            <CommentList comments={comments} />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
