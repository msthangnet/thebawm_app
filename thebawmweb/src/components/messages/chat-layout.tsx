
'use client';
import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ConversationList } from './conversation-list';
import { ChatWindow } from './chat-window';
import type { UserProfile, Conversation } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { collection, query, where, onSnapshot, getDocs, or, documentId, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import type { User } from 'firebase/auth';

interface ChatLayoutProps {
  currentUser: User;
}

export function ChatLayout({ currentUser }: ChatLayoutProps) {
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<UserProfile[]>([]);

  const selectedConversationId = searchParams.get('conversationId');

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);

    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
        setLoading(false);
        return;
    }
    const currentUserProfile = {uid: userDocSnap.id, ...userDocSnap.data()} as UserProfile;
    setUserProfile(currentUserProfile);
    
    // Fetch all connected friends
    const connectionsQuery = query(collection(db, 'users', currentUser.uid, 'connections'), where('status', '==', 'connected'));
    const connectionsSnapshot = await getDocs(connectionsQuery);
    const friendIds = connectionsSnapshot.docs.map(doc => doc.id);
    
    // Fetch conversations
    const conversationsQuery = query(collection(db, 'conversations'), where('participants', 'array-contains', currentUser.uid));
    const conversationsSnapshot = await getDocs(conversationsQuery);
    const conversationParticipantIds = conversationsSnapshot.docs.flatMap(d => d.data().participants).filter(id => id !== currentUser.uid);

    const allRelatedUserIds = [...new Set([...friendIds, ...conversationParticipantIds])];

    if (allRelatedUserIds.length > 0) {
        const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', allRelatedUserIds));
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        setAllUsers(usersData);
        setFriends(usersData.filter(u => friendIds.includes(u.uid)));
    } else {
        setAllUsers([]);
        setFriends([]);
    }

    setLoading(false);

  }, [currentUser.uid]);
  
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (!currentUser.uid) return;
    
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(conversationsQuery, (snapshot) => {
        const convs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as Conversation));
        setConversations(convs);
    });

    return () => unsubscribe();
  }, [currentUser.uid]);

  useEffect(() => {
    if (!selectedConversationId) {
        setSelectedConversation(null);
    } else {
        let conversation = conversations.find(c => c.id === selectedConversationId);
        if (!conversation && selectedConversationId.includes('-') && allUsers.length > 0 && userProfile) {
            const participantIds = selectedConversationId.split('-');
            const otherUserId = participantIds.find(id => id !== userProfile.uid);
            if(otherUserId && allUsers.some(u => u.uid === otherUserId)){
                 conversation = {
                    id: selectedConversationId,
                    participants: [userProfile.uid, otherUserId],
                    updatedAt: new Date().toISOString(),
                    unreadCount: {}
                }
            }
        }
        setSelectedConversation(conversation ?? null);
    }
  }, [selectedConversationId, conversations, allUsers, userProfile]);

  const handleSelectConversation = (conversation: Conversation) => {
    router.push(`${pathname}?conversationId=${conversation.id}`);
  };

  const handleBack = () => {
    router.push(pathname);
  };
  
  if (loading || !userProfile) {
    return (
        <div className="flex flex-col h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  if (isMobile) {
    const isChatOpen = !!(selectedConversationId && selectedConversation);
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          {isChatOpen ? (
            <ChatWindow
                currentUser={userProfile}
                selectedConversation={selectedConversation}
                onBack={handleBack}
                isMobile={true}
                areFriends={friends.some(f => selectedConversation?.participants.includes(f.uid))}
              />
          ) : (
            <ConversationList
              isCollapsed={false}
              conversations={conversations}
              onSelectConversation={handleSelectConversation}
              currentUser={userProfile}
              allUsers={allUsers}
              friends={friends}
              selectedConversation={selectedConversation}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <ResizablePanelGroup
        direction="horizontal"
        className="items-stretch flex-1"
      >
        <ResizablePanel
          defaultSize={25}
          minSize={20}
          collapsible={true}
          onCollapse={() => setIsNavCollapsed(true)}
          onExpand={() => setIsNavCollapsed(false)}
          className={`transition-all duration-300 ease-in-out ${isNavCollapsed ? 'min-w-[50px]' : ''}`}
        >
          <ConversationList
            isCollapsed={isNavCollapsed}
            conversations={conversations}
            onSelectConversation={handleSelectConversation}
            currentUser={userProfile}
            selectedConversation={selectedConversation}
            allUsers={allUsers}
            friends={friends}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={75} minSize={30}>
          <ChatWindow
            currentUser={userProfile}
            selectedConversation={selectedConversation}
            areFriends={friends.some(f => selectedConversation?.participants.includes(f.uid))}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
