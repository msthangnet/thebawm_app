
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { QuizInfo, QuizCreationPermissions } from "@/lib/types";
import { Loader2, PlusCircle, Settings, Users, Globe, Lock, Calendar, Forward, Play, Trophy, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { DefaultQuizCreationPermissions } from "@/lib/types";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

function QuizCard({ quiz }: { quiz: QuizInfo }) {
    const now = new Date();
    const startDate = quiz.startDate?.toDate ? quiz.startDate.toDate() : new Date();
    const endDate = quiz.endDate?.toDate ? quiz.endDate.toDate() : new Date();

    let status: 'upcoming' | 'ongoing' | 'ended' = 'upcoming';
    let statusText = 'Upcoming';
    let statusColor = 'text-yellow-500';
    let StatusIcon = Calendar;

    if (now > endDate) {
        status = 'ended';
        statusText = 'Quiz Ended';
        statusColor = 'text-red-500';
        StatusIcon = Calendar;
    } else if (now >= startDate && now <= endDate) {
        status = 'ongoing';
        statusText = 'Ongoing';
        statusColor = 'text-green-500';
        StatusIcon = Play;
    } else {
        StatusIcon = Forward;
    }

    return (
        <Card className="flex flex-col text-center">
            <CardHeader className="p-4 items-center">
                <Link href={`/quizzes/${quiz.quizId}`} className="block hover:bg-muted/50 rounded-full p-1">
                    <Avatar className="w-24 h-24 text-2xl">
                        <AvatarImage src={quiz.profilePictureUrl || undefined} alt={quiz.name} />
                        <AvatarFallback>{quiz.name?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </Link>
                 <Link href={`/quizzes/${quiz.quizId}`} className="block mt-2">
                    <p className="font-semibold hover:underline truncate">{quiz.name}</p>
                 </Link>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-grow flex flex-col justify-between space-y-3">
                 <div className="space-y-3">
                    <div className={cn("text-sm font-semibold flex items-center justify-center gap-2", statusColor)}>
                        <StatusIcon className="h-4 w-4" />
                        <span>{statusText}</span>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                        {quiz.quizType === 'private' ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                        <span>{quiz.quizType.charAt(0).toUpperCase() + quiz.quizType.slice(1)}</span>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                        <Users className="h-4 w-4" />
                        <span>{(quiz.participants || []).length} Participants</span>
                    </div>
                 </div>
                 <div className="mt-4">
                    <Button asChild>
                        <Link href={`/quizzes/${quiz.quizId}`}>
                            <Trophy className="mr-2 h-4 w-4"/>
                            View Quiz
                        </Link>
                    </Button>
                 </div>
            </CardContent>
        </Card>
    )
}

export default function QuizzesListPage() {
    const { user, userProfile } = useAuth();
    const [quizzes, setQuizzes] = useState<QuizInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState<QuizCreationPermissions>(DefaultQuizCreationPermissions);
    const [searchTerm, setSearchTerm] = useState("");
    
    useEffect(() => {
        const quizzesRef = collection(db, "quizzes");
        const unsubscribe = onSnapshot(quizzesRef, (querySnapshot) => {
            const fetchedQuizzes = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                } as QuizInfo;
            });
            setQuizzes(fetchedQuizzes);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching quizzes:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            const permsRef = doc(db, "app_settings", "quizCreationPermissions");
            const unsubscribe = onSnapshot(permsRef, (permsSnap) => {
                if (permsSnap.exists()) {
                    setPermissions(permsSnap.data() as QuizCreationPermissions);
                } else {
                    setPermissions(DefaultQuizCreationPermissions);
                }
            });
            return () => unsubscribe();
        }
    }, [user]);

    const isAdmin = userProfile?.userType === 'Admin';
    const canCreateQuiz = user && (permissions.allowedUserIds.includes(user.uid) || isAdmin);

    const filteredQuizzes = quizzes.filter(quiz => 
        quiz.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                <p className="text-[18px] font-bold font-headline flex-1">Quizzes</p>
                <div className="flex w-full md:w-auto items-center gap-2">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            placeholder="Search quizzes..."
                            className="pl-10 bg-background"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canCreateQuiz && (
                        <Button asChild>
                            <Link href="/quizzes/create">
                                <PlusCircle className="mr-1 h-4 w-4"/>
                                Create
                            </Link>
                        </Button>
                    )}
                    {isAdmin && (
                            <Button asChild variant="outline" size="icon">
                            <Link href="/admin/quiz-settings">
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
                ) : filteredQuizzes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredQuizzes.map(quiz => <QuizCard key={quiz.id} quiz={quiz} />)}
                    </div>
                ) : (
                    <div className="text-center py-16 text-muted-foreground">
                        <p>No quizzes found. {canCreateQuiz ? "Be the first to create one!" : ""}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
