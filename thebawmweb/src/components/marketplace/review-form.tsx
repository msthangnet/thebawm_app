
'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Review, UserProfile } from '@/lib/types';

const reviewFormSchema = z.object({
  rating: z.number().min(1, 'Rating is required.'),
  comment: z.string().max(1000, 'Comment is too long.').optional(),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

interface ReviewFormProps {
    productId: string;
    onReviewAdded: (newReview: Review) => void;
}

export function ReviewForm({ productId, onReviewAdded }: ReviewFormProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: { rating: 0, comment: '' },
  });

  useEffect(() => {
    const checkIfReviewed = async () => {
        if (!user) return;
        const reviewsRef = collection(db, 'reviews');
        const q = query(reviewsRef, where('productId', '==', productId), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            setHasReviewed(true);
        }
    }
    checkIfReviewed();
  }, [user, productId]);

  const onSubmit = async (values: ReviewFormValues) => {
    if (!user || !userProfile) return;
    setLoading(true);

    try {
        const docRef = await addDoc(collection(db, 'reviews'), {
            productId,
            userId: user.uid,
            rating: values.rating,
            comment: values.comment || '',
            createdAt: serverTimestamp(),
        });
        
        const newReview: Review = {
            id: docRef.id,
            productId,
            userId: user.uid,
            rating: values.rating,
            comment: values.comment || '',
            createdAt: new Date().toISOString(),
            author: userProfile as UserProfile
        };

        onReviewAdded(newReview);
        toast({ title: 'Review Submitted!', description: 'Thank you for your feedback.' });
        form.reset();
        setHasReviewed(true);
    } catch (error) {
        console.error("Error submitting review:", error);
        toast({ title: 'Error', description: 'Could not submit your review.', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  if (hasReviewed) {
      return (
          <div className='p-4 text-center bg-muted rounded-lg'>
              <p className='text-sm text-muted-foreground'>You've already reviewed this product. Thank you for your feedback!</p>
          </div>
      )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Write a Review</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Rating</FormLabel>
                <FormControl>
                    <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={cn(
                                    "h-6 w-6 cursor-pointer",
                                    (hoverRating >= star || field.value >= star)
                                    ? "text-yellow-400 fill-yellow-400"
                                    : "text-muted-foreground"
                                )}
                                onMouseEnter={() => setHoverRating(star)}
                                onClick={() => field.onChange(star)}
                            />
                        ))}
                    </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="comment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Review (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Share your thoughts on the product..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Review
          </Button>
        </form>
      </Form>
    </div>
  );
}
