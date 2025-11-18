
import { db } from "@/lib/firebase";
import { UserProfile, Connection } from "@/lib/types";
import { collection, query, where, getDocs, documentId } from "firebase/firestore";
import { notFound } from "next/navigation";
import { ConnectionsClient } from "@/components/profile/connections-client";

async function getProfile(username: string): Promise<UserProfile | null> {
  if (!username) return null;
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("username", "==", username));
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
  } as UserProfile;
}

async function getConnections(userId: string): Promise<UserProfile[]> {
    const connectionsRef = collection(db, 'users', userId, 'connections');
    const q = query(connectionsRef, where('status', '==', 'connected'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return [];
    }

    const connectionIds = snapshot.docs.map(doc => doc.id);
    
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, where(documentId(), 'in', connectionIds));
    const usersSnapshot = await getDocs(usersQuery);

    return usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            uid: doc.id,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        } as UserProfile;
    });
}


export default async function ConnectionsPage({ params }: { params: { username: string } }) {
    const profile = await getProfile(params.username);
    if (!profile) {
      notFound();
    }
    
    const connections = await getConnections(profile.uid);
  
    return <ConnectionsClient profile={profile} connections={connections} />;
}


export async function generateStaticParams() {
    try {
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
    } catch (error) {
        console.error("Error generating static params for connections page:", error);
        return [];
    }
}


