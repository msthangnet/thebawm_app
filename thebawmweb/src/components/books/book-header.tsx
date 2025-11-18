

'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Publication, UserProfile } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { Edit, BookCopy, Eye } from "lucide-react";
import Link from 'next/link';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import Image from "next/image";

export function BookHeader({ book, author }: { book: Publication, author: UserProfile | null }) {
  const { user, userProfile } = useAuth();
  
  const isOwner = user?.uid === book.authorId;
  const isAdmin = userProfile?.userType === 'Admin';
  const canEdit = isOwner || isAdmin;
  
  return (
    <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex-grow">
                <CardTitle>{book.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    {author && (
                        <Link href={`/profile/${author.username}`} className="flex items-center gap-2 group/author">
                            <Avatar className="h-6 w-6">
                                <AvatarImage src={author.profilePictureUrl || undefined} />
                                <AvatarFallback>{author.displayName?.substring(0,1)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium group-hover/author:underline">{author.displayName}</span>
                        </Link>
                    )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    <div className="flex items-center gap-1">
                        <BookCopy className="h-4 w-4" />
                        <span>{(book.pages || []).length} Chapters</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>{book.readCount || 0} Reads</span>
                    </div>
                    {book.publishDate && <span>&middot;</span>}
                    {book.publishDate && <p>{format(new Date(book.publishDate), 'PPP')}</p>}
                </div>
            </div>
                {canEdit && (
                <div className="flex-shrink-0">
                    <Button asChild variant="secondary" size="sm">
                        <Link href={`/books/edit/${book.id}`}>
                            <Edit className="mr-2 h-4 w-4"/>
                            Edit Book
                        </Link>
                    </Button>
                </div>
            )}
        </CardHeader>
    </Card>
  );
}
