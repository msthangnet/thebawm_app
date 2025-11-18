import { SettingsForm } from "@/components/profile/settings-form";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/types";

export default function SettingsPage() {
  return <SettingsForm />;
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
