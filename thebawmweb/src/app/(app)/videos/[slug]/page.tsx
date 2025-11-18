
import { Suspense } from 'react';
import { VideoPlayerContent } from '@/components/videos/video-player-content';
import { getVideo, getUser, getVideos } from '@/services/firestore';
import { notFound } from 'next/navigation';
import type { Video, UserProfile } from '@/lib/types';
import { collection, doc, getDoc, getDocs, query, where, orderBy, documentId, Timestamp, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";


async function getVideoData(slug: string) {
    const video = await getVideo(slug);
    if (!video) return { video: null, uploader: null, relatedVideos: [] };

    const [uploader, allVideos] = await Promise.all([
        getUser(video.uploaderId),
        getVideos()
    ]);
    
    const relatedVideos = allVideos
        .filter(v => v.id !== video.id && v.tags?.some(tag => video.tags?.includes(tag)))
        .slice(0, 5);

    return { video, uploader, relatedVideos };
}


export default async function VideoPlayerPage({ params }: { params: { slug: string } }) {
    const { video, uploader, relatedVideos } = await getVideoData(params.slug);

    if (!video || !uploader) {
        return notFound();
    }

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VideoPlayerContent video={video} uploader={uploader} relatedVideos={relatedVideos} />
        </Suspense>
    )
}
