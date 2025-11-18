
"use client";

import { UserProfile } from "@/lib/types";
import { UserCard } from "@/components/community/user-card";
import { useAuth } from "@/hooks/use-auth";

type CommunityClientProps = {
  users: UserProfile[];
};

export function CommunityClient({ users }: CommunityClientProps) {
  const { user: currentUser } = useAuth();
  
  const otherUsers = users.filter(u => u.uid !== currentUser?.uid);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {otherUsers.map((user) => (
          <UserCard key={user.uid} user={user} />
        ))}
        {otherUsers.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center">
              It looks like you're the first one here!
          </p>
        )}
      </div>
    </>
  );
}
