
import { db } from "@/lib/firebase";
import { Lyrics, UserProfile, Comment } from "@/lib/types";
import { collection, doc, getDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { notFound } from "next/navigation";
import { LyricsView } from "@/components/lyrics/lyrics-view";

async function getLyrics(slug: string): Promise<Lyrics | null> {
    try {
        if (!slug) return null;
        const lyricsRef = collection(db, "lyrics");
        const q = query(lyricsRef, where("slug", "==", slug));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }
        
        const lyricDoc = querySnapshot.docs[0];
        const data = lyricDoc.data();
        
        let author: UserProfile | undefined = undefined;
        if (data.authorId) {
            const authorDoc = await getDoc(doc(db, "users", data.authorId));
            if (authorDoc.exists()) {
                const authorData = authorDoc.data();
                author = {
                    ...authorData,
                    uid: authorDoc.id,
                    createdAt: authorData.createdAt?.toDate ? authorData.createdAt.toDate().toISOString() : new Date().toISOString(),
                } as UserProfile;
            }
        }
        
        return {
            ...data,
            id: lyricDoc.id,
            author,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null,
        } as Lyrics;
    } catch (error) {
        console.error("Error fetching lyrics:", error);
        return null;
    }
}

async function getComments(lyricsId: string): Promise<Comment[]> {
    try {
        const commentsCol = collection(db, 'comments');
        const q = query(commentsCol, where('postId', '==', lyricsId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return [];

        const commentData = await Promise.all(snapshot.docs.map(async (commentDoc) => {
            const data = commentDoc.data();
            const authorSnap = await getDoc(doc(db, 'users', data.authorId));
            if (!authorSnap.exists()) return null;
            
            const authorData = authorSnap.data();
            const author: UserProfile = {
                ...authorData,
                uid: authorSnap.id,
                createdAt: authorData.createdAt?.toDate ? authorData.createdAt.toDate().toISOString() : new Date().toISOString(),
            } as UserProfile;

            return {
                ...data,
                id: commentDoc.id,
                author,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            } as Comment
        }));
        
        const filteredComments = commentData.filter((c): c is Comment => c !== null);
        return filteredComments;
    } catch (error) {
        console.error("Error fetching comments:", error);
        
        // Fallback query without ordering if index is missing
        const commentsCol = collection(db, 'comments');
        const q = query(commentsCol, where('postId', '==', lyricsId));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return [];
        const commentData = await Promise.all(snapshot.docs.map(async (commentDoc) => {
             const data = commentDoc.data();
            const authorSnap = await getDoc(doc(db, 'users', data.authorId));
            if (!authorSnap.exists()) return null;
            const authorData = authorSnap.data();
             const author: UserProfile = {
                ...authorData,
                uid: authorSnap.id,
                createdAt: authorData.createdAt?.toDate ? authorData.createdAt.toDate().toISOString() : new Date().toISOString(),
            } as UserProfile;
             return {
                ...data,
                id: commentDoc.id,
                author,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            } as Comment
        }));
        const filteredComments = commentData.filter((c): c is Comment => c !== null);
        return filteredComments.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
}


export default async function LyricsPage({ params }: { params: { slug: string } }) {
    const lyricsData = await getLyrics(params.slug);

    if (!lyricsData) {
        notFound();
    }
    
    const comments = await getComments(lyricsData.id);
    
    return <LyricsView lyricsData={lyricsData} initialComments={comments} />;
}
