
import { db } from "@/lib/firebase";
import { EventInfo, Post, UserProfile, PostPermissions, DefaultPostPermissions } from "@/lib/types";
import { collection, doc, getDoc, getDocs, query, where, orderBy, documentId, Timestamp } from "firebase/firestore";
import { notFound } from "next/navigation";
import { EventClient } from "@/components/events/event-client";

async function getEventInfo(eventId: string): Promise<EventInfo | null> {
    if (!eventId) return null;
    const eventsRef = collection(db, "events");
    const q = query(eventsRef, where("eventId", "==", eventId));
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
            } else if (typeof timestamp === 'object' && timestamp.seconds) { // Handle unconverted Timestamps
                declinedParticipants[userId] = new Date(timestamp.seconds * 1000).toISOString();
            }
             else {
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
        declinedParticipants: declinedParticipants,
    } as EventInfo;
}

async function getEventPosts(eventId: string, postCollection: 'eventsPost' | 'eventAnnouncementPosts'): Promise<Post[]> {
  try {
    const postsCol = collection(db, postCollection);
    const q = query(postsCol, where('eventId', '==', eventId), orderBy('createdAt', 'desc'));
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
            postType: postCollection === 'eventsPost' ? 'event' : 'event_announcement',
        } as Post;
    }));

    return postsList.filter((p): p is Post => p !== null);
  } catch (error) {
    console.error(`Error fetching posts from ${postCollection}:`, error);
    // If it fails because of an index, try again without ordering
    try {
        const postsCol = collection(db, postCollection);
        const q = query(postsCol, where('eventId', '==', eventId));
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
                postType: postCollection === 'eventsPost' ? 'event' : 'event_announcement',
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

export default async function EventDetailPage({ params }: { params: { eventId: string } }) {
    const eventData = await getEventInfo(params.eventId);

    if (!eventData) {
        notFound();
    }
    
    const [postsData, announcementsData, permsData] = await Promise.all([
        getEventPosts(eventData.id, 'eventsPost'),
        getEventPosts(eventData.id, 'eventAnnouncementPosts'),
        getPostPermissions()
    ]);
    
    return <EventClient initialEventInfo={eventData} initialPosts={postsData} initialAnnouncements={announcementsData} initialPermissions={permsData} />;
}
