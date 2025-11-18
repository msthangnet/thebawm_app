
'use client';
import { useState, useEffect, useRef } from 'react';
import type { UserProfile, Conversation, Message } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageBubble } from './message-bubble';
import { ChatInput } from './chat-input';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import { Button } from '../ui/button';
import { ArrowLeft, Loader2, MessageSquare } from 'lucide-react';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, collection, addDoc, query, where, getDocs, onSnapshot, orderBy, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/hooks/use-auth';

interface ChatWindowProps {
  currentUser: UserProfile;
  selectedConversation: Conversation | null;
  onBack?: () => void;
  isMobile?: boolean;
  areFriends: boolean;
}

const formatDateSeparator = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
}

export function ChatWindow({ currentUser, selectedConversation, onBack, isMobile = false, areFriends }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight });
    }
  }, [messages]);

  useEffect(() => {
    if (!selectedConversation) {
        setLoading(false);
        return;
    };

    setLoading(true);

    const otherUserId = selectedConversation.participants.find(id => id !== currentUser.uid);
    
    if (otherUserId) {
        const userDocRef = doc(db, 'users', otherUserId);
        getDoc(userDocRef).then(docSnap => {
            if (docSnap.exists()) {
                setOtherUser({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
            }
        });
    }

    if(selectedConversation.id.includes('-')) { // This is a placeholder conversation
        setMessages([]);
        setLoading(false);
        return;
    }

    const messagesQuery = query(
        collection(db, 'conversations', selectedConversation.id, 'messages'),
        orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const fetchedMessages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString()
        } as Message));
        setMessages(fetchedMessages);
        setLoading(false);
    });
    
    const conversationRef = doc(db, 'conversations', selectedConversation.id);
    updateDoc(conversationRef, {
      [`unreadCount.${currentUser.uid}`]: 0
    });

    return () => unsubscribe();

  }, [selectedConversation, currentUser.uid]);


 const handleSendMessage = async (message: { text: string; image?: File; video?: File }) => {
    if (!selectedConversation || !otherUser) return;
    
    let conversationId = selectedConversation.id;
    let conversationRef;

    // If it's a placeholder conversation, create a real one
    if (conversationId.includes('-')) {
        const newConvRef = doc(collection(db, 'conversations'));
        conversationId = newConvRef.id;
        conversationRef = newConvRef;
        const newConversation = {
            participants: [currentUser.uid, otherUser.uid],
            updatedAt: serverTimestamp(),
            unreadCount: { [currentUser.uid]: 0, [otherUser.uid]: 1 }
        }
        await setDoc(conversationRef, newConversation);
    } else {
        conversationRef = doc(db, 'conversations', conversationId);
    }
    
    const newMessage: Omit<Message, 'id'|'createdAt'> = {
      senderId: currentUser.uid,
      text: message.text,
      status: 'sent',
    };
    
    const messagesColRef = collection(db, 'conversations', conversationId, 'messages');
    const newMessageRef = doc(messagesColRef);

    if (message.image) {
        const storageRef = ref(storage, `messages/${conversationId}/${newMessageRef.id}/image`);
        await uploadBytes(storageRef, message.image);
        newMessage.imageUrl = await getDownloadURL(storageRef);
    }
    if (message.video) {
        const storageRef = ref(storage, `messages/${conversationId}/${newMessageRef.id}/video`);
        await uploadBytes(storageRef, message.video);
        newMessage.videoUrl = await getDownloadURL(storageRef);
    }

    await setDoc(newMessageRef, {...newMessage, createdAt: serverTimestamp()});
    await updateDoc(conversationRef, { 
      updatedAt: serverTimestamp(), 
      lastMessage: newMessage,
      [`unreadCount.${otherUser.uid}`]: increment(1)
    });

  };


  if (!selectedConversation) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-muted/50">
        <div className="text-center">
          <MessageSquare size={48} className="mx-auto text-muted-foreground" />
          <p className="mt-4 text-lg text-muted-foreground">Select a conversation to start chatting</p>
        </div>
      </div>
    );
  }

  if (loading || !otherUser) {
    return (
        <div className="flex flex-col h-full items-center justify-center bg-muted/50">
          <div className="text-center">
             <Loader2 className="h-8 w-8 animate-spin"/>
          </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center gap-4 p-2 border-b">
        {isMobile && onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft />
            </Button>
        )}
        <Avatar>
          <AvatarImage src={otherUser.profilePictureUrl} alt={otherUser.displayName} />
          <AvatarFallback>{otherUser.displayName?.substring(0, 2)}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-bold text-lg">{otherUser.displayName}</h2>
          <p className="text-sm text-muted-foreground">@{otherUser.username}</p>
        </div>
      </div>
       <ScrollArea className="flex-1" viewportRef={scrollAreaRef}>
        <div className="p-4 flex flex-col gap-2">
            {messages.map((message, index) => {
                const prevMessage = messages[index - 1];
                const showDateSeparator = 
                     !prevMessage || 
                     differenceInDays(new Date(message.createdAt), new Date(prevMessage.createdAt)) > 0;
                
                return (
                    <div key={message.id}>
                        {showDateSeparator && (
                            <div className="flex justify-center my-4">
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                    {formatDateSeparator(new Date(message.createdAt))}
                                </span>
                            </div>
                        )}
                        <MessageBubble message={message} currentUser={currentUser} />
                    </div>
                )
            })}
        </div>
      </ScrollArea>
       <ChatInput
         currentUser={currentUser}
         selectedConversation={selectedConversation}
        onSendMessage={handleSendMessage}
        areFriends={areFriends}
      />
    </div>
  );
}
