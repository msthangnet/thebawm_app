
import { db } from "@/lib/firebase";
import { GroupInfo, Post, UserProfile, PostPermissions, DefaultPostPermissions } from "@/lib/types";
import { collection, doc, getDoc, getDocs, query, where, orderBy, documentId, Timestamp } from "firebase/firestore";
import { notFound } from "next/navigation";
import { GroupClient } from "@/components/groups/group-client";

async function getGroupInfo(groupId: string): Promise<GroupInfo | null> {
    if (!groupId) return null;
    const groupsRef = collection(db, "groups");
    const q = query(groupsRef, where("groupId", "==", groupId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null;
    }
    
    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data();

    const declinedMembers: Record<string, any> = {};
    if (data.declinedMembers) {
        for (const userId in data.declinedMembers) {
            const timestamp = data.declinedMembers[userId];
            if (timestamp instanceof Timestamp) {
                declinedMembers[userId] = timestamp.toDate().toISOString();
            } else {
                declinedMembers[userId] = timestamp;
            }
        }
    }

    return {
        ...data,
        id: docSnap.id,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        members: data.members || [],
        admins: data.admins || [],
        declinedMembers: declinedMembers,
    } as GroupInfo;
}

async function getGroupPosts(groupId: string): Promise<Post[]> {
  try {
    const postsCol = collection(db, 'groupPost');
    const q = query(postsCol, where('groupId', '==', groupId), orderBy('createdAt', 'desc'));
    const postsSnapshot = await getDocs(q);

    if (postsSnapshot.empty) {
      return [];
    }

    const postsList = await Promise.all(postsSnapshot.docs.map(async (postDoc) => {
        const postData = postDoc.data();
        if (!postData.authorId) return null;

        const userDoc = await getDoc(doc(db, "users", postData.authorId));
        if (!userDoc.exists()) return null;
        
        const authorData = userDoc.data();
        const author = {
            ...authorData,
            uid: userDoc.id,
            createdAt: authorData.createdAt?.toDate ? authorData.createdAt.toDate().toISOString() : new Date().toISOString(),
        } as UserProfile;

        return {
            id: postDoc.id,
            ...postData,
            createdAt: postData.createdAt?.toDate ? postData.createdAt.toDate().toISOString() : new Date().toISOString(),
            author: author,
            postType: 'group',
        } as Post;
    }));

    return postsList.filter((p): p is Post => p !== null);
  } catch (error) {
    console.error("Error fetching group posts:", error);
     try {
        const postsCol = collection(db, 'groupPost');
        const q = query(postsCol, where('groupId', '==', groupId));
        const postsSnapshot = await getDocs(q);

        if (postsSnapshot.empty) {
          return [];
        }
        
        const postsList = await Promise.all(postsSnapshot.docs.map(async (postDoc) => {
            const postData = postDoc.data();
            if (!postData.authorId) return null;

            const userDoc = await getDoc(doc(db, "users", postData.authorId));
            if (!userDoc.exists()) return null;
            
            const authorData = userDoc.data();
            const author = {
                ...authorData,
                uid: userDoc.id,
                createdAt: authorData.createdAt?.toDate ? authorData.createdAt.toDate().toISOString() : new Date().toISOString(),
            } as UserProfile;

            return {
                id: postDoc.id,
                ...postData,
                createdAt: postData.createdAt?.toDate ? postData.createdAt.toDate().toISOString() : new Date().toISOString(),
                author: author,
                postType: 'group',
            } as Post;
        }));

        const filteredPosts = postsList.filter((p): p is Post => p !== null);
        return filteredPosts.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    catch (finalError) {
        console.error("Final error fetching group posts:", finalError);
        return [];
    }
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

export default async function GroupDetailPage({ params }: { params: { groupId: string } }) {
    const groupData = await getGroupInfo(params.groupId);

    if (!groupData) {
        notFound();
    }
    
    const [postData, permsData] = await Promise.all([
        getGroupPosts(groupData.id),
        getPostPermissions()
    ]);
    
    return <GroupClient initialGroupInfo={groupData} initialPosts={postData} initialPermissions={permsData} />;
}
