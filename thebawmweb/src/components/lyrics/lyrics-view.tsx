
"use client";

import type { Lyrics, Comment } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Music, Edit } from "lucide-react";
import { LyricsInteraction } from "@/components/lyrics/lyrics-interaction";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useRef } from "react";

export function LyricsView({ lyricsData, initialComments }: { lyricsData: Lyrics, initialComments: Comment[] }) {
    const { user, userProfile } = useAuth();
    const isOwner = user?.uid === lyricsData.authorId;
    const isAdmin = userProfile?.userType === 'Admin';
    const songAudioRef = useRef<HTMLAudioElement>(null);
    const karaokeAudioRef = useRef<HTMLAudioElement>(null);

    const handlePlay = (player: 'song' | 'karaoke') => {
        if (player === 'song' && karaokeAudioRef.current) {
            karaokeAudioRef.current.pause();
        } else if (player === 'karaoke' && songAudioRef.current) {
            songAudioRef.current.pause();
        }
    };
    
    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                 <div className="flex justify-between items-center">
                    <CardTitle className="text-4xl font-headline">{lyricsData.title}</CardTitle>
                </div>
                {lyricsData.author && (
                     <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
                        <div className="flex items-center gap-4">
                            <Link href={`/profile/${lyricsData.author.username}`} className="flex items-center gap-2 group/author">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={lyricsData.author.profilePictureUrl || undefined} />
                                    <AvatarFallback>{lyricsData.author.displayName?.substring(0,1)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium group-hover/author:underline">{lyricsData.author.displayName}</span>
                            </Link>
                            <span className="text-muted-foreground">&middot;</span>
                            <span>{formatDistanceToNow(new Date(lyricsData.createdAt), { addSuffix: true })}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {lyricsData.tags.map(tag => (
                                <span key={tag} className="text-xs bg-secondary text-secondary-foreground rounded-full px-3 py-1">{tag}</span>
                            ))}
                        </div>
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-8">
                <div>
                     <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-2xl font-semibold">Lyrics</h3>
                         {(isOwner || isAdmin) && (
                            <Button asChild variant="outline" size="sm">
                                <Link href={`/lyrics/edit/${lyricsData.slug}`}>
                                    <Edit className="mr-2 h-4 w-4"/>
                                    Edit
                                </Link>
                            </Button>
                        )}
                    </div>
                    <p className="whitespace-pre-wrap text-lg leading-loose font-serif">{lyricsData.fullLyrics}</p>
                </div>
                
                {(lyricsData.songAudioUrl || lyricsData.karaokeAudioUrl) && (
                    <div>
                         <h3 className="text-2xl font-semibold mb-4 border-b pb-2">Audio</h3>
                         <div className="space-y-4">
                            {lyricsData.songAudioUrl && (
                                <div>
                                    <h4 className="font-medium mb-2">Full Song</h4>
                                    <audio ref={songAudioRef} controls controlsList="nodownload" src={lyricsData.songAudioUrl} className="w-full" onPlay={() => handlePlay('song')}></audio>
                                </div>
                            )}
                            {lyricsData.karaokeAudioUrl && (
                                 <div>
                                    <h4 className="font-medium mb-2">Karaoke / Instrumental</h4>
                                    <audio ref={karaokeAudioRef} controls controlsList="nodownload" src={lyricsData.karaokeAudioUrl} className="w-full" onPlay={() => handlePlay('karaoke')}></audio>
                                </div>
                            )}
                         </div>
                    </div>
                )}
                 {lyricsData.description && (
                     <Collapsible>
                         <CollapsibleTrigger asChild>
                            <Button variant="link" className="p-0 h-auto">Show description...</Button>
                         </CollapsibleTrigger>
                         <CollapsibleContent>
                            <div className="pt-4">
                                <h3 className="text-2xl font-semibold mb-4 border-b pb-2">Description</h3>
                                <p className="text-muted-foreground">{lyricsData.description}</p>
                            </div>
                         </CollapsibleContent>
                     </Collapsible>
                 )}
            </CardContent>
            <CardFooter>
                 <LyricsInteraction lyrics={lyricsData} initialComments={initialComments} />
            </CardFooter>
        </Card>
    )
}
