
'use client';

import type { Publication, UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, Trash2, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useState, useEffect } from 'react';
import { getUser } from '@/services/firestore';
import { useAuth } from '@/hooks/use-auth';
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
import { db } from '@/lib/firebase';
import { doc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface BookCardProps {
    publication: Publication;
}

export function BookCard({ publication: book }: BookCardProps) {
    const { user, userProfile } = useAuth();
    const { toast } = useToast();
    const [author, setAuthor] = useState<UserProfile | null>(book.author || null);
    const [isDeleting, setIsDeleting] = useState(false);

    const isOwner = user?.uid === book.authorId;
    const isAdmin = userProfile?.userType === 'Admin';
    const canDelete = isOwner || isAdmin;

    useEffect(() => {
        if (book.author) {
            setAuthor(book.author);
            return;
        }
        const fetchAuthor = async () => {
            const fetchedAuthor = await getUser(book.authorId);
            setAuthor(fetchedAuthor);
        }
        fetchAuthor();
    }, [book.authorId, book.author]);
    
    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const batch = writeBatch(db);
            const pagesRef = collection(db, 'publications', book.id, 'pages');
            const pagesSnapshot = await getDocs(pagesRef);
            pagesSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            const bookRef = doc(db, 'publications', book.id);
            batch.delete(bookRef);

            await batch.commit();

            toast({ title: 'Book Deleted', description: `"${book.title}" has been removed.`});
        } catch (error) {
            console.error("Error deleting book:", error);
            toast({ title: 'Error', description: 'Could not delete the book.', variant: 'destructive'});
        } finally {
            setIsDeleting(false);
        }
    }


    return (
        <Card className="flex flex-col group overflow-hidden transition-shadow hover:shadow-xl">
            <CardHeader className="p-0">
                <Link href={`/books/${book.bookId}`} className="block">
                    <div className="aspect-square relative">
                        <Image 
                            src={book.coverPhotoUrl || "https://picsum.photos/seed/book-cover/400/400"} 
                            alt={book.title} 
                            fill 
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            data-ai-hint="book cover"
                        />
                    </div>
                </Link>
            </CardHeader>
            <CardContent className="pt-4 flex-grow flex flex-col">
                <CardTitle className="font-headline text-lg truncate hover:underline">
                    <Link href={`/books/${book.bookId}`}>{book.title}</Link>
                </CardTitle>
                {author && (
                    <Link href={`/profile/${author.username}`} className="flex items-center gap-2 mt-1 group/author">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={author.profilePictureUrl || undefined} />
                            <AvatarFallback>{author.displayName?.substring(0,1)}</AvatarFallback>
                        </Avatar>
                        <CardDescription className="text-sm group-hover/author:underline">{author.displayName}</CardDescription>
                    </Link>
                )}
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3 flex-grow">
                    {book.description}
                </p>
            </CardContent>
            <CardFooter className="pt-0 flex items-center gap-2">
                 <Button asChild className="w-full mt-auto">
                    <Link href={`/books/${book.bookId}`}>
                        <BookOpen className="mr-2" />
                        Read Book
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
                                    This action cannot be undone. This will permanently delete the book "{book.title}" and all of its chapters.
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
            </CardFooter>
        </Card>
    );
}
