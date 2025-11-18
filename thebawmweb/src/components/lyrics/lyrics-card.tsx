
'use client';
import type { Lyrics, UserProfile } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Eye, Music, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { deleteDoc, doc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
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

interface LyricsCardProps {
    lyrics: Lyrics;
}

export function LyricsCard({ lyrics }: LyricsCardProps) {
    const { user, userProfile } = useAuth();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);

    const isOwner = user?.uid === lyrics.authorId;
    const isAdmin = userProfile?.userType === 'Admin';
    const canDelete = isOwner || isAdmin;

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const batch = writeBatch(db);

            // Delete comments
            const commentsQuery = query(collection(db, "comments"), where("postId", "==", lyrics.id));
            const commentsSnapshot = await getDocs(commentsQuery);
            commentsSnapshot.forEach(doc => batch.delete(doc.ref));
            
            // Delete audio files from storage
            if (lyrics.songAudioUrl) {
                const songRef = ref(storage, lyrics.songAudioUrl);
                await deleteObject(songRef).catch(err => console.warn("Song audio file not found, skipping.", err));
            }
            if (lyrics.karaokeAudioUrl) {
                const karaokeRef = ref(storage, lyrics.karaokeAudioUrl);
                await deleteObject(karaokeRef).catch(err => console.warn("Karaoke audio file not found, skipping.", err));
            }

            // Delete lyrics doc
            const lyricRef = doc(db, 'lyrics', lyrics.id);
            batch.delete(lyricRef);

            await batch.commit();

            toast({ title: 'Lyrics Deleted', description: `"${lyrics.title}" has been removed.`});
        } catch (error) {
             console.error("Error deleting lyrics:", error);
            toast({ title: 'Error', description: 'Could not delete the lyrics.', variant: 'destructive'});
        } finally {
            setIsDeleting(false);
        }
    }


    return (
        <Card className="flex flex-col group overflow-hidden transition-shadow hover:shadow-xl h-full">
            <CardHeader className="p-4">
                <div className="flex items-start gap-3 text-primary">
                    <Music className="w-6 h-6 mt-1 shrink-0" />
                    <CardTitle className="font-headline text-lg leading-tight">
                        <Link href={`/lyrics/${lyrics.slug}`} className="hover:underline">
                            {lyrics.title}
                        </Link>
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="flex-grow p-4 pt-0">
                 <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                    {lyrics.fullLyrics}
                </p>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex-col items-start gap-2">
                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye className="w-4 h-4" />
                    <span>{(lyrics.viewCount || 0).toLocaleString()} views</span>
                </div>
                 <div className="flex items-center gap-2 w-full mt-auto">
                    <Button asChild className="w-full">
                        <Link href={`/lyrics/${lyrics.slug}`}>
                            View Lyrics
                        </Link>
                    </Button>
                    {canDelete && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" disabled={isDeleting}>
                                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the lyrics for "{lyrics.title}" and all associated data.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                 </div>
            </CardFooter>
        </Card>
    );
}
