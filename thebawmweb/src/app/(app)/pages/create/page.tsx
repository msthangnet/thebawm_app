
"use client";

import { CreatePageForm } from "@/components/pages/create-page-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { DefaultPageCreationPermissions, PageCreationPermissions } from "@/lib/types";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";


export default function CreatePage() {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const [permissions, setPermissions] = useState<PageCreationPermissions>(DefaultPageCreationPermissions);
    const [checkingPerms, setCheckingPerms] = useState(true);

    useEffect(() => {
        if (!loading && user) {
            const permsRef = doc(db, "app_settings", "pageCreationPermissions");
            getDoc(permsRef).then(permsSnap => {
                if (permsSnap.exists()) {
                    const permsData = permsSnap.data() as PageCreationPermissions;
                    setPermissions(permsData);
                    const isAdmin = userProfile?.userType === 'Admin';
                    const canCreate = permsData.allowedUserIds.includes(user.uid) || isAdmin;
                    if (!canCreate) {
                        router.replace('/pages');
                    }
                } else if (userProfile?.userType !== 'Admin') {
                     router.replace('/pages');
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
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Create a New Page</CardTitle>
                    <CardDescription>Fill out the details below to get your new page up and running.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CreatePageForm />
                </CardContent>
            </Card>
        </div>
    )
}
