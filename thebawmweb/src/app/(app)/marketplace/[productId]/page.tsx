
import { Suspense } from 'react';
import ProductDetailContent from './product-detail-content';
import { getProduct, getUser, getProducts, getProductReviews } from '@/services/firestore';
import { notFound } from 'next/navigation';

async function getProductData(productId: string) {
    const product = await getProduct(productId);
    if (!product) return { product: null, seller: null, relatedProducts: [], reviews: [] };

     const [seller, allProducts, reviews] = await Promise.all([
        getUser(product.sellerId),
        getProducts(),
        getProductReviews(productId),
    ]);
    
         const relatedProducts = allProducts
        .filter(p => p.category === product.category && p.id !== productId)
        .slice(0, 5);

     return { product, seller, relatedProducts, reviews };
}

export default async function ProductDetailPage({ params }: { params: { productId: string } }) {
    const { product, seller, relatedProducts, reviews } = await getProductData(params.productId);

     if (!product || !seller) {
        return notFound();
    }

     return (
        <Suspense fallback={<div>Loading...</div>}>
            <ProductDetailContent product={product} seller={seller} relatedProducts={relatedProducts} initialReviews={reviews} />
        </Suspense>
    )
}
