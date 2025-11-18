
"use client";

import { AboutBawmForm } from "@/components/about/about-bawm-form";
import { useAuth } from "@/hooks/use-auth";
import { AboutBawm, AboutBawmPage } from "@/lib/types";
import { doc, getDoc, collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function EditAboutBawmPage() {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;
    const [existingData, setExistingData] = useState<AboutBawm | null>(null);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (!slug) return;

        const fetchData = async () => {
            const dataQuery = query(collection(db, 'aboutBawm'), where("slug", "==", slug));
            const querySnapshot = await getDocs(dataQuery);


            if (!querySnapshot.empty) {
                const docSnap = querySnapshot.docs[0];
                const data = docSnap.data() as AboutBawm;

                if (data.authorId === user?.uid || userProfile?.userType === 'Admin') {
                    
                    const pagesQuery = query(collection(db, `aboutBawm/${docSnap.id}/pages`), orderBy('order'));
                    const pagesSnapshot = await getDocs(pagesQuery);
                    const pages = pagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AboutBawmPage));

                    setExistingData({ ...data, id: docSnap.id, pages });

                } else {
                    router.replace('/about-bawm');
                }
            } else {
                router.replace('/about-bawm');
            }
            setLoadingData(false);
        };

        if (!loading && user) {
            fetchData();
        } else if (!loading && !user) {
            router.replace('/login');
        }

    }, [slug, user, userProfile, loading, router]);


    if (loading || loadingData) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!existingData) {
        return <p>Content not found or you don't have permission to edit it.</p>
    }

    return (
        <div className="max-w-4xl mx-auto">
            <AboutBawmForm existingData={existingData} />
        </div>
    );
}

    