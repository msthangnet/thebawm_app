
"use client";

import { CreateQuizForm } from "@/components/quizzes/create-quiz-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { DefaultQuizCreationPermissions, QuizCreationPermissions } from "@/lib/types";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";


export default function CreateQuizPage() {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const [permissions, setPermissions] = useState<QuizCreationPermissions>(DefaultQuizCreationPermissions);
    const [checkingPerms, setCheckingPerms] = useState(true);

    useEffect(() => {
        if (!loading && user) {
            const permsRef = doc(db, "app_settings", "quizCreationPermissions");
            getDoc(permsRef).then(permsSnap => {
                let permsData = DefaultQuizCreationPermissions;
                if (permsSnap.exists()) {
                    permsData = permsSnap.data() as QuizCreationPermissions;
                    setPermissions(permsData);
                }
                const isAdmin = userProfile?.userType === 'Admin';
                const canCreate = permsData.allowedUserIds.includes(user.uid) || isAdmin;

                if (!canCreate) {
                    router.replace('/quizzes');
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
                    <CardTitle>Create a New Quiz</CardTitle>
                    <CardDescription>Fill out the details below to get your new quiz started.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CreateQuizForm />
                </CardContent>
            </Card>
        </div>
    )
}
