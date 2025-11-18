

"use client";

import { db } from "@/lib/firebase";
import { PageInfo, Post, UserProfile, PostPermissions, DefaultPostPermissions } from "@/lib/types";
import { collection, doc, getDoc, getDocs, query, where, orderBy, documentId, onSnapshot } from "firebase/firestore";
import { notFound, useRouter } from "next/navigation";
import { PageHeader } from "@/components/pages/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AboutPageTab } from "@/components/pages/about-page-tab";
import { PageSettingsTab } from "@/components/pages/page-settings-tab";
import { PageFollowersTab } from "@/components/pages/page-followers-tab";
import { CreatePagePost } from "@/components/feed/create-page-post";
import { PostCard } from "@/components/feed/post-card";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "../ui/card";
import { FollowPageButton } from "./follow-page-button";

type PageClientProps = {
    initialPageInfo: PageInfo;
    initialPosts: Post[];
    initialPermissions: PostPermissions;
}

export function PageClient({ initialPageInfo, initialPosts, initialPermissions }: PageClientProps) {
    const [pageInfo, setPageInfo] = useState<PageInfo | null>(initialPageInfo);
    const [posts, setPosts] = useState<Post[]>(initialPosts);
    const [permissions, setPermissions] = useState<PostPermissions>(initialPermissions);
    const [loading, setLoading] = useState(!initialPageInfo);
    const { user, userProfile } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!pageInfo) return;
        
        const pageQuery = query(collection(db, "pages"), where("pageId", "==", pageInfo.pageId));

        const unsubscribe = onSnapshot(pageQuery, (querySnapshot) => {
            if (querySnapshot.empty) {
                notFound();
                return;
            }
            const docSnap = querySnapshot.docs[0];
            const data = docSnap.data();
            const fetchedPageInfo = {
                ...data,
                id: docSnap.id,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                posters: data.posters || [],
                likes: data.likes || [],
                followers: data.followers || [],
                bannedUsers: data.bannedUsers || [],
            } as PageInfo;
            setPageInfo(fetchedPageInfo);
            setLoading(false);
        }, (error) => {
            console.error("Failed to subscribe to page data:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [pageInfo?.pageId]);

    useEffect(() => {
        if (!pageInfo) return;

        const postsQuery = query(
            collection(db, 'pagesPost'),
            where('pageId', '==', pageInfo.id),
            orderBy('createdAt', 'desc')
        );

        const processSnapshot = async (snapshot: any) => {
            const newPosts = await Promise.all(snapshot.docs.map(async (postDoc: any) => {
                const postData = postDoc.data();
                if (!postData.authorId) return null;

                const userDoc = await getDoc(doc(db, "users", postData.authorId));
                if (!userDoc.exists()) return null;

                const author = { ...userDoc.data(), uid: userDoc.id, createdAt: userDoc.data().createdAt?.toDate ? userDoc.data().createdAt.toDate().toISOString() : new Date().toISOString() } as UserProfile;

                return {
                    id: postDoc.id,
                    ...postData,
                    createdAt: postData.createdAt?.toDate ? postData.createdAt.toDate().toISOString() : new Date().toISOString(),
                    author: author,
                    postType: 'page',
                } as Post;
            }));
            return newPosts.filter((p): p is Post => p !== null);
        };

        const unsubscribe = onSnapshot(postsQuery, async (snapshot) => {
            const fetchedPosts = await processSnapshot(snapshot);
            setPosts(fetchedPosts);
        }, (error) => {
            console.error("Error fetching realtime posts, likely a missing index. Falling back.", error);
             const fallbackQuery = query(collection(db, 'pagesPost'), where('pageId', '==', pageInfo.id));
             const unsubscribeFallback = onSnapshot(fallbackQuery, async (snapshot) => {
                const fetchedPosts = await processSnapshot(snapshot);
                setPosts(fetchedPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
             });
             return () => unsubscribeFallback();
        });

        return () => unsubscribe();
    }, [pageInfo?.id]);

    if (loading) {
         return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!pageInfo) {
        notFound();
        return null;
    }
    
    const isOwner = pageInfo.ownerId === user?.uid;
    const isSiteAdmin = userProfile?.userType === 'Admin';
    const isBanned = pageInfo.bannedUsers?.includes(user?.uid || '');
    
    const hasPostingRights = Array.isArray(pageInfo.posters) && pageInfo.posters.includes(user?.uid || '');
    const canPost = isOwner || isSiteAdmin || hasPostingRights;
    
    const isFollowing = userProfile?.followedPages?.includes(pageInfo.id) || false;
    const canViewContent = !isBanned && (isFollowing || isOwner || isSiteAdmin);
    
    const canViewSettings = isOwner || isSiteAdmin;
    const canViewFollowers = !isBanned && (isOwner || isSiteAdmin || canPost);

    if (isBanned) {
        return (
            <div className="flex flex-col">
                <PageHeader page={pageInfo} />
                 <div className="container mx-auto px-4 py-8">
                     <Tabs defaultValue="about" className="w-full">
                        <TabsList className="mb-4">
                            <TabsTrigger value="about">About</TabsTrigger>
                        </TabsList>
                         <TabsContent value="about">
                           <AboutPageTab page={pageInfo} />
                        </TabsContent>
                        <Card className="mt-4">
                            <CardContent className="py-16 text-center">
                                <Lock className="h-12 w-12 text-destructive mx-auto mb-4" />
                                <h3 className="text-xl font-semibold">You are banned from this page</h3>
                                <p className="text-muted-foreground mt-2">You cannot see content or interact with this page.</p>
                            </CardContent>
                        </Card>
                     </Tabs>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col">
            <PageHeader page={pageInfo} />
            <div className="container mx-auto px-4 py-8">
                <Tabs defaultValue="posts" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="posts">Posts</TabsTrigger>
                        <TabsTrigger value="about">About</TabsTrigger>
                        {canViewFollowers && <TabsTrigger value="followers">Followers</TabsTrigger>}
                        {canViewSettings && <TabsTrigger value="settings">Settings</TabsTrigger>}
                    </TabsList>
                    <TabsContent value="posts">
                        {canViewContent ? (
                             <div className="max-w-2xl mx-auto">
                                {canPost && <CreatePagePost pageId={pageInfo.id} pageInfo={pageInfo} />}
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
                        ) : (
                            <Card className="max-w-2xl mx-auto">
                                <CardContent className="py-16 text-center">
                                    <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold">This Page's Posts Are Private</h3>
                                    <p className="text-muted-foreground mt-2 mb-6">Follow this page to see all of their posts and updates.</p>
                                    <div className="max-w-xs mx-auto">
                                        <FollowPageButton pageId={pageInfo.id} />
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                    <TabsContent value="about">
                       <AboutPageTab page={pageInfo} />
                    </TabsContent>
                     {canViewFollowers && (
                        <TabsContent value="followers">
                            <PageFollowersTab page={pageInfo} />
                        </TabsContent>
                     )}
                    {canViewSettings && (
                        <TabsContent value="settings">
                            <PageSettingsTab page={pageInfo} onPageUpdate={() => {}} />
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </div>
    );
}
