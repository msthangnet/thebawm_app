
"use client";

import React, { createContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  refreshUserProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (userToFetch: User) => {
    const userDocRef = doc(db, 'users', userToFetch.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      let profile: UserProfile = {
        ...data,
        uid: userDoc.id,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        dob: data.dob || null,
      } as UserProfile;

      if (!profile.userType) {
        profile.userType = 'Active';
        await updateDoc(userDocRef, { userType: 'Active' });
      }

      setUserProfile(profile);
      return profile;
    } else {
      const [firstName, ...lastNameParts] = (userToFetch.displayName || "").split(" ");
      const newUserProfile: UserProfile = {
        uid: userToFetch.uid,
        username: userToFetch.email?.split('@')[0] || `user_${Date.now()}`,
        displayName: userToFetch.displayName || userToFetch.email?.split('@')[0] || '',
        email: userToFetch.email!,
        firstName: firstName || '',
        lastName: lastNameParts.join(' ') || '',
        createdAt: serverTimestamp(),
        bio: "",
        profilePictureUrl: userToFetch.photoURL || "",
        userType: 'Active',
      };
      await setDoc(userDocRef, newUserProfile);
      // After creating, fetch it again to get a consistent object with serialized timestamp
      const savedDoc = await getDoc(userDocRef);
      const savedData = savedDoc.data()!;
      const finalProfile = {
          ...savedData,
           uid: savedDoc.id,
           createdAt: savedData.createdAt?.toDate ? savedData.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as UserProfile;

      setUserProfile(finalProfile);
      return finalProfile;
    }
  }, []);

  const refreshUserProfile = useCallback(async () => {
    if (user) {
      await fetchUserProfile(user);
    }
  }, [user, fetchUserProfile]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        await fetchUserProfile(user);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserProfile]);

  const value = { user, userProfile, loading, refreshUserProfile };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
