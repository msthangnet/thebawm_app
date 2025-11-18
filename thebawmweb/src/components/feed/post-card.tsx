
"use client";

import type { Post, Comment, UserProfile, PostPermissions } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Eye, Loader2, MoreVertical, Trash2, Edit, X, ChevronLeft, ChevronRight, Play, Maximize, Pause, Minimize, Rewind, FastForward, Flag, Group, Calendar, Trophy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { db, storage } from "@/lib/firebase";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  documentId,
  writeBatch,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { UserTypeIcon } from "../user-type-icon";
import { cn } from "@/lib/utils";
import { Progress } from "../ui/progress";

type PostCardProps = {
  post: Post;
  permissions: PostPermissions;
};

function CommentSection({ post, comments, onCommentAdded }: { post: Post, comments: Comment[], onCommentAdded: (newComment: Comment) => void }) {
  const { user, userProfile } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const { toast } = useToast();

  const handlePostComment = async () => {
    if (!newComment.trim() || !user || !userProfile) return;
    setIsPosting(true);
    let postCollection: string;
    switch(post.postType) {
        case 'page':
            postCollection = 'pagesPost';
            break;
        case 'group':
            postCollection = 'groupPost';
            break;
        case 'event':
            postCollection = 'eventsPost';
            break;
        case 'event_announcement':
            postCollection = 'eventAnnouncementPosts';
            break;
        case 'quiz':
            postCollection = 'quizzesPost';
            break;
        case 'quiz_announcement':
            postCollection = 'quizAnnouncementPosts';
            break;
        default:
            postCollection = 'usersPost';
    }

    try {
      const postRef = doc(db, postCollection, post.id);
      const commentRef = collection(db, 'comments');
      
      const newCommentData = {
        authorId: user.uid,
        postId: post.id,
        postType: post.postType,
        text: newComment,
        createdAt: serverTimestamp(),
      };

      const newCommentDoc = await addDoc(commentRef, newCommentData);
      await updateDoc(postRef, { commentCount: increment(1) });

      const finalComment: Comment = {
        id: newCommentDoc.id,
        authorId: user.uid,
        postId: post.id,
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

function FullScreenImageViewer({ images, startIndex, onClose }: { images: string[], startIndex: number, onClose: () => void }) {
    const [currentIndex, setCurrentIndex] = useState(startIndex);

    const nextImage = () => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
            <div className="relative w-full h-full p-4 flex items-center justify-center">
                <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:text-white hover:bg-white/10" onClick={onClose}>
                    <X className="h-8 w-8" />
                </Button>
                 {images.length > 1 && <>
                    <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); prevImage(); }}>
                        <ChevronLeft className="h-10 w-10" />
                    </Button>
                    <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); nextImage(); }}>
                        <ChevronRight className="h-10 w-10" />
                    </Button>
                </>}
                 <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                    <Image 
                        src={images[currentIndex]} 
                        alt={`Fullscreen image ${currentIndex + 1}`} 
                        width={1200}
                        height={800}
                        className="object-contain max-h-[90vh] w-auto h-auto"
                    />
                </div>
            </div>
        </div>
    );
}


