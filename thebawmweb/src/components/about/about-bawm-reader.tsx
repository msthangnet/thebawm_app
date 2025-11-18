
'use client';
import { notFound } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Lock, Edit, BookCopy, Eye, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AboutBawm, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from 'date-fns';
import Image from 'next/image';

function AboutBawmHeader({ data, author }: { data: AboutBawm, author: UserProfile | null }) {
  const { user, userProfile } = useAuth();
  
  const isOwner = user?.uid === data.authorId;
  const isAdmin = userProfile?.userType === 'Admin';
  const canEdit = isOwner || isAdmin;
  
  return (
    <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex-grow">
                <CardTitle>{data.title}</CardTitle>
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
                        <span>{(data.pages || []).length} Pages</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>{data.readCount || 0} Reads</span>
                    </div>
                    {data.publishDate && <span>&middot;</span>}
                    {data.publishDate && <p>{format(new Date(data.publishDate), 'PPP')}</p>}
                </div>
            </div>
                {canEdit && (
                <div className="flex-shrink-0">
                    <Button asChild variant="secondary" size="sm">
                        <Link href={`/about-bawm/edit/${data.slug}`}>
                            <Edit className="mr-2 h-4 w-4"/>
                            Edit Content
                        </Link>
                    </Button>
                </div>
            )}
        </CardHeader>
    </Card>
  );
}

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

export function AboutBawmReader({ data, author }: { data: AboutBawm | null, author: UserProfile | null }) {
  const { user, userProfile } = useAuth();
  const [activePageId, setActivePageId] = useState(data?.pages?.[0]?.id || '');
  const [internalData, setInternalData] = useState(data);
  const [fullScreenImage, setFullScreenImage] = useState<{ images: string[], startIndex: number } | null>(null);

  useEffect(() => {
    if (!data) return;
    const viewedKey = `viewed_about-bawm_${data.id}`;
    if (!sessionStorage.getItem(viewedKey)) {
      const dataRef = doc(db, 'aboutBawm', data.id);
      updateDoc(dataRef, { readCount: increment(1) }).then(() => {
        setInternalData(currentData => currentData ? { ...currentData, readCount: currentData.readCount + 1 } : null);
        sessionStorage.setItem(viewedKey, 'true');
      }).catch(err => console.error("Failed to increment read count", err));
    }
  }, [data]);


  if (!internalData) {
    return notFound();
  }
  
  const isPublished = internalData.isPublished;
  const isOwner = user?.uid === internalData.authorId;
  const isSiteAdmin = userProfile?.userType === 'Admin';
  
  const canRead = isPublished || isOwner || isSiteAdmin;

  if (!canRead) {
    return (
      <div className="container mx-auto max-w-4xl py-12 px-4 flex items-center justify-center">
        <Alert variant="destructive" className="w-full max-w-md text-center">
          <Lock className="mx-auto h-8 w-8 mb-4" />
          <AlertTitle className="text-2xl font-headline">Not Yet Published</AlertTitle>
          <AlertDescription>
            This content has not been published yet. Please check back later.
          </AlertDescription>
           <Button asChild className="mt-6">
              <Link href="/about-bawm">Back to About BAWM</Link>
            </Button>
        </Alert>
      </div>
    );
  }

  const pages = internalData.pages || [];

  return (
    <>
      {fullScreenImage && <FullScreenImageViewer {...fullScreenImage} onClose={() => setFullScreenImage(null)} />}
      <div className="flex flex-col gap-8">
          <AboutBawmHeader data={internalData} author={author} />
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
                                      <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: page.content.replace(/\\n/g, '<br />') }} />
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
                          <p>This content doesn't have any pages yet.</p>
                      </div>
                  </CardContent>
              </Card>
          )}
      </div>
    </>
  );
}
