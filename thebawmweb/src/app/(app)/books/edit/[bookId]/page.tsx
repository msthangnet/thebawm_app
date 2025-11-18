
"use client";

import { BookForm } from "@/components/books/create-book-form";
import { useAuth } from "@/hooks/use-auth";
import { Publication, PublicationPage } from "@/lib/types";
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function EditBookPage() {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const bookId = params.bookId as string;
    const [bookData, setBookData] = useState<Publication | null>(null);
    const [loadingBook, setLoadingBook] = useState(true);

    useEffect(() => {
        if (!bookId) return;

        const fetchBook = async () => {
            const bookRef = doc(db, 'publications', bookId);
            const bookSnap = await getDoc(bookRef);

            if (bookSnap.exists()) {
                const data = bookSnap.data() as Publication;
                if (data.authorId === user?.uid || userProfile?.userType === 'Admin') {
                    
                    const pagesQuery = query(collection(db, `publications/${bookSnap.id}/pages`), orderBy('order'));
                    const pagesSnapshot = await getDocs(pagesQuery);
                    const pages = pagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicationPage));

                    setBookData({ ...data, id: bookSnap.id, pages });

                } else {
                    // User does not have permission
                    router.replace('/books');
                }
            } else {
                // Book not found
                router.replace('/books');
            }
            setLoadingBook(false);
        };

        if (!loading && user) {
            fetchBook();
        } else if (!loading && !user) {
            router.replace('/login');
        }

    }, [bookId, user, userProfile, loading, router]);


    if (loading || loadingBook) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!bookData) {
        return <p>Book not found or you don't have permission to edit it.</p>
    }

    return (
        <div className="max-w-4xl mx-auto">
            <BookForm existingBookData={bookData} />
        </div>
    );
}
