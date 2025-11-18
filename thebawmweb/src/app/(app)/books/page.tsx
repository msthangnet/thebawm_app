"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Publication, BookCreationPermissions, UserProfile } from "@/lib/types";
import { Loader2, PlusCircle, Settings, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { DefaultBookCreationPermissions } from "@/lib/types";
import { BookCard } from "@/components/books/book-card";
import { getUser } from "@/services/firestore";
import { Input } from "@/components/ui/input";

export default function BooksListPage() {
    const { user, userProfile } = useAuth();
    const [publications, setPublications] = useState<Publication[]>([]);
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState<BookCreationPermissions>(DefaultBookCreationPermissions);
    const [searchTerm, setSearchTerm] = useState("");
    
    useEffect(() => {
        const publicationsRef = collection(db, "publications");
        const unsubscribe = onSnapshot(publicationsRef, async (querySnapshot) => {
            const fetchedPublicationsPromises = querySnapshot.docs.map(async (docSnapshot) => {
                const data = docSnapshot.data();
                let author: UserProfile | null = null;
                if (data.authorId) {
                    author = await getUser(data.authorId);
                }

                return {
                    ...data,
                    id: docSnapshot.id,
                    author,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                } as Publication;
            });

            const fetchedPublications = await Promise.all(fetchedPublicationsPromises);
            setPublications(fetchedPublications);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching publications:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            const permsRef = doc(db, "app_settings", "bookCreationPermissions");
            const unsubscribe = onSnapshot(permsRef, (permsSnap) => {
                if (permsSnap.exists()) {
                    setPermissions(permsSnap.data() as BookCreationPermissions);
                } else {
                    setPermissions(DefaultBookCreationPermissions);
                }
            });
            return () => unsubscribe();
        }
    }, [user]);

    const isAdmin = userProfile?.userType === 'Admin';
    const canCreateBook = user && (permissions.allowedUserIds.includes(user.uid) || isAdmin);
    
    const filteredPublications = publications.filter(pub =>
        pub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pub.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                <p className="text-[18px] font-bold font-headline flex-1">Books</p>
                <div className="flex w-full md:w-auto items-center gap-2">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            placeholder="Search books..."
                            className="pl-10 bg-background"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canCreateBook && (
                        <Button asChild>
                            <Link href="/books/create">
                                <PlusCircle className="mr-1 h-4 w-4"/>
                                Add book
                            </Link>
                        </Button>
                    )}
                    {isAdmin && (
                            <Button asChild variant="outline" size="icon">
                            <Link href="/admin/book-settings">
                                <Settings className="h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
            <div>
                {loading ? (
                        <div className="flex h-48 items-center justify-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : filteredPublications.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredPublications.map(pub => <BookCard key={pub.id} publication={pub} />)}
                    </div>
                ) : (
                    <div className="text-center py-16 text-muted-foreground">
                        <p>No books have been published yet. {canCreateBook ? "Be the first to create one!" : ""}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
