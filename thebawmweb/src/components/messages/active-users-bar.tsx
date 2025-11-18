
'use client';

import { useMemo } from 'react';
import type { UserProfile, Conversation } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ActiveUsersBarProps {
  friends: UserProfile[];
  currentUser: UserProfile;
  onSelectConversation: (conversation: Conversation) => void;
}

const activeUserIds: string[] = []; // This would come from a presence system like Firestore

export function ActiveUsersBar({
  friends,
  currentUser,
  onSelectConversation,
}: ActiveUsersBarProps) {

  const createPlaceholderConversation = (friend: UserProfile): Conversation => {
    return {
      id: `${currentUser.uid}-${friend.uid}`, // temporary ID
      participants: [currentUser.uid, friend.uid],
      updatedAt: new Date(0).toISOString(),
      unreadCount: {}
    }
  }

  if (friends.length === 0) {
    return (
        <div className="p-4 border-b text-center text-sm text-muted-foreground">
            Connect with people in the <Link href="/community" className="underline text-primary">Community</Link> to start messaging.
        </div>
    )
  }

  return (
    <div className="p-2 border-b bg-background">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 md:gap-4 pb-2">
          {friends.map((friend) => {
            const isActive = activeUserIds.includes(friend.uid);
            const conversation = createPlaceholderConversation(friend);
            return (
              <button
                key={friend.uid}
                className="flex flex-col items-center gap-1 w-12 md:w-14 text-center"
                onClick={() => onSelectConversation(conversation)}
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={friend.profilePictureUrl || undefined} alt={friend.displayName} />
                    <AvatarFallback>{friend.displayName?.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  {isActive && (
                    <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                  )}
                </div>
                <span className="text-xs font-medium truncate w-full">
                  {friend.displayName?.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
