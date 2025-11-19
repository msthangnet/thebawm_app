
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, getDocs, documentId, orderBy, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Notification, UserProfile, GroupInfo, EventInfo, QuizInfo } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { NotificationItem } from "@/components/layout/notification-item";

type EnrichedNotification = Notification & {
    sender?: UserProfile;
    group?: GroupInfo;
    event?: EventInfo;
    quiz?: QuizInfo;
};

export default function NotificationsPage() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<EnrichedNotification[]>([]);
    const [loading, setLoading] = useState(true);

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
            const rawNotifications = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
            
            // Mark all unread notifications as read
            const unreadNotifs = snapshot.docs.filter(d => !d.data().read);
            if (unreadNotifs.length > 0) {
                const batch = writeBatch(db);
                unreadNotifs.forEach(notifDoc => {
                    batch.update(doc(db, 'notifications', notifDoc.id), { read: true });
                });
                await batch.commit().catch(console.error);
            }

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
                        return base as EnrichedNotification;
                }
            }).filter((n): n is EnrichedNotification => n !== null);

            setNotifications(enrichedNotifications);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>All Notifications</CardTitle>
            </CardHeader>
            <CardContent>
                {notifications.length > 0 ? (
                    <div className="space-y-4">
                        {notifications.map(notif => (
                            <NotificationItem key={notif.id} notification={notif} />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground py-8">You have no notifications.</p>
                )}
            </CardContent>
        </Card>
    );
}
