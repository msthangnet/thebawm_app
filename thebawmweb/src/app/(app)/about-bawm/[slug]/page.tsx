
import { db } from "@/lib/firebase";
import { AboutBawm, UserProfile, AboutBawmPage } from "@/lib/types";
import { collection, doc, getDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { notFound } from "next/navigation";
import { AboutBawmReader } from "@/components/about/about-bawm-reader";

async function getAboutBawm(slug: string): Promise<AboutBawm | null> {
    try {
        if (!slug) return null;
        const dataRef = collection(db, "aboutBawm");
        const q = query(dataRef, where("slug", "==", slug));
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

        const pagesQuery = query(collection(db, `aboutBawm/${docSnap.id}/pages`), orderBy('order'));
        const pagesSnapshot = await getDocs(pagesQuery);
        const pages = pagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AboutBawmPage));

        return {
            ...data,
            id: docSnap.id,
            author,
            pages,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            publishDate: data.publishDate?.toDate ? data.publishDate.toDate().toISOString() : null,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null,
        } as AboutBawm;
    } catch (error) {
        console.error("Error fetching About BAWM content:", error);
        return null;
    }
}

export default async function AboutBawmPage({ params }: { params: { slug: string } }) {
    const data = await getAboutBawm(params.slug);

    if (!data) {
        notFound();
    }
    
    return <AboutBawmReader data={data} author={data.author || null} />;
}
