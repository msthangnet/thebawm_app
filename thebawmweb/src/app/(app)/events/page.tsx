
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { EventInfo, EventCreationPermissions } from "@/lib/types";
import { Loader2, PlusCircle, Settings, Users, Globe, Lock, Calendar, Forward, Play, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { DefaultEventCreationPermissions } from "@/lib/types";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { ParticipateButton } from "@/components/events/participate-button";
import { Input } from "@/components/ui/input";

function EventCard({ event }: { event: EventInfo }) {
    const now = new Date();
    const startDate = event.startDate?.toDate ? event.startDate.toDate() : new Date();
    const endDate = event.endDate?.toDate ? event.endDate.toDate() : new Date();

    let status: 'upcoming' | 'ongoing' | 'ended' = 'upcoming';
    let statusText = 'Upcoming';
    let statusColor = 'text-yellow-500';
    let StatusIcon = Calendar;

    if (now > endDate) {
        status = 'ended';
        statusText = 'Event Ended';
        statusColor = 'text-red-500';
        StatusIcon = Calendar;
    } else if (now >= startDate && now <= endDate) {
        status = 'ongoing';
        statusText = 'Ongoing';
        statusColor = 'text-green-500';
        StatusIcon = Play;
    } else {
        StatusIcon = Forward;
    }

    return (
        <Card className="flex flex-col text-center">
            <CardHeader className="p-4 items-center">
                <Link href={`/events/${event.eventId}`} className="block hover:bg-muted/50 rounded-full p-1">
                    <Avatar className="w-24 h-24 text-2xl">
                        <AvatarImage src={event.profilePictureUrl || undefined} alt={event.name} />
                        <AvatarFallback>{event.name?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </Link>
                 <Link href={`/events/${event.eventId}`} className="block mt-2">
                    <p className="font-semibold hover:underline truncate">{event.name}</p>
                </Link>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-grow flex flex-col justify-between space-y-3">
                 <div className="space-y-3">
                    <div className={cn("text-sm font-semibold flex items-center justify-center gap-2", statusColor)}>
                        <StatusIcon className="h-4 w-4" />
                        <span>{statusText}</span>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                        {event.eventType === 'private' ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                        <span>{event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}</span>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                        <Users className="h-4 w-4" />
                        <span>{(event.participants || []).length} Participants</span>
                    </div>
                 </div>
                 <div className="mt-4">
                    <ParticipateButton event={event} />
                 </div>
            </CardContent>
        </Card>
    )
}

export default function EventsListPage() {
    const { user, userProfile } = useAuth();
    const [events, setEvents] = useState<EventInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState<EventCreationPermissions>(DefaultEventCreationPermissions);
    const [searchTerm, setSearchTerm] = useState("");
    
    useEffect(() => {
        const eventsRef = collection(db, "events");
        const unsubscribe = onSnapshot(eventsRef, (querySnapshot) => {
            const fetchedEvents = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                } as EventInfo;
            });
            setEvents(fetchedEvents);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching events:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            const permsRef = doc(db, "app_settings", "eventCreationPermissions");
            const unsubscribe = onSnapshot(permsRef, (permsSnap) => {
                if (permsSnap.exists()) {
                    setPermissions(permsSnap.data() as EventCreationPermissions);
                } else {
                    setPermissions(DefaultEventCreationPermissions);
                }
            });
            return () => unsubscribe();
        }
    }, [user]);

    const isAdmin = userProfile?.userType === 'Admin';
    const canCreateEvent = user && (permissions.allowedUserIds.includes(user.uid) || isAdmin);
    
    const filteredEvents = events.filter(event => 
        event.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        event.eventId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                <p className="text-[18px] font-bold font-headline flex-1">Events</p>
                <div className="flex w-full md:w-auto items-center gap-2">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            placeholder="Search events..."
                            className="pl-10 bg-background"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canCreateEvent && (
                        <Button asChild>
                            <Link href="/events/create">
                                <PlusCircle className="mr-1 h-4 w-4"/>
                                Create
                            </Link>
                        </Button>
                    )}
                    {isAdmin && (
                            <Button asChild variant="outline" size="icon">
                            <Link href="/admin/event-settings">
                                <Settings className="h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
            <div>
                {loading ? (
                        <div className="flex h-48 items-center justify-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : filteredEvents.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredEvents.map(event => <EventCard key={event.id} event={event} />)}
                    </div>
                ) : (
                    <div className="text-center py-16 text-muted-foreground">
                        <p>No events found. {canCreateEvent ? "Be the first to create one!" : ""}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
