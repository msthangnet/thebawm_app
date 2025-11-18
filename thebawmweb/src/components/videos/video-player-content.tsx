

'use client';
import type { Video, UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThumbsUp, ThumbsDown, Share2, UserPlus, UserCheck, AlertCircle, Play, Pause, Maximize, Minimize, Repeat, Loader2, Volume2, VolumeX, Rewind, FastForward, Settings } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { getUser } from '@/services/firestore';
import { VideoCommentSection } from './video-comment-section';
import { VideoCard } from './video-card';
import { Progress } from '../ui/progress';
import { useRouter } from 'next/navigation';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuPortal } from '../ui/dropdown-menu';

function DescriptionCard({ video }: { video: Video }) {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <Card className="bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
            <CardContent className="p-4">
                 <div className="flex gap-4 font-semibold text-sm mb-2">
                    <p>{(video.viewCount || 0).toLocaleString()} views</p>
                    <p>{formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}</p>
                 </div>
                 <p className={cn("text-sm whitespace-pre-wrap", !isExpanded && "line-clamp-2")}>
                    {video.description}
                 </p>
                 <button className="text-sm font-semibold mt-2">
                    {isExpanded ? 'Show less' : 'Show more'}
                 </button>
            </CardContent>
        </Card>
    )
}

interface VideoPlayerContentProps {
    video: Video;
    uploader: UserProfile;
    relatedVideos: Video[];
}

const qualityOrder: (keyof Video['videoUrls'])[] = ["144p", "360p", "720p", "1080p"];


