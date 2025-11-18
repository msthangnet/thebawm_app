
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Video, UserProfile, VideoCreationPermissions } from "@/lib/types";
import { Loader2, PlusCircle, Settings, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { DefaultVideoCreationPermissions } from "@/lib/types";
import { VideoCard } from "@/components/videos/video-card";
import { getUser } from "@/services/firestore";
import { Input } from "@/components/ui/input";

export default function VideosPage() {
    const { user, userProfile } = useAuth();
    const [videos, setVideos] = useState<(Video & { uploader: UserProfile | null })[]>([]);
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState<VideoCreationPermissions>(DefaultVideoCreationPermissions);
    const [searchTerm, setSearchTerm] = useState("");
    
    useEffect(() => {
        const videosRef = collection(db, "videos");
        const unsubscribe = onSnapshot(videosRef, async (querySnapshot) => {
            const fetchedVideosPromises = querySnapshot.docs.map(async (docSnapshot) => {
                const data = docSnapshot.data() as Video;
                const uploader = await getUser(data.uploaderId);
                return {
                    ...data,
                    id: docSnapshot.id,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                    uploader: uploader,
                };
            });

            const fetchedVideos = await Promise.all(fetchedVideosPromises);
            setVideos(fetchedVideos);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching videos:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            const permsRef = doc(db, "app_settings", "videoCreationPermissions");
            const unsubscribe = onSnapshot(permsRef, (permsSnap) => {
                if (permsSnap.exists()) {
                    setPermissions(permsSnap.data() as VideoCreationPermissions);
                } else {
                    setPermissions(DefaultVideoCreationPermissions);
                }
            });
            return () => unsubscribe();
        }
    }, [user]);

    const isAdmin = userProfile?.userType === 'Admin';
    const canPublish = user && (permissions.allowedUserIds.includes(user.uid) || isAdmin);

    const filteredVideos = videos.filter(video => 
        video.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                <p className="text-[18px] font-bold font-headline flex-1">Videos</p>
                <div className="flex w-full md:w-auto items-center gap-2">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            placeholder="Search videos..."
                            className="pl-10 bg-background"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canPublish && (
                        <Button asChild>
                            <Link href="/videos/publish">
                                <PlusCircle className="mr-1 h-4 w-4"/>
                                Add video
                            </Link>
                        </Button>
                    )}
                    {isAdmin && (
                            <Button asChild variant="outline" size="icon">
                            <Link href="/admin/video-settings">
                                <Settings className="h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
            <div>
                {loading ? (
                        <div className="flex h-48 items-center justify-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : filteredVideos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
                        {filteredVideos.map(video => video.uploader && <VideoCard key={video.id} video={video} uploader={video.uploader} />)}
                    </div>
                ) : (
                    <div className="text-center py-16 text-muted-foreground">
                        <p>No videos have been published yet. {canPublish ? "Be the first to publish one!" : ""}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

  

