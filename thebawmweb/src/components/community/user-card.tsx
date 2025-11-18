
"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserProfile } from "@/lib/types";
import { ConnectButton } from "./connect-button";
import { UserTypeIcon } from "../user-type-icon";


type UserCardProps = {
  user: UserProfile;
};

export function UserCard({ user }: UserCardProps) {
  return (
    <Card className="flex flex-col items-center p-6 text-center">
      <Link href={`/profile/${user.username}`}>
        <Avatar className="w-24 h-24 mb-4">
          <AvatarImage src={user.profilePictureUrl || undefined} alt={user.displayName} />
          <AvatarFallback>{user.displayName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      </Link>
      <Link href={`/profile/${user.username}`} className="hover:underline">
        <div className="flex items-center justify-center gap-2">
            <h3 className="font-bold text-lg">{user.displayName}</h3>
            <UserTypeIcon userType={user.userType} />
        </div>
      </Link>
      <p className="text-sm text-muted-foreground mb-4">@{user.username}</p>
      <ConnectButton targetUserId={user.uid} />
    </Card>
  );
}
