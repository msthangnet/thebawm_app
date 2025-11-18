

"use client";

import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, getDocs, documentId, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, GroupInfo, EventInfo, QuizInfo, Notification as NotificationType } from "@/lib/types";
import Link from "next/link";
import { NotificationItem } from "./notification-item";
import { useRouter } from "next/navigation";


type EnrichedNotification = NotificationType & {
    sender?: UserProfile;
    group?: GroupInfo;
    event?: EventInfo;
    quiz?: QuizInfo;
};

export function NotificationPopover() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<EnrichedNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();


    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'notifications'), 
            where('recipientId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const rawNotifications = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as NotificationType));
            
            if (rawNotifications.length === 0) {
                setNotifications([]);
                setLoading(false);
                return;
            }

            const senderIds = [...new Set(rawNotifications.map(n => n.senderId))];
            
            const groupIds = [...new Set(rawNotifications.filter(n => n.type === 'group_join_request').map(n => n.entityId))];
            const eventIds = [...new Set(rawNotifications.filter(n => n.type === 'event_join_request').map(n => n.entityId))];
            const quizIds = [...new Set(rawNotifications.filter(n => n.type === 'quiz_join_request').map(n => n.entityId))];
            
            const [sendersSnap, groupsSnap, eventsSnap, quizzesSnap] = await Promise.all([
                senderIds.length > 0 ? getDocs(query(collection(db, 'users'), where(documentId(), 'in', senderIds))) : null,
                groupIds.length > 0 ? getDocs(query(collection(db, 'groups'), where(documentId(), 'in', groupIds))) : null,
                eventIds.length > 0 ? getDocs(query(collection(db, 'events'), where(documentId(), 'in', eventIds))) : null,
                quizIds.length > 0 ? getDocs(query(collection(db, 'quizzes'), where(documentId(), 'in', quizIds))) : null,
            ]);
            
            const sendersMap = new Map<string, UserProfile>();
            sendersSnap?.forEach(doc => sendersMap.set(doc.id, { uid: doc.id, ...doc.data() } as UserProfile));
            
            const groupsMap = new Map<string, GroupInfo>();
            groupsSnap?.forEach(doc => groupsMap.set(doc.id, { id: doc.id, ...doc.data() } as GroupInfo));

            const eventsMap = new Map<string, EventInfo>();
            eventsSnap?.forEach(doc => eventsMap.set(doc.id, { id: doc.id, ...doc.data() } as EventInfo));
            
            const quizzesMap = new Map<string, QuizInfo>();
            quizzesSnap?.forEach(doc => quizzesMap.set(doc.id, { id: doc.id, ...doc.data() } as QuizInfo));

            const enrichedNotifications = rawNotifications.map(notif => {
                const sender = sendersMap.get(notif.senderId);
                if (!sender) return null;

                const base = { ...notif, sender };

                switch (notif.type) {
                    case 'connection_request':
                        return base as EnrichedNotification;
                    case 'group_join_request':
                        const group = groupsMap.get(notif.entityId);
                        return group ? { ...base, group } as EnrichedNotification : null;
                    case 'event_join_request':
                        const event = eventsMap.get(notif.entityId);
                        return event ? { ...base, event } as EnrichedNotification : null;
                    case 'quiz_join_request':
                         const quiz = quizzesMap.get(notif.entityId);
                         return quiz ? { ...base, quiz } as EnrichedNotification : null;
                    default:
                        return null;
                }
            }).filter((n): n is EnrichedNotification => n !== null);

            setNotifications(enrichedNotifications);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleViewAll = () => {
        setIsOpen(false);
        router.push('/notifications');
    };

    if (!user) return null;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {notifications.length > 0 && (
                        <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                           {notifications.length}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[290px] sm:w-96 p-0" align="end">
                <div className="p-4">
                    <h4 className="font-medium leading-none">Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                        You have {notifications.length} new notifications.
                    </p>
                </div>
                <div className="grid gap-1 max-h-96 overflow-y-auto p-2">
                    {loading && (
                        <div className="flex justify-center items-center p-4">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    )}
                    {!loading && notifications.length > 0 && (
                        notifications.slice(0, 4).map(notif => (
                           <NotificationItem key={notif.id} notification={notif} showActions={false} />
                        ))
                    )}
                    {!loading && notifications.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No new notifications.</p>
                    )}
                </div>
                <div className="p-2 border-t mt-2">
                    <Button variant="ghost" className="w-full" onClick={handleViewAll}>View all notifications</Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