export function VideoPlayerContent({ video, uploader, relatedVideos }: VideoPlayerContentProps) {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [isLiked, setIsLiked] = useState(currentUser ? video.likes.includes(currentUser.uid) : false);
    const [likeCount, setLikeCount] = useState(video.likes.length);
    const [isLiking, setIsLiking] = useState(false);
    const [viewCounted, setViewCounted] = useState(false);
    const [relatedVideosWithUploader, setRelatedVideosWithUploader] = useState<(Video & { uploader: UserProfile | null })[]>([]);
    const [isAutoplayOn, setIsAutoplayOn] = useState(true);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [progress, setProgress] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    const availableQualities = useMemo(() => {
      return qualityOrder.filter(q => video.videoUrls[q]);
    }, [video.videoUrls]);
    
    const [currentQuality, setCurrentQuality] = useState<keyof Video['videoUrls']>(availableQualities[0] || '720p');

    useEffect(() => {
        const fetchUploaders = async () => {
            const videosWithUploaders = await Promise.all(
                relatedVideos.map(async (v) => {
                    const uploader = await getUser(v.uploaderId);
                    return { ...v, uploader };
                })
            );
            setRelatedVideosWithUploader(videosWithUploaders);
        };
        fetchUploaders();
    }, [relatedVideos]);

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
        if (videoRef.current) {
            videoRef.current.volume = volume;
            videoRef.current.muted = isMuted;
        }
    }, [volume, isMuted]);

     const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (videoRef.current && !videoRef.current.paused) {
                setShowControls(false);
            }
        }, 3000);
    };

    const handleMouseLeave = () => {
        if (videoRef.current && !videoRef.current.paused) {
            setShowControls(false);
        }
         if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
    };


    const handleVolumeChange = (newVolume: number[]) => {
        const vol = newVolume[0];
        setVolume(vol);
        if (vol === 0) {
            setIsMuted(true);
        } else if (isMuted) {
            setIsMuted(false);
        }
    }

    const toggleMute = () => {
        setIsMuted(m => !m);
        if (isMuted && volume === 0) {
            setVolume(0.5); // Restore to a default volume if it was muted at 0
        }
    }

    const handlePlay = () => {
        if (!viewCounted) {
            const videoRef = doc(db, 'videos', video.id);
            updateDoc(videoRef, { viewCount: increment(1) });
            setViewCounted(true);
        }
        setIsPlaying(true);
    };

     const handlePause = () => {
        setIsPlaying(false);
    };
    
    const handleLike = async () => {
        if (!currentUser || isLiking) return;
        setIsLiking(true);

        const videoRef = doc(db, 'videos', video.id);
        try {
            if (isLiked) {
                await updateDoc(videoRef, { likes: arrayRemove(currentUser.uid) });
                setLikeCount(prev => prev - 1);
                setIsLiked(false);
            } else {
                await updateDoc(videoRef, { likes: arrayUnion(currentUser.uid) });
                setLikeCount(prev => prev + 1);
                setIsLiked(true);
            }
        } catch (e) {
            console.error(e);
            toast({title: "Error", description: "Could not process your like."});
        } finally {
            setIsLiking(false);
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
            const progressContainer = e.currentTarget;
            const rect = progressContainer.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const seekTime = (offsetX / rect.width) * duration;
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

    const handleVideoEnded = () => {
        if (isAutoplayOn && relatedVideosWithUploader.length > 0) {
            const nextVideo = relatedVideosWithUploader[0];
            if (nextVideo?.slug) {
                router.push(`/videos/${nextVideo.slug}`);
            }
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleQualityChange = (quality: keyof Video['videoUrls']) => {
        if (videoRef.current && quality !== currentQuality) {
            const videoElement = videoRef.current;
            const wasPlaying = !videoElement.paused;
            const currentTime = videoElement.currentTime;

            setIsBuffering(true);
            
            videoElement.src = video.videoUrls[quality]!;
            videoElement.load();
            
            const onLoadedData = () => {
                videoElement.currentTime = currentTime;
                if (wasPlaying) {
                    videoElement.play();
                }
                videoElement.removeEventListener('loadeddata', onLoadedData);
            };
            
            videoElement.addEventListener('loadeddata', onLoadedData);
            setCurrentQuality(quality);
        }
    };


    if (!currentUser) {
        return (
            <div className="container mx-auto max-w-4xl py-12 px-4 flex items-center justify-center">
                 <Card className="text-center p-8 w-full">
                     <CardContent className="flex flex-col items-center gap-4">
                        <AlertCircle className="w-12 h-12 text-primary" />
                        <h2 className="text-2xl font-headline">Access Restricted</h2>
                        <p className="text-muted-foreground">You must be logged in to watch videos.</p>
                        <Button asChild className="mt-4">
                            <Link href="/login">Login or Sign Up</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-7xl py-8 px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-4">
                    <div 
                        ref={playerContainerRef}
                        className="aspect-video w-full bg-black rounded-xl overflow-hidden mb-4 relative group/video [&:fullscreen]:bg-black"
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                    >
                         <video 
                            ref={videoRef}
                            className="w-full h-full"
                            autoPlay
                            onPlay={handlePlay}
                            onPause={handlePause}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onEnded={handleVideoEnded}
                            onWaiting={() => setIsBuffering(true)}
                            onPlaying={() => setIsBuffering(false)}
                            onProgress={handleProgress}
                        >
                            <source src={video.videoUrls[currentQuality]} type="video/mp4" />
                        </video>

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
                             (isPlaying && !showControls) || isBuffering ? "opacity-0 pointer-events-none" : "opacity-100"
                        )}>
                            <Button variant="ghost" size="icon" className="h-16 w-16 text-white hover:text-white hover:bg-white/20" onClick={handleRewind}>
                                <Rewind className="h-10 w-10 fill-white" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-20 w-20 text-white hover:text-white hover:bg-white/20" onClick={togglePlay}>
                                {isPlaying ? <Pause className="h-16 w-16 fill-white"/> : <Play className="h-16 w-16 fill-white" />}
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
                                     <div className="flex items-center gap-2 group/volume">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white" onClick={toggleMute}>
                                            {isMuted || volume === 0 ? <VolumeX /> : <Volume2 />}
                                        </Button>
                                        <div className="w-16 transition-all duration-300">
                                            <Slider
                                                min={0}
                                                max={1}
                                                step={0.05}
                                                value={[isMuted ? 0 : volume]}
                                                onValueChange={handleVolumeChange}
                                                className={cn("w-full h-1")}
                                            />
                                        </div>
                                    </div>
                                    <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                                </div>
                                <div className="flex items-center">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white">
                                                <Settings />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuPortal container={playerContainerRef.current}>
                                            <DropdownMenuContent align="end" side="top">
                                                {availableQualities.map(q => (
                                                    <DropdownMenuItem key={q} onSelect={() => handleQualityChange(q)}>
                                                        {q} {currentQuality === q && '(current)'}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenu>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white" onClick={handleFullscreen}>
                                        {isFullscreen ? <Minimize /> : <Maximize />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold font-headline">{video.title}</h3>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <Link href={`/profile/${uploader.username}`}>
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={uploader.profilePictureUrl || undefined} alt={uploader.displayName} />
                                    <AvatarFallback>{uploader.displayName?.substring(0,1)}</AvatarFallback>
                                </Avatar>
                            </Link>
                            <div>
                                <Link href={`/profile/${uploader.username}`} className="font-semibold hover:text-primary">{uploader.displayName}</Link>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <div className="flex items-center rounded-full bg-muted">
                                <Button variant="ghost" className="rounded-r-none" onClick={handleLike} disabled={isLiking}>
                                    <ThumbsUp className={cn("mr-2", isLiked && "text-blue-500 fill-current")} /> {likeCount}
                                </Button>
                            </div>
                            <Button variant="ghost">
                                <Share2 className="mr-2" /> Share
                            </Button>
                        </div>
                    </div>

                    <DescriptionCard video={video} />
                    
                     <div className="block lg:hidden mt-8">
                        <VideoCommentSection videoId={video.id} />
                    </div>

                </div>

                {/* Sidebar / Related Videos */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Up Next</h2>
                        <div className="flex items-center space-x-2">
                            <Label htmlFor="autoplay-switch" className="text-sm font-medium">Autoplay</Label>
                            <Switch id="autoplay-switch" checked={isAutoplayOn} onCheckedChange={setIsAutoplayOn} />
                        </div>
                    </div>
                    <div className="hidden lg:flex flex-col gap-4">
                        {relatedVideosWithUploader.map(({uploader, ...relatedVideo}) => 
                            uploader && <RelatedVideoCard key={relatedVideo.id} video={relatedVideo} uploader={uploader} />
                        )}
                         {relatedVideosWithUploader.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No related videos found.</p>
                        )}
                    </div>
                    <div className="block lg:hidden mt-8">
                        <Separator className="my-8" />
                        <h2 className="text-xl font-bold mb-4">Related Videos</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-10">
                            {relatedVideosWithUploader.map(({uploader, ...relatedVideo}) => 
                                uploader && <VideoCard key={relatedVideo.id} video={relatedVideo} uploader={uploader} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
             <div className="hidden lg:block lg:col-span-2 mt-8">
                <VideoCommentSection videoId={video.id} />
            </div>
        </div>
    );
}


function RelatedVideoCard({ video, uploader }: { video: Video, uploader: UserProfile }) {
    return (
         <div className="flex gap-3">
            <Link href={`/videos/${video.slug}`} className="block relative aspect-video w-40 rounded-lg overflow-hidden group shrink-0">
                <Image 
                    src={video.thumbnailUrl} 
                    alt={video.title} 
                    fill 
                    className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                    data-ai-hint="video thumbnail"
                />
            </Link>
            <div className="flex flex-col">
                <Link href={`/videos/${video.slug}`} className="font-semibold leading-snug text-sm hover:text-primary transition-colors line-clamp-2">
                    {video.title}
                </Link>
                <Link href={`/profile/${uploader.username}`} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    {uploader.displayName}
                </Link>
                <p className="text-xs text-muted-foreground">
                    {video.viewCount.toLocaleString()} views
                </p>
            </div>
        </div>
    )
}



