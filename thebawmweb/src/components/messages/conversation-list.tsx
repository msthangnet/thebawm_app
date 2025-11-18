
'use client';

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { UserProfile, Conversation } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { MessageSettingsSheet } from './message-settings-sheet';
import { ScrollArea } from '../ui/scroll-area';
import { useMemo } from 'react';
import Link from 'next/link';

interface ConversationListProps {
  isCollapsed: boolean;
  conversations: Conversation[];
  selectedConversation?: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  friends: UserProfile[];
}

const activeUserIds: string[] = []; // This would come from a presence system like Firestore

export function ConversationList({
  isCollapsed,
  conversations,
  selectedConversation,
  onSelectConversation,
  currentUser,
  allUsers,
  friends,
}: ConversationListProps) {
  const isAdmin = currentUser.userType === 'Admin';

  const conversationsWithFriends = useMemo(() => {
    const convMap = new Map<string, Conversation>();

    // Map existing conversations by the other user's ID
    conversations.forEach(conv => {
      const otherUserId = conv.participants.find(id => id !== currentUser.uid);
      if (otherUserId) {
        convMap.set(otherUserId, conv);
      }
    });

    // Ensure all friends have a conversation object (real or placeholder)
    friends.forEach(friend => {
        if (!convMap.has(friend.uid)) {
             convMap.set(friend.uid, {
                id: `${currentUser.uid}-${friend.uid}`,
                participants: [currentUser.uid, friend.uid],
                updatedAt: new Date(0).toISOString(), // Sorts them to the bottom
                unreadCount: {}
            });
        }
    });
    
    return Array.from(convMap.values()).sort((a, b) => {
        const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : (a.updatedAt ? new Date(a.updatedAt) : new Date(0));
        const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : (b.updatedAt ? new Date(b.updatedAt) : new Date(0));
        return dateB.getTime() - dateA.getTime();
    });
  }, [conversations, currentUser, friends]);

  return (
    <div className="flex flex-col h-full bg-muted/50">
       <div
          className={cn(
            'flex items-center justify-between p-4 border-b',
            isCollapsed && 'justify-center p-2'
          )}
        >
          {!isCollapsed && <h2 className="font-bold text-xl">Chats</h2>}
          {isAdmin && !isCollapsed && <MessageSettingsSheet />}
      </div>
      
      <ScrollArea className="flex-1">
        {conversationsWithFriends.length === 0 && !isCollapsed && (
            <div className="p-4 text-center text-sm text-muted-foreground">
                Connect with people in the <Link href="/community" className="underline text-primary">Community</Link> to start messaging.
            </div>
        )}
        {conversationsWithFriends.map((conv) => {
          const otherUserId = conv.participants.find(id => id !== currentUser.uid);
          const otherUser = allUsers.find(u => u.uid === otherUserId);
          const lastMessage = conv.lastMessage;
          const isActive = activeUserIds.includes(otherUser?.uid || '');
          const unreadCount = conv.unreadCount?.[currentUser.uid] || 0;

          if (!otherUser) return null;

          return (
            <button
              key={conv.id}
              className={cn(
                'flex items-center gap-3 w-full text-left p-2 hover:bg-muted',
                !isCollapsed && 'px-2 md:px-4',
                isCollapsed && 'justify-center py-3',
                selectedConversation?.id === conv.id && 'bg-muted border-l-2 border-primary'
              )}
              onClick={() => onSelectConversation(conv)}
            >
              <div className="relative">
                <Avatar className={cn('h-10 w-10', isCollapsed && 'h-12 w-12')}>
                  <AvatarImage src={otherUser.profilePictureUrl || undefined} alt={otherUser.displayName} />
                  <AvatarFallback>{otherUser.displayName?.substring(0, 2)}</AvatarFallback>
                </Avatar>
                {isActive && <span className={cn("absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background", isCollapsed && "h-3 w-3")} />}
              </div>
              {!isCollapsed && (
                <div className="flex-1 truncate">
                  <div className={cn("font-semibold", unreadCount > 0 && "font-bold")}>{otherUser.displayName}</div>
                  <p className="text-sm text-muted-foreground truncate">{lastMessage?.text || 'Start the conversation!'}</p>
                </div>
              )}
               {!isCollapsed && conv.updatedAt && new Date(conv.updatedAt).getTime() > 0 && (
                  <div className="text-xs text-muted-foreground whitespace-nowrap self-start">
                     {conv.updatedAt.toDate ? formatDistanceToNow(conv.updatedAt.toDate(), { addSuffix: true }) : formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                  </div>
              )}
            </button>
          );
        })}
      </ScrollArea>
    </div>
  );
}
