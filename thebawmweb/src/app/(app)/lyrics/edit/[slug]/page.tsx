
"use client";

import { LyricsForm } from "@/components/lyrics/lyrics-form";
import { useAuth } from "@/hooks/use-auth";
import { Lyrics } from "@/lib/types";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function EditLyricsPage() {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;
    const [lyricsData, setLyricsData] = useState<Lyrics | null>(null);
    const [loadingLyrics, setLoadingLyrics] = useState(true);

    useEffect(() => {
        if (!slug) return;

        const fetchLyrics = async () => {
            const lyricsRef = collection(db, 'lyrics');
            const q = query(lyricsRef, where("slug", "==", slug));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const docSnap = querySnapshot.docs[0];
                const data = docSnap.data() as Lyrics;

                if (data.authorId === user?.uid || userProfile?.userType === 'Admin') {
                    setLyricsData({ ...data, id: docSnap.id });
                } else {
                    // User does not have permission
                    router.replace(`/lyrics/${slug}`);
                }
            } else {
                // Lyrics not found
                router.replace('/lyrics');
            }
            setLoadingLyrics(false);
        };

        if (!loading && user) {
            fetchLyrics();
        } else if (!loading && !user) {
            router.replace('/login');
        }

    }, [slug, user, userProfile, loading, router]);


    if (loading || loadingLyrics) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!lyricsData) {
        return <p>Lyrics not found or you don't have permission to edit it.</p>
    }

    return (
        <div className="max-w-4xl mx-auto">
            <LyricsForm existingLyricsData={lyricsData} />
        </div>
    );
}

