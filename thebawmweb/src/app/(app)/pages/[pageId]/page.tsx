

import { db } from "@/lib/firebase";
import { PageInfo, Post, UserProfile, PostPermissions, DefaultPostPermissions } from "@/lib/types";
import { collection, doc, getDoc, getDocs, query, where, orderBy, documentId } from "firebase/firestore";
import { notFound } from "next/navigation";
import { PageClient } from "@/components/pages/page-client";

async function getPageInfo(pageId: string): Promise<PageInfo | null> {
    if (!pageId) return null;
    const pagesRef = collection(db, "pages");
    const q = query(pagesRef, where("pageId", "==", pageId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null;
    }
    
    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data();
    return {
        ...data,
        id: docSnap.id,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        posters: data.posters || [], // Ensure posters is an array
        likes: data.likes || [],
        followers: data.followers || [],
        bannedUsers: data.bannedUsers || [],
    } as PageInfo;
}

async function getPagePosts(pageId: string): Promise<Post[]> {
  try {
    const postsCol = collection(db, 'pagesPost');
    const q = query(postsCol, where('pageId', '==', pageId));
    const postsSnapshot = await getDocs(q);

    if (postsSnapshot.empty) {
      return [];
    }

    const rawPosts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const authorIds = [...new Set(rawPosts.map(post => post.authorId).filter(id => id))];
    
    if (authorIds.length === 0) {
      return [];
    }

    const usersRef = collection(db, "users");
    const usersQuery = query(usersRef, where(documentId(), "in", authorIds.slice(0, 30)));
    const usersSnapshot = await getDocs(usersQuery);
    
    const authorsMap = new Map<string, UserProfile>();
    usersSnapshot.forEach(userDoc => {
      const userData = userDoc.data();
      authorsMap.set(userDoc.id, {
        ...(userData as UserProfile),
        uid: userDoc.id,
        createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate().toISOString() : new Date().toISOString(),
      });
    });
    
    const postsList: Post[] = rawPosts.map(post => {
      const author = authorsMap.get(post.authorId);
      if (!author) return null;

      return {
        id: post.id,
        authorId: post.authorId,
        pageId: post.pageId,
        text: post.text,
        mediaUrl: post.mediaUrl,
        mediaType: post.mediaType,
        createdAt: post.createdAt?.toDate ? post.createdAt.toDate().toISOString() : new Date().toISOString(),
        likes: post.likes || [],
        viewCount: post.viewCount || 0,
        shareCount: post.shareCount || 0,
        commentCount: post.commentCount || 0,
        author: author,
        postType: 'page',
      };
    }).filter((p): p is Post => p !== null);

    return postsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error fetching page posts:", error);
    return [];
  }
}

async function getPostPermissions(): Promise<PostPermissions> {
    const settingsRef = doc(db, "app_settings", "postPermissions");
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
        return { ...DefaultPostPermissions, ...docSnap.data() } as PostPermissions;
    }
    return DefaultPostPermissions;
}

export default async function PageDetailPage({ params }: { params: { pageId: string } }) {
    const pageData = await getPageInfo(params.pageId);

    if (!pageData) {
        notFound();
    }
    
    const [postData, permsData] = await Promise.all([
        getPagePosts(pageData.id),
        getPostPermissions()
    ]);
    
    return <PageClient initialPageInfo={pageData} initialPosts={postData} initialPermissions={permsData} />;
}
