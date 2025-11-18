
"use client";

import { PostCard } from '@/components/feed/post-card';
import { CreateUserPost } from '@/components/feed/create-user-post';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import type { Post, UserProfile, PostPermissions } from '@/lib/types';
import { DefaultPostPermissions } from "@/lib/types";
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

type ProfilePostsClientProps = {
    profileUser: UserProfile;
    posts: Post[];
};

async function getPostPermissions(): Promise<PostPermissions> {
    const settingsRef = doc(db, "app_settings", "postPermissions");
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
        return { ...DefaultPostPermissions, ...docSnap.data() } as PostPermissions;
    }
    return DefaultPostPermissions;
}


export function ProfilePostsClient({ profileUser, posts }: ProfilePostsClientProps) {
    const { user: authUser } = useAuth();
    const [permissions, setPermissions] = useState<PostPermissions | null>(null);
    const isOwnProfile = authUser?.uid === profileUser?.uid;

    useEffect(() => {
        getPostPermissions().then(setPermissions);
    }, []);

    if (!permissions) {
        return (
             <div className="flex h-64 items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto">
            {isOwnProfile && (
                <>
                    <CreateUserPost />
                    <Separator className="my-8" />
                </>
            )}
            {posts.length > 0 ? (
                <div className="space-y-4">
                {posts.map(post => (
                    <PostCard key={post.id} post={post} permissions={permissions} />
                ))}
                </div>
            ) : (
                <p className="text-center text-muted-foreground mt-8">This user hasn't posted anything yet.</p>
            )}
        </div>
    );
}
