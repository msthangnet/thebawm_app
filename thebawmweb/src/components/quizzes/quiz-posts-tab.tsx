
"use client";

import { CreateQuizPost } from "./create-quiz-post";
import { PostCard } from "@/components/feed/post-card";
import { Separator } from "@/components/ui/separator";
import { QuizInfo, Post, PostPermissions, UserProfile } from "@/lib/types";
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from "@/lib/firebase";

type QuizPostsTabProps = {
    quiz: QuizInfo;
    initialPosts: Post[];
    permissions: PostPermissions;
    canPost: boolean;
};

export function QuizPostsTab({ quiz, initialPosts, permissions, canPost }: QuizPostsTabProps) {
    const [posts, setPosts] = useState<Post[]>(initialPosts);
    
    useEffect(() => {
        const postsQuery = query(
            collection(db, 'quizzesPost'),
            where('quizId', '==', quiz.id),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(postsQuery, async (snapshot) => {
            const newPosts = await Promise.all(snapshot.docs.map(async (postDoc) => {
                const postData = postDoc.data();
                if (!postData.authorId) return null;

                const userDoc = await getDoc(doc(db, "users", postData.authorId));
                if (!userDoc.exists()) return null;

                const author = { ...userDoc.data(), uid: userDoc.id } as UserProfile;

                return {
                    id: postDoc.id,
                    ...postData,
                    createdAt: postData.createdAt?.toDate ? postData.createdAt.toDate().toISOString() : new Date().toISOString(),
                    author: author,
                    postType: 'quiz',
                } as Post;
            }));
            setPosts(newPosts.filter((p): p is Post => p !== null));
        }, (error) => {
            console.error("Error fetching realtime posts:", error);
            // Fallback for missing index
            const fallbackQuery = query(collection(db, 'quizzesPost'), where('quizId', '==', quiz.id));
            const unsubscribeFallback = onSnapshot(fallbackQuery, async (snapshot) => {
                 const newPosts = await Promise.all(snapshot.docs.map(async (postDoc) => {
                    const postData = postDoc.data();
                    if (!postData.authorId) return null;
                    const userDoc = await getDoc(doc(db, "users", postData.authorId));
                    if (!userDoc.exists()) return null;
                    const author = { ...userDoc.data(), uid: userDoc.id } as UserProfile;
                    return {
                        id: postDoc.id,
                        ...postData,
                        createdAt: postData.createdAt?.toDate ? postData.createdAt.toDate().toISOString() : new Date().toISOString(),
                        author: author,
                        postType: 'quiz',
                    } as Post;
                }));
                const filteredPosts = newPosts.filter((p): p is Post => p !== null);
                setPosts(filteredPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            });
            return () => unsubscribeFallback();
        });

        return () => unsubscribe();
    }, [quiz.id]);

    return (
        <div className="max-w-2xl mx-auto">
            {canPost && <CreateQuizPost quiz={quiz} postType="quiz" />}
            <Separator className="my-8" />
            {posts.length > 0 ? (
                <div className="space-y-4">
                    {posts.map((post) => (
                        <PostCard key={post.id} post={post} permissions={permissions} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 text-muted-foreground">
                    <p>No posts yet. {canPost ? "Be the first to share something!" : ""}</p>
                </div>
            )}
        </div>
    );
}
