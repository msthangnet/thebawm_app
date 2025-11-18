"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Lyrics, LyricsCreationPermissions, UserProfile } from "@/lib/types";
import { Loader2, PlusCircle, Settings, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { DefaultLyricsCreationPermissions } from "@/lib/types";
import { LyricsCard } from "@/components/lyrics/lyrics-card";
import { getUser } from "@/services/firestore";
import { Input } from "@/components/ui/input";

export default function LyricsListPage() {
    const { user, userProfile } = useAuth();
    const [lyrics, setLyrics] = useState<Lyrics[]>([]);
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState<LyricsCreationPermissions>(DefaultLyricsCreationPermissions);
    const [searchTerm, setSearchTerm] = useState("");
    
    useEffect(() => {
        const lyricsRef = collection(db, "lyrics");
        const unsubscribe = onSnapshot(lyricsRef, async (querySnapshot) => {
            const fetchedLyricsPromises = querySnapshot.docs.map(async (docSnapshot) => {
                const data = docSnapshot.data();
                let author: UserProfile | null = null;
                if (data.authorId) {
                    author = await getUser(data.authorId);
                }

                return {
                    ...data,
                    id: docSnapshot.id,
                    author,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                } as Lyrics;
            });

            const fetchedLyrics = await Promise.all(fetchedLyricsPromises);
            setLyrics(fetchedLyrics);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching lyrics:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            const permsRef = doc(db, "app_settings", "lyricsCreationPermissions");
            const unsubscribe = onSnapshot(permsRef, (permsSnap) => {
                if (permsSnap.exists()) {
                    setPermissions(permsSnap.data() as LyricsCreationPermissions);
                } else {
                    setPermissions(DefaultLyricsCreationPermissions);
                }
            });
            return () => unsubscribe();
        }
    }, [user]);

    const isAdmin = userProfile?.userType === 'Admin';
    const canCreateLyrics = user && (permissions.allowedUserIds.includes(user.uid) || isAdmin);

    const filteredLyrics = lyrics.filter(lyric =>
        lyric.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                <p className="text-[18px] font-bold font-headline flex-1">Lyrics</p>
                <div className="flex w-full md:w-auto items-center gap-2">
                     <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            placeholder="Search lyrics..."
                            className="pl-10 bg-background"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canCreateLyrics && (
                        <Button asChild>
                            <Link href="/lyrics/create">
                                <PlusCircle className="mr-1 h-4 w-4"/>
                                Add lyrics
                            </Link>
                        </Button>
                    )}
                    {isAdmin && (
                            <Button asChild variant="outline" size="icon">
                            <Link href="/admin/lyrics-settings">
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
                ) : filteredLyrics.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredLyrics.map(lyric => <LyricsCard key={lyric.id} lyrics={lyric} />)}
                    </div>
                ) : (
                    <div className="text-center py-16 text-muted-foreground">
                        <p>No lyrics have been published yet. {canCreateLyrics ? "Be the first to create one!" : ""}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
