
"use client";

import { AboutBawmForm } from "@/components/about/about-bawm-form";
import { useAuth } from "@/hooks/use-auth";
import { DefaultAboutBawmCreationPermissions, AboutBawmCreationPermissions } from "@/lib/types";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";


export default function CreateAboutBawmPage() {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const [permissions, setPermissions] = useState<AboutBawmCreationPermissions>(DefaultAboutBawmCreationPermissions);
    const [checkingPerms, setCheckingPerms] = useState(true);

    useEffect(() => {
        if (!loading && user) {
            const permsRef = doc(db, "app_settings", "aboutBawmCreationPermissions");
            getDoc(permsRef).then(permsSnap => {
                let permsData = DefaultAboutBawmCreationPermissions;
                if (permsSnap.exists()) {
                    permsData = permsSnap.data() as AboutBawmCreationPermissions;
                    setPermissions(permsData);
                }
                const isAdmin = userProfile?.userType === 'Admin';
                const canCreate = permsData.allowedUserIds.includes(user.uid) || isAdmin;

                if (!canCreate) {
                    router.replace('/about-bawm');
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
            <AboutBawmForm />
        </div>
    )
}

    