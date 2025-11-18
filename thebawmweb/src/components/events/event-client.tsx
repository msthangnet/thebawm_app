
"use client";

import { db } from "@/lib/firebase";
import { EventInfo, Post, PostPermissions } from "@/lib/types";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { notFound } from "next/navigation";
import { EventHeader } from "@/components/events/event-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AboutEventTab } from "@/components/events/about-event-tab";
import { EventSettingsTab } from "@/components/events/event-settings-tab";
import { EventParticipantsTab } from "@/components/events/event-participants-tab";
import { EventPostsTab } from "@/components/events/event-posts-tab";
import { EventAnnouncementsTab } from "@/components/events/event-announcements-tab";
import { useState, useEffect } from "react";
import { Loader2, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "../ui/card";
import { ParticipateButton } from "./participate-button";


type EventClientProps = {
    initialEventInfo: EventInfo;
    initialPosts: Post[];
    initialAnnouncements: Post[];
    initialPermissions: PostPermissions;
}

export function EventClient({ initialEventInfo, initialPosts, initialAnnouncements, initialPermissions }: EventClientProps) {
    const [eventInfo, setEventInfo] = useState<EventInfo | null>(initialEventInfo);
    const [posts, setPosts] = useState<Post[]>(initialPosts);
    const [announcements, setAnnouncements] = useState<Post[]>(initialAnnouncements);
    const [permissions, setPermissions] = useState<PostPermissions>(initialPermissions);
    const [loading, setLoading] = useState(!initialEventInfo);
    const { user, userProfile } = useAuth();

    useEffect(() => {
        if (!eventInfo) return;

        const eventQuery = query(collection(db, "events"), where("eventId", "==", eventInfo.eventId));

        const unsubscribe = onSnapshot(eventQuery, (querySnapshot) => {
            if (querySnapshot.empty) {
                notFound();
                return;
            }
            const docSnap = querySnapshot.docs[0];
            const data = docSnap.data();
            const fetchedEventInfo = {
                ...data,
                id: docSnap.id,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(),
                endDate: data.endDate?.toDate ? data.endDate.toDate() : new Date(),
                participants: data.participants || [],
                admins: data.admins || [],
                pendingParticipants: data.pendingParticipants || [],
                declinedParticipants: data.declinedParticipants || {},
            } as EventInfo;
            setEventInfo(fetchedEventInfo);
            setLoading(false);
        }, (error) => {
            console.error("Failed to subscribe to event data:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [eventInfo?.eventId]);


    if (loading) {
         return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!eventInfo) {
        notFound();
        return null;
    }
    
    const now = new Date();
    const startDate = eventInfo.startDate;
    const endDate = eventInfo.endDate;

    let eventStatus: 'upcoming' | 'ongoing' | 'ended' = 'upcoming';
    if (now > endDate) {
        eventStatus = 'ended';
    } else if (now >= startDate && now <= endDate) {
        eventStatus = 'ongoing';
    }

    const isOwner = eventInfo.ownerId === user?.uid;
    const isSiteAdmin = userProfile?.userType === 'Admin';
    const isParticipant = eventInfo.participants.includes(user?.uid || '');
    const isSpecialPoster = Array.isArray(eventInfo.posters) && eventInfo.posters.includes(user?.uid || '');

    let canPostInMainFeed = false;
    if (isOwner || isSiteAdmin || isSpecialPoster) {
        canPostInMainFeed = true;
    } else if (eventStatus === 'ongoing' && isParticipant) {
        canPostInMainFeed = true;
    }
    
    const canPostAnnouncement = isOwner || isSiteAdmin;

    const canViewContent = eventInfo.eventType === 'public' || isParticipant || isOwner || isSiteAdmin;
    
    const canViewSettings = isOwner || isSiteAdmin;
    const canViewParticipants = canViewContent;

    return (
        <div className="flex flex-col">
            <EventHeader event={eventInfo} />
            <div className="container mx-auto px-4 py-8">
                <Tabs defaultValue="posts" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="posts">Posts</TabsTrigger>
                        <TabsTrigger value="announcements">Announcements</TabsTrigger>
                        <TabsTrigger value="about">About</TabsTrigger>
                        {canViewParticipants && <TabsTrigger value="participants">Participants</TabsTrigger>}
                        {canViewSettings && <TabsTrigger value="settings">Settings</TabsTrigger>}
                    </TabsList>

                    <TabsContent value="about">
                       <AboutEventTab event={eventInfo} />
                    </TabsContent>

                    {canViewContent ? (
                        <>
                            <TabsContent value="posts">
                                <EventPostsTab 
                                    event={eventInfo} 
                                    initialPosts={posts} 
                                    permissions={permissions} 
                                    canPost={canPostInMainFeed}
                                />
                            </TabsContent>
                             <TabsContent value="announcements">
                                <EventAnnouncementsTab 
                                    event={eventInfo} 
                                    initialPosts={announcements} 
                                    permissions={permissions} 
                                    canPost={canPostAnnouncement}
                                />
                            </TabsContent>

                             {canViewParticipants && (
                                <TabsContent value="participants">
                                    <EventParticipantsTab event={eventInfo} />
                                </TabsContent>
                             )}
                            {canViewSettings && (
                                <TabsContent value="settings">
                                    <EventSettingsTab event={eventInfo} onEventUpdate={() => {}} />
                                </TabsContent>
                            )}
                        </>
                    ) : (
                         <TabsContent value="posts">
                            <Card className="max-w-2xl mx-auto">
                                <CardContent className="py-16 text-center">
                                    <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold">This Event is Private</h3>
                                    <p className="text-muted-foreground mt-2 mb-6">Request to participate in this event to see its posts and announcements.</p>
                                    <div className="max-w-xs mx-auto">
                                        <ParticipateButton event={eventInfo} />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </div>
    );
}
