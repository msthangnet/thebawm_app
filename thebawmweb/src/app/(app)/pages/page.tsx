
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PageInfo, PageCreationPermissions } from "@/lib/types";
import { Loader2, PlusCircle, Settings, Users, Heart, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { DefaultPageCreationPermissions } from "@/lib/types";
import { FollowPageButton } from "@/components/pages/follow-page-button";
import { Input } from "@/components/ui/input";


function PageCard({ page }: { page: PageInfo }) {
    return (
        <Card className="flex flex-col">
            <CardHeader className="p-4">
                 <Link href={`/pages/${page.pageId}`} className="block hover:bg-muted/50 rounded-lg">
                    <div className="flex items-center">
                        <Avatar className="h-16 w-16 mr-4">
                            <AvatarImage src={page.profilePictureUrl || undefined} />
                            <AvatarFallback>{page.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-grow">
                            <p className="font-semibold hover:underline">{page.name}</p>
                            <p className="text-sm text-muted-foreground">@{page.pageId}</p>
                        </div>
                    </div>
                </Link>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-grow">
                 <div className="text-sm text-muted-foreground flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        <span>{(page.likes || []).length} Likes</span>
                    </div>
                     <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{(page.followers || []).length} Followers</span>
                    </div>
                </div>
            </CardContent>
            <div className="p-4 pt-0">
                <FollowPageButton pageId={page.id} />
            </div>
        </Card>
    )
}


export default function PagesListPage() {
    const { user, userProfile } = useAuth();
    const [pages, setPages] = useState<PageInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState<PageCreationPermissions>(DefaultPageCreationPermissions);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const pagesRef = collection(db, "pages");
        const unsubscribe = onSnapshot(pagesRef, (querySnapshot) => {
            const fetchedPages = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                } as PageInfo;
            });
            setPages(fetchedPages);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching pages:", error);
            setLoading(false);
        });
        
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            const permsRef = doc(db, "app_settings", "pageCreationPermissions");
            const unsubscribe = onSnapshot(permsRef, (permsSnap) => {
                if (permsSnap.exists()) {
                    setPermissions(permsSnap.data() as PageCreationPermissions);
                }
            });
            return () => unsubscribe();
        }
    }, [user]);


    const isAdmin = userProfile?.userType === 'Admin';
    const canCreatePage = user && (permissions.allowedUserIds.includes(user.uid) || isAdmin);
    
    const filteredPages = pages.filter(page => 
        page.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        page.pageId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                <p className="text-[18px] font-bold font-headline flex-1">Pages</p>
                <div className="flex w-full md:w-auto items-center gap-2">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            placeholder="Search pages..."
                            className="pl-10 bg-background"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canCreatePage && (
                        <Button asChild>
                            <Link href="/pages/create">
                                <PlusCircle className="mr-1 h-4 w-4"/>
                                Create
                            </Link>
                        </Button>
                    )}
                    {isAdmin && (
                            <Button asChild variant="outline" size="icon">
                            <Link href="/admin/page-settings">
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
                ) : filteredPages.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredPages.map(page => <PageCard key={page.id} page={page} />)}
                    </div>
                ) : (
                    <div className="text-center py-16 text-muted-foreground">
                        <p>No pages found. {canCreatePage ? "Be the first to create one!" : ""}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
