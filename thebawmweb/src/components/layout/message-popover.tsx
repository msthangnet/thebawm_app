
"use client";

import { MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot, getDocs, documentId, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Conversation } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict, differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays } from "date-fns";

const formatShortDistance = (date: Date) => {
    const now = new Date();
    const seconds = differenceInSeconds(now, date);
    if (seconds < 60) return `${seconds}s`;

    const minutes = differenceInMinutes(now, date);
    if (minutes < 60) return `${minutes}m`;

    const hours = differenceInHours(now, date);
    if (hours < 24) return `${hours}h`;

    const days = differenceInDays(now, date);
    return `${days}d`;
}

export function MessagePopover() {
    const { user } = useAuth();
    const router = useRouter();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const conversationsQuery = query(
            collection(db, 'conversations'),
            where('participants', 'array-contains', user.uid),
            orderBy('updatedAt', 'desc'),
            limit(4)
        );

        const unsubscribe = onSnapshot(conversationsQuery, async (snapshot) => {
            const convs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
            
            const userIds = convs.flatMap(c => c.participants).filter(uid => uid !== user.uid);
            if (userIds.length > 0) {
                const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', [...new Set(userIds)]));
                const usersSnapshot = await getDocs(usersQuery);
                const usersData = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
                setAllUsers(usersData);
            }

            setConversations(convs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const totalUnreadCount = useMemo(() => {
        if (!user) return 0;
        return conversations.reduce((acc, conv) => acc + (conv.unreadCount?.[user.uid] || 0), 0);
    }, [conversations, user]);

    const handleNavigate = (path: string) => {
        setIsOpen(false);
        router.push(path);
    };

    if (!user) return null;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <MessageSquare className="h-5 w-5" />
                    {totalUnreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs">
                           {totalUnreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[290px] sm:w-96 p-1 sm:p-2" align="end">
                <div className="grid gap-2">
                    <div className="grid gap-1 max-h-96 overflow-y-auto">
                        {loading && (
                            <div className="flex justify-center items-center p-4">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        )}
                        {!loading && conversations.length > 0 && (
                            conversations.map(conv => {
                                const otherUserId = conv.participants.find(id => id !== user.uid);
                                const otherUser = allUsers.find(u => u.uid === otherUserId);
                                const unreadCount = conv.unreadCount?.[user.uid] || 0;
                                
                                if (!otherUser) return null;

                                const timeAgo = conv.updatedAt 
                                    ? formatShortDistance(conv.updatedAt.toDate ? conv.updatedAt.toDate() : new Date(conv.updatedAt))
                                    : '';

                                return (
                                    <button
                                        key={conv.id}
                                        className={cn("flex items-center gap-2 sm:gap-3 p-2 rounded-md hover:bg-muted w-full text-left", unreadCount > 0 && "bg-blue-500/10")}
                                        onClick={() => handleNavigate(`/messages?conversationId=${conv.id}`)}
                                    >
                                        <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                                            <AvatarImage src={otherUser.profilePictureUrl || undefined} />
                                            <AvatarFallback>{otherUser.displayName?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 truncate">
                                            <p className={cn("font-semibold text-sm", unreadCount > 0 && "font-bold")}>{otherUser.displayName}</p>
                                            <p className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">{conv.lastMessage?.text || '...'}</p>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {timeAgo}
                                        </div>
                                    </button>
                                )
                            })
                        )}
                        {!loading && conversations.length === 0 && (
                           <p className="text-sm text-muted-foreground text-center py-4">No recent messages.</p>
                        )}
                    </div>
                    <Button variant="ghost" className="w-full mt-2 h-8 sm:h-9" onClick={() => handleNavigate('/messages')}>
                        View All
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