export function PostCard({ post: initialPost, permissions }: PostCardProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [post, setPost] = useState(initialPost);
  const [isLiked, setIsLiked] = useState(user ? post.likes.includes(user.uid) : false);
  const [likeCount, setLikeCount] = useState(post.likes.length);
  const [isLiking, setIsLiking] = useState(false);
  
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editText, setEditText] = useState(post.text || "");
  const [fullScreenImage, setFullScreenImage] = useState<{ images: string[], startIndex: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [buffered, setBuffered] = useState(0);


  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && !videoElement.paused) {
          videoElement.pause();
        }
      },
      {
        threshold: 0.5, // 50% of the video must be visible
      }
    );

    observer.observe(videoElement);

    return () => {
      if (videoElement) {
        observer.unobserve(videoElement);
      }
    };
  }, [videoRef]);

  let postCollection: string;
    switch(post.postType) {
        case 'page':
            postCollection = 'pagesPost';
            break;
        case 'group':
            postCollection = 'groupPost';
            break;
        case 'event':
            postCollection = 'eventsPost';
            break;
        case 'event_announcement':
            postCollection = 'eventAnnouncementPosts';
            break;
        case 'quiz':
            postCollection = 'quizzesPost';
            break;
        case 'quiz_announcement':
            postCollection = 'quizAnnouncementPosts';
            break;
        default:
            postCollection = 'usersPost';
    }
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  useEffect(() => {
    const viewedKey = `viewed_${post.id}`;
    if (!sessionStorage.getItem(viewedKey)) {
      const postRef = doc(db, postCollection, post.id);
      updateDoc(postRef, { viewCount: increment(1) });
      sessionStorage.setItem(viewedKey, 'true');
      setPost(currentPost => ({...currentPost, viewCount: currentPost.viewCount + 1}));
    }
  }, [post.id, postCollection]);
  
  const fetchComments = async () => {
    if (commentsLoading) return;
    setCommentsLoading(true);
    try {
        const commentsQuery = query(
            collection(db, "comments"),
            where("postId", "==", post.id)
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        
        if (commentsSnapshot.empty) {
            setComments([]);
            setCommentsLoading(false);
            return;
        }

        const rawComments = commentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const authorIds = [...new Set(rawComments.map(comment => comment.authorId).filter(id => id))];

        if (authorIds.length === 0) {
            setComments([]);
            setCommentsLoading(false);
            return;
        }

        const usersQuery = query(collection(db, "users"), where(documentId(), "in", authorIds.slice(0, 30)));
        const usersSnapshot = await getDocs(usersQuery);
        const authorsMap = new Map<string, UserProfile>();
        usersSnapshot.forEach(userDoc => {
            const userData = userDoc.data() as UserProfile;
            authorsMap.set(userDoc.id, {
                ...userData,
                uid: userDoc.id,
                createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate().toISOString() : new Date().toISOString(),
            });
        });
        
        const fetchedComments: Comment[] = rawComments.map(comment => {
            const author = authorsMap.get(comment.authorId);
            if (!author) return null;
            return {
                id: comment.id,
                authorId: comment.authorId,
                postId: comment.postId,
                text: comment.text,
                createdAt: comment.createdAt?.toDate ? comment.createdAt.toDate().toISOString() : new Date().toISOString(),
                author: author,
            };
        }).filter((c): c is Comment => c !== null);

        fetchedComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setComments(fetchedComments);
    } catch (error) {
      console.error("Error fetching comments: ", error);
      toast({ title: "Error", description: "Could not load comments.", variant: "destructive" });
    } finally {
      setCommentsLoading(false);
    }
  };
  
  
  const toggleComments = async () => {
    const newCommentsVisible = !commentsVisible;
    setCommentsVisible(newCommentsVisible);
    if (newCommentsVisible && comments.length === 0) {
      await fetchComments();
    }
  };


  const handleLike = async () => {
    if (!user || isLiking) return;
    setIsLiking(true);

    const postRef = doc(db, postCollection, post.id);

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
      console.error("Error liking post: ", error);
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
    const postUrl = `${window.location.origin}/post/${post.id}`; // This might need adjustment based on post routing
    try {
      await navigator.clipboard.writeText(postUrl);
      toast({
        title: "Link Copied!",
        description: "The post link has been copied to your clipboard.",
      });
      if (!sessionStorage.getItem(`shared_${post.id}`)) {
        const postRef = doc(db, postCollection, post.id);
        await updateDoc(postRef, { shareCount: increment(1) });
        setPost(currentPost => ({...currentPost, shareCount: currentPost.shareCount + 1}));
        sessionStorage.setItem(`shared_${post.id}`, 'true');
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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
        if (post.mediaUrls && post.mediaUrls.length > 0) {
            const deletePromises = post.mediaUrls.map(url => {
                const mediaRef = ref(storage, url);
                return deleteObject(mediaRef);
            });
            await Promise.all(deletePromises);
        }

        const batch = writeBatch(db);

        const commentsQuery = query(collection(db, "comments"), where("postId", "==", post.id));
        const commentsSnapshot = await getDocs(commentsQuery);
        commentsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        const postRef = doc(db, postCollection, post.id);
        batch.delete(postRef);

        await batch.commit();

        toast({
            title: "Post Deleted",
            description: "Your post has been successfully deleted.",
        });

        router.refresh();

    } catch (error) {
        console.error("Error deleting post:", error);
        toast({
            title: "Error",
            description: "Could not delete your post. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsDeleting(false);
    }
  };

  const handleUpdatePost = async () => {
    if (editText.trim() === post.text) {
        setEditDialogOpen(false);
        return;
    }
    setIsEditing(true);
    try {
        const postRef = doc(db, postCollection, post.id);
        await updateDoc(postRef, { text: editText });
        setPost(currentPost => ({ ...currentPost, text: editText }));
        toast({ title: "Post Updated", description: "Your post has been successfully updated." });
        setEditDialogOpen(false);
    } catch (error) {
        console.error("Error updating post:", error);
        toast({ title: "Error", description: "Could not update your post.", variant: "destructive" });
    } finally {
        setIsEditing(false);
    }
  };
  
  const onCommentAdded = (newComment: Comment) => {
    setComments(currentComments => [newComment, ...currentComments]);
    setPost(currentPost => ({...currentPost, commentCount: currentPost.commentCount + 1}))
  };

  const openFullScreen = (index: number) => {
    if (post.mediaUrls) {
      setFullScreenImage({ images: post.mediaUrls, startIndex: index });
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
        if (videoRef.current.paused) {
            videoRef.current.play();
        } else {
            videoRef.current.pause();
        }
    }
  };
  
  const handleTimeUpdate = () => {
    if (videoRef.current) {
        setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
        setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleProgress = () => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
        const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
        const duration = videoRef.current.duration;
        if (duration > 0) {
            setBuffered((bufferedEnd / duration) * 100);
        }
    }
  };

  const handleLoadedMetadata = () => {
      if (videoRef.current) {
          setDuration(videoRef.current.duration);
      }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (videoRef.current) {
        const seekTime = (e.nativeEvent.offsetX / e.currentTarget.offsetWidth) * duration;
        videoRef.current.currentTime = seekTime;
    }
  };

  const handleForward = () => {
      if (videoRef.current) {
          videoRef.current.currentTime += 10;
      }
  };

  const handleRewind = () => {
      if (videoRef.current) {
          videoRef.current.currentTime -= 10;
      }
  };

  const handleFullscreen = () => {
      if (!playerContainerRef.current) return;

      if (!document.fullscreenElement) {
        playerContainerRef.current.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };


  const isOwnPost = user?.uid === post.authorId;
  const userType = userProfile?.userType || 'Inactive';
  const isAdmin = userType === 'Admin';
  const canEdit = permissions.canEditOwnPost.includes(userType);
  const canDeleteOthers = permissions.canDeleteOthersPosts.includes(userType);
  
  const showMoreOptions = isOwnPost || isAdmin || canDeleteOthers;
  const canDeletePost = isOwnPost || isAdmin || canDeleteOthers;
  const canEditPost = isOwnPost && canEdit;
  
   const getSourceInfo = () => {
    if (!post.source || typeof post.source === 'string' || post.source.type === 'user') {
      return null;
    }
    const { type, name } = post.source;
    let Icon;
    let href;
    
    switch(type) {
      case 'page': 
        Icon = Flag; 
        href = `/pages/${post.pageId}`;
        break;
      case 'group': 
        Icon = Group; 
        href = `/groups/${post.groupId}`;
        break;
      case 'event': 
        Icon = Calendar; 
        href = `/events/${post.eventId}`;
        break;
      case 'quiz':
        Icon = Trophy;
        href = `/quizzes/${post.quizId}`;
        break;
      default: return null;
    }

    return (
      <Link href={href!} className="text-muted-foreground flex items-center gap-1 min-w-0">
        on <Icon className="h-3 w-3 shrink-0" /> <span className="font-semibold text-foreground truncate">{name}</span>
      </Link>
    )
  }

  const renderMedia = () => {
    if (!post.mediaUrls || post.mediaUrls.length === 0) return null;

    if (post.mediaType === "video") {
        return (
            <div 
              ref={playerContainerRef}
              className="relative w-full overflow-hidden rounded-lg border group/video [&:fullscreen]:bg-black" 
              onMouseEnter={() => setShowControls(true)}
              onMouseLeave={() => setShowControls(false)}
            >
                <video 
                    ref={videoRef} 
                    src={post.mediaUrls[0]} 
                    className="w-full aspect-video bg-black" 
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onClick={() => setShowControls(s => !s)}
                    onWaiting={() => setIsBuffering(true)}
                    onPlaying={() => setIsBuffering(false)}
                    onProgress={handleProgress}
                />

                <div className="absolute inset-0 w-full h-full grid grid-cols-2">
                    <div onDoubleClick={handleRewind} />
                    <div onDoubleClick={handleForward} />
                </div>
                
                {isBuffering && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
                        <Loader2 className="h-12 w-12 text-white animate-spin" />
                    </div>
                )}
                
                <div className={cn(
                    "absolute inset-0 flex items-center justify-center gap-8 bg-black/30 transition-opacity", 
                    (isPlaying || !showControls || isBuffering) && "opacity-0 pointer-events-none"
                )}>
                    <Button variant="ghost" size="icon" className="h-16 w-16 text-white hover:text-white hover:bg-white/20" onClick={handleRewind}>
                        <Rewind className="h-10 w-10 fill-white" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-20 w-20 text-white hover:text-white hover:bg-white/20" onClick={togglePlay}>
                        <Play className="h-16 w-16 fill-white" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-16 w-16 text-white hover:text-white hover:bg-white/20" onClick={handleForward}>
                        <FastForward className="h-10 w-10 fill-white" />
                    </Button>
                </div>
                <div className={cn("absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent transition-opacity", showControls ? "opacity-100" : "opacity-0 pointer-events-none")}>
                   <Progress value={progress} buffered={buffered} onClick={handleSeek} className="h-1 cursor-pointer" />
                    <div className="flex items-center justify-between text-white text-xs mt-1">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white" onClick={togglePlay}>
                                {isPlaying ? <Pause /> : <Play />}
                            </Button>
                            <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                        </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white" onClick={handleFullscreen}>
                            {isFullscreen ? <Minimize /> : <Maximize />}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }
    
    if (post.mediaType === "image") {
        const imageCount = post.mediaUrls.length;
        if (imageCount === 1) {
            return (
                <div onClick={() => openFullScreen(0)} className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border cursor-pointer">
                    <Image src={post.mediaUrls[0]} alt="Post image" fill className="object-cover" data-ai-hint="post content" />
                </div>
            )
        }

        const gridClasses = {
            2: 'grid-cols-2',
            3: 'grid-cols-3',
            4: 'grid-cols-2',
        };
        const gridClass = imageCount <= 4 ? gridClasses[imageCount as keyof typeof gridClasses] : 'grid-cols-2';

        return (
            <div className={cn('grid gap-1 rounded-lg overflow-hidden border', gridClass)}>
                {post.mediaUrls.slice(0, 4).map((url, index) => (
                     <div 
                        key={index}
                        onClick={() => openFullScreen(index)}
                        className={cn("relative bg-muted cursor-pointer", {
                            'col-span-1 row-span-1 aspect-square': imageCount > 1,
                            'col-span-2 row-span-2': imageCount === 3 && index === 0,
                            'col-span-1 row-span-1': imageCount === 3 && index !== 0,
                        })}
                     >
                        <Image src={url} alt={`Post image ${index + 1}`} fill className="object-cover" />
                        {imageCount > 4 && index === 3 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <span className="text-white text-3xl font-bold">+{imageCount - 4}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )
    }

    return null;
  }


  return (
    <>
    {fullScreenImage && <FullScreenImageViewer {...fullScreenImage} onClose={() => setFullScreenImage(null)} />}
    <Card>
      <CardHeader className="p-2 sm:p-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/profile/${post.author.username}`}>
            <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
              <AvatarImage src={post.author.profilePictureUrl || undefined} alt={post.author.displayName} />
              <AvatarFallback>{post.author.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="text-sm sm:text-base flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link href={`/profile/${post.author.username}`} className="font-semibold hover:underline shrink-0 text-sm sm:text-base">{post.author.displayName}</Link>
                <UserTypeIcon userType={post.author.userType} className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <div className="flex items-center gap-1 min-w-0 truncate">
                  {getSourceInfo()}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
        </div>
        {showMoreOptions && (
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <AlertDialog>
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      {canEditPost && (
                        <DialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                        </DialogTrigger>
                      )}
                      {canDeletePost && (
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                      )}
                  </DropdownMenuContent>
              </DropdownMenu>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to delete this post?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this post and any comments on it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Post</DialogTitle>
                    <DialogDescription>
                        Make changes to your post here. Click update when you're done.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="min-h-[120px]"
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdatePost} disabled={isEditing}>
                        {isEditing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Update
                    </Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>
        )}
      </CardHeader>
      <CardContent className="p-2 sm:p-4 pt-0">
        {post.text && <p className="mb-4 whitespace-pre-wrap text-sm sm:text-base">{post.text}</p>}
        {renderMedia()}
      </CardContent>
      <CardFooter className="flex flex-col items-start px-2 sm:px-4 py-2">
        <div className="w-full flex justify-between items-center text-xs text-muted-foreground mb-2">
            <div>{likeCount > 0 && `${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`}</div>
            <div className="flex gap-4">
              {post.commentCount > 0 && <span>{post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}</span>}
              {post.shareCount > 0 && <span>{post.shareCount} {post.shareCount === 1 ? 'share' : 'shares'}</span>}
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {post.viewCount}</span>
            </div>
        </div>
        <div className="w-full border-t pt-2 grid grid-cols-3 gap-1">
          <Button variant="ghost" className="w-full h-8 px-2" onClick={handleLike} disabled={!user || isLiking}>
            <Heart className={`mr-2 h-4 w-4 ${isLiked ? 'text-red-500 fill-current' : ''}`} />
            <span className="hidden sm:inline">Like</span>
          </Button>
          <Button variant="ghost" className="w-full h-8 px-2" onClick={toggleComments}>
            <MessageCircle className="mr-2 h-4 w-4" />
             <span className="hidden sm:inline">Comment</span>
          </Button>
          <Button variant="ghost" className="w-full h-8 px-2" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
             <span className="hidden sm:inline">Share</span>
          </Button>
        </div>
        {commentsVisible && (
          commentsLoading ? (
            <div className="w-full text-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            </div>
          ) : (
            <CommentSection post={post} comments={comments} onCommentAdded={onCommentAdded} />
          )
        )}
      </CardFooter>
    </Card>
    </>
  );
}
