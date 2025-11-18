
"use client";

import { LyricsForm } from "@/components/lyrics/lyrics-form";
import { useAuth } from "@/hooks/use-auth";
import { DefaultLyricsCreationPermissions, LyricsCreationPermissions } from "@/lib/types";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";


export default function CreateLyricsPage() {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const [permissions, setPermissions] = useState<LyricsCreationPermissions>(DefaultLyricsCreationPermissions);
    const [checkingPerms, setCheckingPerms] = useState(true);

    useEffect(() => {
        if (!loading && user) {
            const permsRef = doc(db, "app_settings", "lyricsCreationPermissions");
            getDoc(permsRef).then(permsSnap => {
                let permsData = DefaultLyricsCreationPermissions;
                if (permsSnap.exists()) {
                    permsData = permsSnap.data() as LyricsCreationPermissions;
                    setPermissions(permsData);
                }
                const isAdmin = userProfile?.userType === 'Admin';
                const canCreate = permsData.allowedUserIds.includes(user.uid) || isAdmin;

                if (!canCreate) {
                    router.replace('/lyrics');
                }
            }).finally(() => setCheckingPerms(false));
        } else if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, userProfile, loading, router]);


    if (loading || checkingPerms) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="max-w-4xl mx-auto">
            <LyricsForm />
        </div>
    )
}
