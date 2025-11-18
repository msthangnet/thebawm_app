
'use client';
import { notFound, useParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { ProductCard } from '@/components/marketplace/product-card';
import { cn } from '@/lib/utils';
import { MessageSquare, Check, Star, AlertCircle, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { Product, UserProfile, Review } from '@/lib/types';
import { ReviewForm } from '@/components/marketplace/review-form';
import { ReviewList } from '@/components/marketplace/review-list';

interface ProductDetailContentProps {
    product: Product;
    seller: UserProfile;
    relatedProducts: Product[];
    initialReviews: Review[];
}

export default function ProductDetailContent({ product, seller, relatedProducts, initialReviews }: ProductDetailContentProps) {
    const [selectedImage, setSelectedImage] = useState(0);
    const { user } = useAuth();
    const [reviews, setReviews] = useState<Review[]>(initialReviews);

    const averageRating = reviews.length > 0
        ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
        : 0;

    const handleReviewAdded = (newReview: Review) => {
        setReviews(prevReviews => [newReview, ...prevReviews]);
    };

    if (!user) {
        return (
            <div className="container mx-auto max-w-4xl py-12 px-4 flex items-center justify-center">
                 <Card className="text-center p-8 w-full">
                     <CardContent className="flex flex-col items-center gap-4">
                        <AlertCircle className="w-12 h-12 text-primary" />
                        <h2 className="text-2xl font-headline">Access Restricted</h2>
                        <p className="text-muted-foreground">You must be logged in to view product details.</p>
                        <Button asChild className="mt-4">
                            <Link href="/login">Login or Sign Up</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const whatsappMessage = `Hi, I'm interested in your product: "${product.name}" listed on The Bawm.`;

     return (
        <div className="container mx-auto py-8 px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                {/* Image Gallery */}
                <div>
                     <div className="aspect-square relative rounded-lg overflow-hidden border">
                         <Image src={product.images[selectedImage]} alt={product.name} fill className="object-cover" data-ai-hint="product image" />
                    </div>
                    {product.images.length > 1 && (
                        <div className="flex gap-2 mt-2">
                            {product.images.map((img, index) => (
                                <button key={index} onClick={() => setSelectedImage(index)} className={cn("w-16 h-16 rounded-md overflow-hidden border-2", selectedImage === index ? 'border-primary' : 'border-transparent')}>
                                    <Image src={img} alt={`${product.name} thumbnail ${index}`} width={64} height={64} className="object-cover w-full h-full" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                 {/* Product Details */}
                <div className="space-y-6">
                    <div>
                        <Badge>{product.category}</Badge>
                        <h1 className="text-3xl md:text-4xl font-bold font-headline mt-2">{product.name}</h1>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={cn(
                                            "h-5 w-5",
                                            averageRating >= star ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"
                                        )}
                                    />
                                ))}
                            </div>
                            <span className="text-sm text-muted-foreground">({reviews.length} Reviews)</span>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-primary">${product.price.toFixed(2)}</p>
                    <div className="flex items-center gap-2">
                         {product.stock > 0 ? (
                            <Check className="text-green-600" />
                        ) : (
                            <X className="text-red-500" />
                        )}
                        <span className="font-semibold">
                            {product.stock > 0 ? `Only ${product.stock} left` : 'Sold out'}
                        </span>
                    </div>
                     <div className="flex flex-col sm:flex-row gap-4">
                        <Button size="lg" variant="outline" className="flex-1" asChild>
                            <a href={`https://wa.me/${product.sellerContact.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noopener noreferrer">
                                <MessageSquare className="mr-2" /> Contact Seller
                            </a>
                        </Button>
                    </div>
                     <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{product.description}</p>
                     <Separator />
                     <div className="flex items-center gap-4">
                        <Link href={`/profile/${seller.username}`}>
                            <Avatar className="h-14 w-14">
                                <AvatarImage src={seller.profilePictureUrl} alt={seller.displayName} />
                                <AvatarFallback>{seller.displayName?.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                        </Link>
                        <div>
                            <p className="text-sm text-muted-foreground">Sold by</p>
                            <Link href={`/profile/${seller.username}`} className="font-bold text-lg hover:underline">{seller.displayName}</Link>
                        </div>
                    </div>
                     <Separator />
                    <ReviewForm productId={product.id} onReviewAdded={handleReviewAdded} />
                </div>
            </div>

            <ReviewList reviews={reviews} />

             {/* Related Products */}
            {relatedProducts.length > 0 && (
                <div className="mt-16">
                    <h2 className="text-2xl font-bold mb-6">Related Products</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                        {relatedProducts.map(p => <ProductCard key={p.id} product={p} />)}
                    </div>
                </div>
            )}
        </div>
    );
}
