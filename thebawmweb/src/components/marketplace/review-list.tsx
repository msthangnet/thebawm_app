
'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import type { Review } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

export function ReviewList({ reviews }: { reviews: Review[] }) {
    if (reviews.length === 0) {
        return null;
    }

  return (
    <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
        <div className="space-y-6">
            {reviews.map((review) => (
                <Card key={review.id}>
                    <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                        <Link href={`/profile/${review.author?.username}`}>
                            <Avatar>
                                <AvatarImage src={review.author?.profilePictureUrl} />
                                <AvatarFallback>{review.author?.displayName?.[0]}</AvatarFallback>
                            </Avatar>
                        </Link>
                         <div className="flex-1">
                            <div className="flex items-center gap-2">
                                {[1,2,3,4,5].map(star => (
                                    <Star key={star} className={cn("h-4 w-4", review.rating >= star ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground")} />
                                ))}
                            </div>
                            <p className="text-sm font-semibold">
                                by <Link href={`/profile/${review.author?.username}`} className="hover:underline">{review.author?.displayName}</Link> on {new Date(review.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {review.comment && <p className="text-muted-foreground">{review.comment}</p>}
                    </CardContent>
                </Card>
            ))}
        </div>
    </div>
  );
}
