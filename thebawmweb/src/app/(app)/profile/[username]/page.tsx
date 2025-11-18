

import { collection, getDocs, query, where, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post, UserProfile } from '@/lib/types';
import { ProfilePostsClient } from '@/components/profile/profile-posts-client';


async function getUser(username: string): Promise<UserProfile | null> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', username));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return null;
  }
  const userDoc = querySnapshot.docs[0];
  const data = userDoc.data();
  return {
    ...data,
    uid: userDoc.id,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
    dob: data.dob?.toDate ? data.dob.toDate().toISOString() : null,
  } as UserProfile;
}

async function getPosts(user: UserProfile): Promise<Post[]> {
  const postsRef = collection(db, 'usersPost');
  const q = query(postsRef, where('authorId', '==', user.uid));
  const querySnapshot = await getDocs(q);
  
  const posts = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        authorId: data.authorId,
        text: data.text,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        likes: data.likes || [],
        viewCount: data.viewCount || 0,
        shareCount: data.shareCount || 0,
        commentCount: data.commentCount || 0,
        author: user,
        postType: 'user',
      }
  }) as Post[];
  
  return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}


export default async function ProfilePostsPage({ params }: { params: { username: string } }) {
  const user = await getUser(params.username);
  
  if (!user) {
    return <div className="text-center py-10">User not found</div>;
  }

  const posts = await getPosts(user);

  return (
    <ProfilePostsClient profileUser={user} posts={posts} />
  );
}

export async function generateStaticParams() {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    const users = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            uid: doc.id,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        } as UserProfile
    });
  
    return users.filter(user => user.username).map(user => ({
      username: user.username,
    }));
}


