
import { db } from "@/lib/firebase";
import { QuizInfo, Post, UserProfile, PostPermissions, DefaultPostPermissions, QuizQuestion } from "@/lib/types";
import { collection, doc, getDoc, getDocs, query, where, orderBy, documentId, Timestamp } from "firebase/firestore";
import { notFound } from "next/navigation";
import { QuizClient } from "@/components/quizzes/quiz-client";

async function getQuizInfo(quizIdSlug: string): Promise<QuizInfo | null> {
    if (!quizIdSlug) return null;
    const quizzesRef = collection(db, "quizzes");
    const q = query(quizzesRef, where("quizId", "==", quizIdSlug));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null;
    }
    
    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data();

    const declinedParticipants: Record<string, any> = {};
    if (data.declinedParticipants) {
        for (const userId in data.declinedParticipants) {
            const timestamp = data.declinedParticipants[userId];
            if (timestamp instanceof Timestamp) {
                declinedParticipants[userId] = timestamp.toDate().toISOString();
            } else {
                declinedParticipants[userId] = timestamp;
            }
        }
    }


    return {
        ...data,
        id: docSnap.id,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : new Date().toISOString(),
        endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : new Date().toISOString(),
        participants: data.participants || [],
        admins: data.admins || [],
        pendingParticipants: data.pendingParticipants || [],
        declinedParticipants: declinedParticipants,
    } as QuizInfo;
}

async function getQuizPosts(quizId: string, postCollection: 'quizzesPost' | 'quizAnnouncementPosts'): Promise<Post[]> {
  try {
    const postsCol = collection(db, postCollection);
    const q = query(postsCol, where('quizId', '==', quizId), orderBy('createdAt', 'desc'));
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
            postType: postCollection === 'quizzesPost' ? 'quiz' : 'quiz_announcement',
        } as Post;
    }));

    return postsList.filter((p): p is Post => p !== null);
  } catch (error) {
    console.error(`Error fetching posts from ${postCollection}:`, error);
    try {
        const postsCol = collection(db, postCollection);
        const q = query(postsCol, where('quizId', '==', quizId));
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
                postType: postCollection === 'quizzesPost' ? 'quiz' : 'quiz_announcement',
            } as Post;
        }));

        const filteredPosts = postsList.filter((p): p is Post => p !== null);
        return filteredPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    } catch (finalError) {
         console.error(`Final error fetching posts from ${postCollection}:`, finalError);
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

async function getQuizQuestions(quizId: string): Promise<QuizQuestion[]> {
    const questionsRef = collection(db, 'quizzes', quizId, 'questions');
    const q = query(questionsRef, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        } as QuizQuestion
    });
}

export default async function QuizDetailPage({ params }: { params: { quizId: string } }) {
    const quizData = await getQuizInfo(params.quizId);

    if (!quizData) {
        notFound();
    }
    
    const [postsData, announcementsData, permsData, questionsData] = await Promise.all([
        getQuizPosts(quizData.id, 'quizzesPost'),
        getQuizPosts(quizData.id, 'quizAnnouncementPosts'),
        getPostPermissions(),
        getQuizQuestions(quizData.id),
    ]);
    
    return <QuizClient 
        initialQuizInfo={quizData} 
        initialPosts={postsData} 
        initialAnnouncements={announcementsData} 
        initialPermissions={permsData} 
        initialQuestions={questionsData}
    />;
}
