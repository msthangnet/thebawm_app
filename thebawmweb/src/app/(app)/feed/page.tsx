
"use client";

import { CreateUserPost } from "@/components/feed/create-user-post";
import { PostCard } from "@/components/feed/post-card";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query, doc, getDoc, where, documentId, collectionGroup, limit, onSnapshot } from "firebase/firestore";
import type { Post, UserProfile, PostPermissions, PageInfo, GroupInfo, EventInfo, QuizInfo } from "@/lib/types";
import { DefaultPostPermissions } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";


async function getPostPermissions(): Promise<PostPermissions> {
    const settingsRef = doc(db, "app_settings", "postPermissions");
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            ...DefaultPostPermissions,
            ...data,
            imageUploadLimit: {
                ...DefaultPostPermissions.imageUploadLimit,
                ...(data.imageUploadLimit || {})
            },
         } as PostPermissions
    }
    return DefaultPostPermissions;
}

export default function FeedPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [permissions, setPermissions] = useState<PostPermissions | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    if (!user || !userProfile) {
        setLoadingPosts(false);
        return;
    }

    setLoadingPosts(true);

    const getInitialFeed = async () => {
        try {
            const [
                connectionsSnapshot,
                ownedPagesSnapshot,
                ownedGroupsSnapshot,
                ownedEventsSnapshot,
                ownedQuizzesSnapshot,
                followedPages,
                followedGroups,
                participatedEvents,
                participatedQuizzes,
            ] = await Promise.all([
                getDocs(query(collection(db, 'users', user.uid, 'connections'), where('status', '==', 'connected'))),
                getDocs(query(collection(db, 'pages'), where('ownerId', '==', user.uid))),
                getDocs(query(collection(db, 'groups'), where('ownerId', '==', user.uid))),
                getDocs(query(collection(db, 'events'), where('ownerId', '==', user.uid))),
                getDocs(query(collection(db, 'quizzes'), where('ownerId', '==', user.uid))),
                userProfile.followedPages || [],
                userProfile.followedGroups || [],
                userProfile.participatedEvents || [],
                userProfile.participatedQuizzes || [],
            ]);

            const friendIds = connectionsSnapshot.docs.map(doc => doc.id);
            friendIds.push(user.uid);

            const allPageIds = [...new Set([...followedPages, ...ownedPagesSnapshot.docs.map(doc => doc.id)])];
            const allGroupIds = [...new Set([...followedGroups, ...ownedGroupsSnapshot.docs.map(doc => doc.id)])];
            const allEventIds = [...new Set([...participatedEvents, ...ownedEventsSnapshot.docs.map(doc => doc.id)])];
            const allQuizIds = [...new Set([...participatedQuizzes, ...ownedQuizzesSnapshot.docs.map(doc => doc.id)])];

            const postTypes: { name: string, ids: string[], key: string, type: Post['postType'] }[] = [
                { name: 'usersPost', ids: friendIds, key: 'authorId', type: 'user'},
                { name: 'pagesPost', ids: allPageIds, key: 'pageId', type: 'page'},
                { name: 'groupPost', ids: allGroupIds, key: 'groupId', type: 'group'},
                { name: 'eventsPost', ids: allEventIds, key: 'eventId', type: 'event'},
                { name: 'quizzesPost', ids: allQuizIds, key: 'quizId', type: 'quiz'},
            ];
            
            const unsubscribes = postTypes.flatMap(({ name, ids, key, type }) => {
                if (ids.length === 0) return [];
                const q = query(collection(db, name), where(key, 'in', ids.slice(0, 30)));
                return onSnapshot(q, async (snapshot) => {
                    const newPosts = await processSnapshot(snapshot, type);
                    setPosts(prev => {
                        const otherPosts = prev.filter(p => p.postType !== type);
                        const merged = [...otherPosts, ...newPosts];
                        merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                        return merged;
                    });
                     setLoadingPosts(false);
                });
            });

            return () => unsubscribes.forEach(unsub => unsub());

        } catch (error) {
            console.error("Error setting up feed listeners:", error);
            setLoadingPosts(false);
        }
    };

    const processSnapshot = async (snapshot: any, type: Post['postType']) => {
        const postDocs = snapshot.docs.map((d: any) => ({id: d.id, ...d.data()}));
        if (postDocs.length === 0) return [];

        const authorIds = [...new Set(postDocs.map(p => p.authorId).filter(Boolean))];
        const authorsMap = await fetchUsers(authorIds);
        
        const contextIds = postDocs.map((p: any) => p.pageId || p.groupId || p.eventId || p.quizId).filter(Boolean);
        const contextMap = await fetchContext(contextIds, type);

        return postDocs.map((post: any) => {
            const author = authorsMap.get(post.authorId);
            if (!author) return null;

            let source: Post['source'] = { type: 'user' };
            const contextId = post.pageId || post.groupId || post.eventId || post.quizId;
            if(contextId && contextMap.has(contextId)) {
                source = { type: type, id: contextId, name: contextMap.get(contextId)!.name }
            }

            return {
                id: post.id,
                ...post,
                author,
                postType: type,
                source,
                createdAt: post.createdAt?.toDate ? post.createdAt.toDate().toISOString() : new Date().toISOString(),
            } as Post;
        }).filter(Boolean);
    }
    
    const fetchUsers = async (userIds: string[]) => {
        const authorsMap = new Map<string, UserProfile>();
        if(userIds.length > 0) {
            const usersSnapshot = await getDocs(query(collection(db, "users"), where(documentId(), "in", userIds.slice(0,30))));
            usersSnapshot.forEach(userDoc => {
                const userData = userDoc.data() as UserProfile;
                if (userData.userType !== 'Suspended' && userData.userType !== 'Inactive') {
                    authorsMap.set(userDoc.id, {
                        ...userData,
                        uid: userDoc.id,
                        createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate().toISOString() : new Date().toISOString(),
                    });
                }
            });
        }
        return authorsMap;
    }
    
    const fetchContext = async (ids: string[], type: Post['postType']) => {
        const contextMap = new Map<string, {name: string}>();
        if(ids.length === 0) return contextMap;

        let collectionName = '';
        if(type === 'page') collectionName = 'pages';
        if(type === 'group') collectionName = 'groups';
        if(type === 'event') collectionName = 'events';
        if(type === 'quiz') collectionName = 'quizzes';

        if(collectionName) {
            const snapshot = await getDocs(query(collection(db, collectionName), where(documentId(), "in", ids.slice(0,30))));
            snapshot.forEach(doc => {
                contextMap.set(doc.id, { name: doc.data().name });
            });
        }
        return contextMap;
    }

    const unsubscribePromise = getInitialFeed();
    getPostPermissions().then(setPermissions);
    
    return () => {
        unsubscribePromise.then(unsub => unsub && unsub());
    };
  }, [user, userProfile]);

  if (authLoading || loadingPosts || !permissions) {
      return (
          <div className="flex h-screen items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin" />
          </div>
      )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <CreateUserPost />
      <Separator className="my-2" />
       {posts.length > 0 ? (
        <div className="space-y-2">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} permissions={permissions!} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <p>Your feed is empty. Connect with people and follow pages to see what's happening!</p>
        </div>
      )}
    </div>
  );
}
