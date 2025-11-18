
"use client";

import { db } from "@/lib/firebase";
import { QuizInfo, Post, PostPermissions, UserProfile, QuizQuestion } from "@/lib/types";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { notFound, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { Loader2, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "../ui/card";
import { ParticipateButton } from "./participate-button";
import { AboutQuizTab } from "./about-quiz-tab";
import { QuizParticipantsTab } from "./quiz-participants-tab";
import { QuizPostsTab } from "./quiz-posts-tab";
import { QuizAnnouncementsTab } from "./quiz-announcements-tab";
import { QuizSettingsTab } from "./quiz-settings-tab";
import { CreateQuestionsTab } from "./create-questions-tab";
import { LeaderboardTab } from "./leaderboard-tab";
import { QuizAttempt } from "./quiz-attempt";
import { QuizHeader } from "./quiz-header";

type QuizClientProps = {
    initialQuizInfo: QuizInfo;
    initialPosts: Post[];
    initialAnnouncements: Post[];
    initialPermissions: PostPermissions;
    initialQuestions: QuizQuestion[];
}

export function QuizClient({ initialQuizInfo, initialPosts, initialAnnouncements, initialPermissions, initialQuestions }: QuizClientProps) {
    const [quizInfo, setQuizInfo] = useState<QuizInfo | null>(initialQuizInfo);
    const [posts, setPosts] = useState<Post[]>(initialPosts);
    const [announcements, setAnnouncements] = useState<Post[]>(initialAnnouncements);
    const [permissions, setPermissions] = useState<PostPermissions>(initialPermissions);
    const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions);
    const [loading, setLoading] = useState(!initialQuizInfo);
    const { user, userProfile } = useAuth();
    const router = useRouter();
    const [isTakingQuiz, setIsTakingQuiz] = useState(false);
    const [activeTab, setActiveTab] = useState("posts");

    useEffect(() => {
        if (!quizInfo) return;

        const quizQuery = query(collection(db, "quizzes"), where("quizId", "==", quizInfo.quizId));

        const unsubscribe = onSnapshot(quizQuery, (querySnapshot) => {
            if (querySnapshot.empty) {
                notFound();
                return;
            }
            const docSnap = querySnapshot.docs[0];
            const data = docSnap.data();
            const fetchedQuizInfo = {
                ...data,
                id: docSnap.id,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : new Date().toISOString(),
                endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : new Date().toISOString(),
                participants: data.participants || [],
                admins: data.admins || [],
                pendingParticipants: data.pendingParticipants || [],
                declinedParticipants: data.declinedParticipants || {},
            } as QuizInfo;
            setQuizInfo(fetchedQuizInfo);
            setLoading(false);
        }, (error) => {
            console.error("Failed to subscribe to quiz data:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [quizInfo?.quizId]);


    if (loading) {
         return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!quizInfo) {
        notFound();
        return null;
    }
    
    if (isTakingQuiz) {
        return <QuizAttempt quiz={quizInfo} questions={questions} onFinish={() => {
            setIsTakingQuiz(false);
            setActiveTab("leaderboard");
        }} />;
    }

    const isOwner = quizInfo.ownerId === user?.uid;
    const isSiteAdmin = userProfile?.userType === 'Admin';
    const isParticipant = quizInfo.participants.includes(user?.uid || '');
    
    const postersSetting = quizInfo.posters || 'admins';
    let canPostInMainFeed = false;
    if (isOwner || isSiteAdmin) {
        canPostInMainFeed = true;
    } else if (postersSetting === 'participants' && isParticipant) {
        canPostInMainFeed = true;
    } else if (Array.isArray(postersSetting)) {
        canPostInMainFeed = postersSetting.includes(user?.uid || '');
    }

    const canPostAnnouncement = isOwner || isSiteAdmin;

    const canViewContent = quizInfo.quizType === 'public' || isParticipant || isOwner || isSiteAdmin;
    
    const canViewSettings = isOwner || isSiteAdmin;
    const canViewParticipants = canViewContent;
    const canCreateQuestions = isOwner || isSiteAdmin;

    return (
        <div className="flex flex-col">
            <QuizHeader quiz={quizInfo} questions={questions} onTakeQuiz={() => setIsTakingQuiz(true)} />
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-8">
                <TabsList className="mb-4 flex-wrap h-auto justify-start">
                    <TabsTrigger value="posts">Posts</TabsTrigger>
                    <TabsTrigger value="announcements">Announcements</TabsTrigger>
                    <TabsTrigger value="about">About</TabsTrigger>
                    {canViewParticipants && <TabsTrigger value="participants">Participants</TabsTrigger>}
                    {canCreateQuestions && <TabsTrigger value="create_questions">Manage Questions</TabsTrigger>}
                    <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                    {canViewSettings && <TabsTrigger value="settings">Settings</TabsTrigger>}
                </TabsList>

                <TabsContent value="about">
                    <AboutQuizTab quiz={quizInfo} />
                </TabsContent>

                {canViewContent ? (
                    <>
                        <TabsContent value="posts">
                            <QuizPostsTab 
                                quiz={quizInfo} 
                                initialPosts={posts} 
                                permissions={permissions} 
                                canPost={canPostInMainFeed}
                            />
                        </TabsContent>
                            <TabsContent value="announcements">
                            <QuizAnnouncementsTab 
                                quiz={quizInfo} 
                                initialPosts={announcements} 
                                permissions={permissions} 
                                canPost={canPostAnnouncement}
                            />
                        </TabsContent>

                            {canViewParticipants && (
                            <TabsContent value="participants">
                                <QuizParticipantsTab quiz={quizInfo} />
                            </TabsContent>
                            )}
                            {canCreateQuestions && (
                            <TabsContent value="create_questions">
                                <CreateQuestionsTab quiz={quizInfo} initialQuestions={questions} />
                            </TabsContent>
                            )}
                        <TabsContent value="leaderboard">
                            <LeaderboardTab quiz={quizInfo} />
                        </TabsContent>
                        {canViewSettings && (
                            <TabsContent value="settings">
                                <QuizSettingsTab quiz={quizInfo} onQuizUpdate={() => router.refresh()} />
                            </TabsContent>
                        )}
                    </>
                ) : (
                        <TabsContent value="posts">
                        <Card className="max-w-2xl mx-auto">
                            <CardContent className="py-16 text-center">
                                <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-xl font-semibold">This Quiz is Private</h3>
                                <p className="text-muted-foreground mt-2 mb-6">Request to participate in this quiz to view its content.</p>
                                <div className="max-w-xs mx-auto">
                                    <ParticipateButton quiz={quizInfo} />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
