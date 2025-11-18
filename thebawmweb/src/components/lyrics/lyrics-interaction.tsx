
"use client";

import type { Lyrics, Comment, UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Loader2, Eye } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove, increment, collection, query, where, getDocs, addDoc, serverTimestamp, documentId, orderBy } from "firebase/firestore";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { UserTypeIcon } from "../user-type-icon";

function CommentSection({ lyrics, comments, onCommentAdded }: { lyrics: Lyrics, comments: Comment[], onCommentAdded: (newComment: Comment) => void }) {
  const { user, userProfile } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const { toast } = useToast();

  const handlePostComment = async () => {
    if (!newComment.trim() || !user || !userProfile) return;
    setIsPosting(true);

    try {
      const postRef = doc(db, 'lyrics', lyrics.id);
      const commentRef = collection(db, 'comments');
      
      const newCommentData = {
        authorId: user.uid,
        postId: lyrics.id,
        postType: 'lyrics',
        text: newComment,
        createdAt: serverTimestamp(),
      };

      const newCommentDoc = await addDoc(commentRef, newCommentData);
      await updateDoc(postRef, { commentCount: increment(1) });

      const finalComment: Comment = {
        id: newCommentDoc.id,
        authorId: user.uid,
        postId: lyrics.id,
        text: newComment,
        createdAt: new Date().toISOString(),
        author: userProfile,
      };

      onCommentAdded(finalComment);
      setNewComment("");
      toast({ title: "Comment posted!" });
    } catch (error) {
      console.error("Error posting comment: ", error);
      toast({ title: "Error", description: "Could not post your comment.", variant: "destructive" });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="pt-4 mt-2 border-t w-full">
      {user && (
         <div className="flex items-start gap-2 pt-4">
            <Avatar className="h-8 w-8">
              <AvatarImage src={userProfile?.profilePictureUrl || undefined} />
              <AvatarFallback>{userProfile?.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="w-full">
              <Textarea 
                placeholder="Write a comment..." 
                className="w-full text-sm bg-muted border-none focus-visible:ring-1 focus-visible:ring-ring"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={isPosting}
              />
              <div className="flex justify-end mt-2">
                <Button size="sm" onClick={handlePostComment} disabled={!newComment.trim() || isPosting}>
                  {isPosting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Post
                </Button>
              </div>
            </div>
         </div>
      )}
       <h3 className="text-sm font-semibold mt-4 mb-2">Comments</h3>
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {comments.map((comment) => (
          <div key={comment.id} className="flex items-start gap-2 text-sm">
            <Avatar className="h-8 w-8">
              <AvatarImage src={comment.author.profilePictureUrl || undefined} />
              <AvatarFallback>{comment.author.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="bg-muted p-2 rounded-lg flex-1">
              <div className="flex items-center gap-1">
                <Link href={`/profile/${comment.author.username}`} className="font-semibold hover:underline">{comment.author.displayName}</Link>
                <UserTypeIcon userType={comment.author.userType} className="h-3 w-3" />
              </div>
              <p className="whitespace-pre-wrap">{comment.text}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No comments yet.</p>}
      </div>
    </div>
  );
}


export function LyricsInteraction({ lyrics: initialLyrics, initialComments }: { lyrics: Lyrics, initialComments: Comment[] }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lyrics, setLyrics] = useState(initialLyrics);
  const [isLiked, setIsLiked] = useState(user ? lyrics.likes.includes(user.uid) : false);
  const [likeCount, setLikeCount] = useState(lyrics.likes.length);
  const [isLiking, setIsLiking] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [comments, setComments] = useState<Comment[]>(initialComments);

  useEffect(() => {
    const postRef = doc(db, 'lyrics', lyrics.id);
    updateDoc(postRef, { viewCount: increment(1) });
    setLyrics(current => ({ ...current, viewCount: current.viewCount + 1 }));
  }, [lyrics.id]);

  const handleLike = async () => {
    if (!user || isLiking) return;
    setIsLiking(true);

    const postRef = doc(db, 'lyrics', lyrics.id);

    try {
      if (isLiked) {
        await updateDoc(postRef, { likes: arrayRemove(user.uid) });
        setLikeCount((prev) => prev - 1);
        setIsLiked(false);
      } else {
        await updateDoc(postRef, { likes: arrayUnion(user.uid) });
        setLikeCount((prev) => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error("Error liking lyrics: ", error);
      toast({
        title: "Error",
        description: "Could not update your like. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };
  
  const handleShare = async () => {
    const postUrl = `${window.location.origin}/lyrics/${lyrics.slug}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      toast({
        title: "Link Copied!",
        description: "The link has been copied to your clipboard.",
      });
      if (!sessionStorage.getItem(`shared_lyrics_${lyrics.id}`)) {
        const postRef = doc(db, 'lyrics', lyrics.id);
        await updateDoc(postRef, { shareCount: increment(1) });
        setLyrics(currentPost => ({...currentPost, shareCount: currentPost.shareCount + 1}));
        sessionStorage.setItem(`shared_lyrics_${lyrics.id}`, 'true');
      }
    } catch (err) {
      console.error("Failed to copy link: ", err);
      toast({
        title: "Error",
        description: "Could not copy link. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const onCommentAdded = (newComment: Comment) => {
    setComments(currentComments => [newComment, ...currentComments]);
    setLyrics(currentPost => ({...currentPost, commentCount: currentPost.commentCount + 1}))
  };

  return (
    <div className="w-full flex flex-col items-start">
        <div className="w-full flex justify-between items-center text-xs text-muted-foreground mb-2">
            <div>{likeCount > 0 && `${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`}</div>
            <div className="flex gap-4">
              {lyrics.commentCount > 0 && <span>{lyrics.commentCount} {lyrics.commentCount === 1 ? 'comment' : 'comments'}</span>}
              {lyrics.shareCount > 0 && <span>{lyrics.shareCount} {lyrics.shareCount === 1 ? 'share' : 'shares'}</span>}
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {(lyrics.viewCount || 0).toLocaleString()}</span>
            </div>
        </div>
        <div className="w-full border-t pt-2 grid grid-cols-3 gap-1">
          <Button variant="ghost" className="w-full" onClick={handleLike} disabled={!user || isLiking}>
            <Heart className={`mr-2 h-4 w-4 ${isLiked ? 'text-red-500 fill-current' : ''}`} /> Like
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setCommentsVisible(v => !v)}>
            <MessageCircle className="mr-2 h-4 w-4" /> Comment
          </Button>
          <Button variant="ghost" className="w-full" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
        </div>
        {commentsVisible && (
            <CommentSection lyrics={lyrics} comments={comments} onCommentAdded={onCommentAdded} />
        )}
      </div>
  );
}
