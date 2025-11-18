
"use client";

import { VideoForm } from "@/components/videos/video-form";
import { useAuth } from "@/hooks/use-auth";
import { Video } from "@/lib/types";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function EditVideoPage() {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const videoId = params.videoId as string;
    const [videoData, setVideoData] = useState<Video | null>(null);
    const [loadingVideo, setLoadingVideo] = useState(true);

    useEffect(() => {
        if (!videoId) return;

        const fetchVideo = async () => {
            const videoRef = doc(db, 'videos', videoId);
            const videoSnap = await getDoc(videoRef);

            if (videoSnap.exists()) {
                const data = videoSnap.data() as Video;
                if (data.uploaderId === user?.uid || userProfile?.userType === 'Admin') {
                    setVideoData({ ...data, id: videoSnap.id });
                } else {
                    toast({ title: "Access Denied", description: "You don't have permission to edit this video.", variant: "destructive" });
                    router.replace('/videos');
                }
            } else {
                toast({ title: "Not Found", description: "This video does not exist.", variant: "destructive" });
                router.replace('/videos');
            }
            setLoadingVideo(false);
        };

        if (!loading && user) {
            fetchVideo();
        } else if (!loading && !user) {
            router.replace('/login');
        }

    }, [videoId, user, userProfile, loading, router]);


    if (loading || loadingVideo) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!videoData) {
        return (
             <div className="flex h-screen items-center justify-center bg-background">
                <p>Could not load video data.</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto">
            <VideoForm existingVideoData={videoData} />
        </div>
    );
}
