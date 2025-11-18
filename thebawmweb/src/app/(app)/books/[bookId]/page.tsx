
import { db } from "@/lib/firebase";
import { Publication, UserProfile, PublicationPage } from "@/lib/types";
import { collection, doc, getDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { notFound } from "next/navigation";
import { BookReader } from "@/components/books/book-reader";

async function getBook(bookId: string): Promise<Publication | null> {
    try {
        if (!bookId) return null;
        const booksRef = collection(db, "publications");
        const q = query(booksRef, where("bookId", "==", bookId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }
        
        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();

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

        const pagesQuery = query(collection(db, `publications/${docSnap.id}/pages`), orderBy('order'));
        const pagesSnapshot = await getDocs(pagesQuery);
        const pages = pagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicationPage));

        return {
            ...data,
            id: docSnap.id,
            author,
            pages,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            publishDate: data.publishDate?.toDate ? data.publishDate.toDate().toISOString() : null,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null,
        } as Publication;
    } catch (error) {
        console.error("Error fetching book:", error);
        return null;
    }
}

export default async function BookPage({ params }: { params: { bookId: string } }) {
    const bookData = await getBook(params.bookId);

    if (!bookData) {
        notFound();
    }
    
    return <BookReader book={bookData} author={bookData.author || null} />;
}
