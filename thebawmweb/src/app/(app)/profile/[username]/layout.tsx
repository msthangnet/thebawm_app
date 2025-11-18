
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { ProfileHeader } from "@/components/profile/profile-header";
import React, { ReactNode } from "react";
import { notFound } from 'next/navigation';

async function getProfile(username: string): Promise<UserProfile | null> {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("username", "==", username));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const userDoc = querySnapshot.docs[0];
  const data = userDoc.data();
  
  const fetchedProfile: UserProfile = {
    ...data,
    uid: userDoc.id,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
    dob: data.dob?.toDate ? data.dob.toDate().toISOString() : null,
  } as UserProfile;
  
  return fetchedProfile;
}


export default async function ProfileLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { username: string };
}) {
  const profile = await getProfile(params.username);

  if (!profile) {
    notFound();
  }
  
  return (
    <div>
      <ProfileHeader profile={profile} />
      <div className="container mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  );
}
