
"use client";

import { GroupInfo } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Info, Calendar, Globe, Lock } from "lucide-react";
import { format } from "date-fns";

export function AboutGroupTab({ group }: { group: GroupInfo }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>About {group.name}</CardTitle>
                <CardDescription>Information about this group.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {group.description && (
                     <div>
                        <h3 className="font-semibold mb-2">Description</h3>
                        <p className="text-muted-foreground">{group.description}</p>
                    </div>
                )}
                 <div className="grid md:grid-cols-2 gap-4 pt-4">
                    <div className="flex items-center gap-3">
                        <Info className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">Category: <span className="font-semibold">{group.category}</span></span>
                    </div>
                     <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">Created on: <span className="font-semibold">{format(new Date(group.createdAt), 'PP')}</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                        {group.groupType === 'private' ? <Lock className="h-5 w-5 text-muted-foreground" /> : <Globe className="h-5 w-5 text-muted-foreground" />}
                        <span className="text-sm">Privacy: <span className="font-semibold">{group.groupType.charAt(0).toUpperCase() + group.groupType.slice(1)}</span></span>
                    </div>
                 </div>

            </CardContent>
        </Card>
    )
}
