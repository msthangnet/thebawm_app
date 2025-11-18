
'use client';
import { notFound } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Lock, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Publication, UserProfile } from '@/lib/types';
import { BookHeader } from './book-header';
import { Card, CardContent } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import Image from 'next/image';

function FullScreenImageViewer({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
    const [currentIndex, setCurrentIndex] = useState(startIndex);

    const nextImage = () => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
            <div className="relative w-full h-full p-4 flex items-center justify-center">
                <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:text-white hover:bg-white/10" onClick={onClose}>
                    <X className="h-8 w-8" />
                </Button>
                {images.length > 1 && (
                    <>
                        <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); prevImage(); }}>
                            <ChevronLeft className="h-10 w-10" />
                        </Button>
                        <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); nextImage(); }}>
                            <ChevronRight className="h-10 w-10" />
                        </Button>
                    </>
                )}
                <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                    <Image
                        src={images[currentIndex]}
                        alt={`Fullscreen image ${currentIndex + 1}`}
                        width={1200}
                        height={800}
                        className="object-contain max-h-[90vh] w-auto h-auto"
                    />
                </div>
            </div>
        </div>
    );
}

export function BookReader({ book, author }: { book: Publication | null, author: UserProfile | null }) {
  const { user, userProfile } = useAuth();
  const [activePageId, setActivePageId] = useState(book?.pages?.[0]?.id || '');
  const [internalBook, setInternalBook] = useState(book);
  const [fullScreenImage, setFullScreenImage] = useState<{ images: string[], startIndex: number } | null>(null);

  useEffect(() => {
    if (!book) return;
    const viewedKey = `viewed_book_${book.id}`;
    if (!sessionStorage.getItem(viewedKey)) {
      const bookRef = doc(db, 'publications', book.id);
      updateDoc(bookRef, { readCount: increment(1) }).then(() => {
        setInternalBook(currentBook => currentBook ? { ...currentBook, readCount: currentBook.readCount + 1 } : null);
        sessionStorage.setItem(viewedKey, 'true');
      }).catch(err => console.error("Failed to increment read count", err));
    }
  }, [book]);


  if (!internalBook) {
    return notFound();
  }
  
  const isPublished = internalBook.isPublished;
  const isOwner = user?.uid === internalBook.authorId;
  const isSiteAdmin = userProfile?.userType === 'Admin';
  
  const canRead = isPublished || isOwner || isSiteAdmin;

  if (!canRead) {
    return (
      <div className="container mx-auto max-w-4xl py-12 px-4 flex items-center justify-center">
        <Alert variant="destructive" className="w-full max-w-md text-center">
          <Lock className="mx-auto h-8 w-8 mb-4" />
          <AlertTitle className="text-2xl font-headline">Not Yet Published</AlertTitle>
          <AlertDescription>
            This book has not been published yet. Please check back later.
          </AlertDescription>
           <Button asChild className="mt-6">
              <Link href="/books">Back to Library</Link>
            </Button>
        </Alert>
      </div>
    );
  }

  const pages = internalBook.pages || [];

  return (
    <>
      {fullScreenImage && <FullScreenImageViewer {...fullScreenImage} onClose={() => setFullScreenImage(null)} />}
      <div className="flex flex-col gap-8">
          <BookHeader book={internalBook} author={author} />
          {pages.length > 0 ? (
              <Tabs defaultValue={pages[0].id} value={activePageId} onValueChange={setActivePageId} className="w-full">
                  <ScrollArea>
                      <TabsList>
                          {pages.map((page) => (
                              <TabsTrigger key={page.id} value={page.id}>{page.title}</TabsTrigger>
                          ))}
                      </TabsList>
                      <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                  {pages.map(page => (
                      <TabsContent key={page.id} value={page.id}>
                          <Card>
                              <CardContent className="p-4 md:p-6 min-h-[60vh]">
                                  <h2 className="text-2xl font-bold font-headline mb-4 border-b pb-3">{page.title}</h2>
                                  <div className="flex-grow">
                                      {page.contentType === 'paragraph' ? (
                                      <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: page.content.replace(/\n/g, '<br />') }} />
                                      ) : (
                                      <div dangerouslySetInnerHTML={{ __html: page.content }} />
                                      )}
                                  </div>
                                  {page.imageUrls && page.imageUrls.length > 0 && (
                                      <div className="mt-8">
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                              {page.imageUrls.map((url, index) => (
                                                  <div key={index} className="relative aspect-square cursor-pointer" onClick={() => setFullScreenImage({ images: page.imageUrls!, startIndex: index })}>
                                                      <Image src={url} alt={`Page image ${index + 1}`} fill className="object-cover rounded-lg" />
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  )}
                              </CardContent>
                          </Card>
                      </TabsContent>
                  ))}
              </Tabs>
          ) : (
              <Card>
                  <CardContent>
                      <div className="text-center py-16 text-muted-foreground">
                          <p>This book doesn't have any content yet.</p>
                      </div>
                  </CardContent>
              </Card>
          )}
      </div>
    </>
  );
}
