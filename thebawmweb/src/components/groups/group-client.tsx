

"use client";

import { db } from "@/lib/firebase";
import { GroupInfo, Post, PostPermissions, UserProfile } from "@/lib/types";
import { collection, doc, getDocs, query, where, onSnapshot, getDoc, orderBy } from "firebase/firestore";
import { notFound, useRouter } from "next/navigation";
import { GroupHeader } from "@/components/groups/group-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AboutGroupTab } from "@/components/groups/about-group-tab";
import { GroupSettingsTab } from "@/components/groups/group-settings-tab";
import { GroupMembersTab } from "@/components/groups/group-members-tab";
import { CreateGroupPost } from "@/components/groups/create-group-post";
import { PostCard } from "@/components/feed/post-card";
import { Separator } from "@/components/ui/separator";
import { useState, useCallback, useEffect } from "react";
import { Loader2, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "../ui/card";
import { JoinGroupButton } from "./join-group-button";

type GroupClientProps = {
    initialGroupInfo: GroupInfo;
    initialPosts: Post[];
    initialPermissions: PostPermissions;
}

export function GroupClient({ initialGroupInfo, initialPosts, initialPermissions }: GroupClientProps) {
    const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(initialGroupInfo);
    const [posts, setPosts] = useState<Post[]>(initialPosts);
    const [permissions, setPermissions] = useState<PostPermissions>(initialPermissions);
    const [loading, setLoading] = useState(!initialGroupInfo);
    const { user, userProfile } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!groupInfo) return;

        const groupQuery = query(collection(db, "groups"), where("groupId", "==", groupInfo.groupId));

        const unsubscribe = onSnapshot(groupQuery, (querySnapshot) => {
            if (querySnapshot.empty) {
                notFound();
                return;
            }
            const docSnap = querySnapshot.docs[0];
            const data = docSnap.data();
            const fetchedGroupInfo = {
                ...data,
                id: docSnap.id,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                members: data.members || [],
                admins: data.admins || [],
                pendingMembers: data.pendingMembers || [],
                declinedMembers: data.declinedMembers || {},
            } as GroupInfo;
            setGroupInfo(fetchedGroupInfo);
            setLoading(false);
        }, (error) => {
            console.error("Failed to subscribe to group data:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [groupInfo?.groupId]);

    useEffect(() => {
        if (!groupInfo) return;
    
        const postsQuery = query(
            collection(db, 'groupPost'),
            where('groupId', '==', groupInfo.id),
            orderBy('createdAt', 'desc')
        );
    
        const unsubscribe = onSnapshot(postsQuery, async (snapshot) => {
            const newPosts = await Promise.all(snapshot.docs.map(async (postDoc) => {
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
                    postType: 'group',
                } as Post;
            }));
            setPosts(newPosts.filter((p): p is Post => p !== null));
        }, (error) => {
            console.error("Error fetching realtime posts:", error);
            // Fallback for missing index
             const fallbackQuery = query(collection(db, 'groupPost'), where('groupId', '==', groupInfo.id));
             const unsubscribeFallback = onSnapshot(fallbackQuery, async (snapshot) => {
                 const newPosts = await Promise.all(snapshot.docs.map(async (postDoc) => {
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
                        postType: 'group',
                    } as Post;
                }));
                const filteredPosts = newPosts.filter((p): p is Post => p !== null);
                setPosts(filteredPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
             });
             return () => unsubscribeFallback();
        });
    
        return () => unsubscribe();
    }, [groupInfo?.id]);


    if (loading) {
         return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!groupInfo) {
        // This case should be handled by the notFound in the subscription, but as a fallback:
        notFound();
        return null;
    }
    
    const isOwner = groupInfo.ownerId === user?.uid;
    const isSiteAdmin = userProfile?.userType === 'Admin';
    const isMember = groupInfo.members.includes(user?.uid || '');
    
    const hasPostingRights = Array.isArray(groupInfo.posters) ? groupInfo.posters.includes(user?.uid || '') : (groupInfo.posters === 'members' && isMember);
    const canPost = isOwner || isSiteAdmin || hasPostingRights;
    
    const canViewContent = groupInfo.groupType === 'public' || isMember || isOwner || isSiteAdmin;
    
    const canViewSettings = isOwner || isSiteAdmin;
    const canViewMembers = canViewContent;

    return (
        <div className="flex flex-col">
            <GroupHeader group={groupInfo} />
            <div className="container mx-auto px-4 py-8">
                <Tabs defaultValue="posts" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="posts">Posts</TabsTrigger>
                        <TabsTrigger value="about">About</TabsTrigger>
                        {canViewMembers && <TabsTrigger value="members">Members</TabsTrigger>}
                        {canViewSettings && <TabsTrigger value="settings">Settings</TabsTrigger>}
                    </TabsList>

                    <TabsContent value="about">
                       <AboutGroupTab group={groupInfo} />
                    </TabsContent>

                    {canViewContent ? (
                        <>
                            <TabsContent value="posts">
                                <div className="max-w-2xl mx-auto">
                                    {canPost && <CreateGroupPost groupId={groupInfo.id} groupInfo={groupInfo} />}
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
                            </TabsContent>

                             {canViewMembers && (
                                <TabsContent value="members">
                                    <GroupMembersTab group={groupInfo} />
                                </TabsContent>
                             )}
                            {canViewSettings && (
                                <TabsContent value="settings">
                                    <GroupSettingsTab group={groupInfo} onGroupUpdate={() => {}} />
                                </TabsContent>
                            )}
                        </>
                    ) : (
                         <TabsContent value="posts">
                            <Card className="max-w-2xl mx-auto">
                                <CardContent className="py-16 text-center">
                                    <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold">This Group is Private</h3>
                                    <p className="text-muted-foreground mt-2 mb-6">Request to join this group to see its posts and members.</p>
                                    <div className="max-w-xs mx-auto">
                                        <JoinGroupButton group={groupInfo} />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </div>
    );
}
