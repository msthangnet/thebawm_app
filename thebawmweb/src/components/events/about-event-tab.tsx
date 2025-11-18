
"use client";

import { EventInfo } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Info, Calendar, Globe, Lock, Clock } from "lucide-react";
import { format } from "date-fns";

export function AboutEventTab({ event }: { event: EventInfo }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>About {event.name}</CardTitle>
                <CardDescription>Information about this event.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {event.description && (
                     <div>
                        <h3 className="font-semibold mb-2">Description</h3>
                        <p className="text-muted-foreground">{event.description}</p>
                    </div>
                )}
                 <div className="grid md:grid-cols-2 gap-4 pt-4">
                    <div className="flex items-center gap-3">
                        <Info className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">Category: <span className="font-semibold">{event.category}</span></span>
                    </div>
                     <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">Created on: <span className="font-semibold">{format(new Date(event.createdAt), 'PP')}</span></span>
                    </div>
                     <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                         <span className="text-sm">Starts: <span className="font-semibold">{format(new Date(event.startDate), 'PPp')}</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">Ends: <span className="font-semibold">{format(new Date(event.endDate), 'PPp')}</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                        {event.eventType === 'private' ? <Lock className="h-5 w-5 text-muted-foreground" /> : <Globe className="h-5 w-5 text-muted-foreground" />}
                        <span className="text-sm">Privacy: <span className="font-semibold">{event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}</span></span>
                    </div>
                 </div>

            </CardContent>
        </Card>
    )
}
