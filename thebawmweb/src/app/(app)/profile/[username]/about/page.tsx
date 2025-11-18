
import { db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";
import { collection, query, where, getDocs } from "firebase/firestore";
import { notFound } from "next/navigation";
import { AboutClient } from "@/components/profile/about-client";

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
    dob: data.dob || null,
  } as UserProfile;
}

export default async function AboutPage({ params }: { params: { username: string } }) {
    const profile = await getProfile(params.username);
    if (!profile) {
      notFound();
    }
  
    return <AboutClient profile={profile} />;
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
        console.error("Error generating static params for about page:", error);
        return [];
    }
}

