
"use client";

import { PageInfo } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Info, Calendar } from "lucide-react";
import { format } from "date-fns";

export function AboutPageTab({ page }: { page: PageInfo }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>About {page.name}</CardTitle>
                <CardDescription>Information about this page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {page.description && (
                     <div>
                        <h3 className="font-semibold mb-2">Description</h3>
                        <p className="text-muted-foreground">{page.description}</p>
                    </div>
                )}
                 <div className="grid md:grid-cols-2 gap-4 pt-4">
                    <div className="flex items-center gap-3">
                        <Info className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">Category: <span className="font-semibold">{page.category}</span></span>
                    </div>
                     <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">Created on: <span className="font-semibold">{format(new Date(page.createdAt), 'PP')}</span></span>
                    </div>
                 </div>

            </CardContent>
        </Card>
    )
}
