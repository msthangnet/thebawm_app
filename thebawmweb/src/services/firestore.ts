
import { doc, getDoc, collection, getDocs, orderBy, query, where, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile, Video, Product, Review } from '@/lib/types';

export async function getUser(uid: string): Promise<UserProfile | null> {
    if (!uid) return null;
    try {
        const userDocRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const data = userDoc.data();
            return {
                ...data,
                uid: userDoc.id,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                dob: data.dob || null,
            } as UserProfile;
        }
        return null;
    } catch (error) {
        console.error("Error fetching user:", error);
        return null;
    }
}

export async function getVideo(slug: string): Promise<Video | null> {
    if (!slug) return null;
    try {
        const videosRef = collection(db, "videos");
        const q = query(videosRef, where("slug", "==", slug));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }

        const videoDoc = querySnapshot.docs[0];
        const data = videoDoc.data();
        return {
            ...data,
            id: videoDoc.id,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        } as Video;
    } catch (error) {
        console.error("Error fetching video:", error);
        return null;
    }
}

export async function getVideos(): Promise<Video[]> {
    try {
        const videosCol = collection(db, 'videos');
        const q = query(videosCol, orderBy('createdAt', 'desc'));
        const videosSnapshot = await getDocs(q);
        return videosSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            } as Video
        });
    } catch (error) {
        console.error("Error fetching videos:", error);
        return [];
    }
}

export async function getProducts(): Promise<Product[]> {
    try {
        const productsCol = collection(db, 'products');
        const q = query(productsCol, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            } as Product;
        });
    } catch (error) {
        console.error("Error fetching products:", error);
        return [];
    }
}

export async function getProduct(productId: string): Promise<Product | null> {
    if (!productId) return null;
    try {
        const docRef = doc(db, 'products', productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            } as Product;
        }
        return null;
    } catch (error) {
        console.error("Error fetching product:", error);
        return null;
    }
}

export async function getProductReviews(productId: string): Promise<Review[]> {
    if (!productId) return [];
    try {
        const reviewsQuery = query(
            collection(db, "reviews"),
            where("productId", "==", productId),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(reviewsQuery);
        if (snapshot.empty) return [];
        
        const reviewsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
        
        const userIds = [...new Set(reviewsData.map(r => r.userId))];
        if (userIds.length === 0) return reviewsData;

        const usersQuery = query(collection(db, "users"), where(documentId(), "in", userIds.slice(0, 30)));
        const usersSnapshot = await getDocs(usersQuery);
        const usersMap = new Map<string, UserProfile>();
        usersSnapshot.forEach(doc => usersMap.set(doc.id, { uid: doc.id, ...doc.data() } as UserProfile));
        
        return reviewsData.map(review => ({
            ...review,
            author: usersMap.get(review.userId)
        }));

    } catch (error) {
        console.error("Error fetching reviews:", error);
        return [];
    }
}
