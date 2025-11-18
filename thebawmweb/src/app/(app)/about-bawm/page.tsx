
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AboutBawm, AboutBawmCreationPermissions, UserProfile } from "@/lib/types";
import { Loader2, PlusCircle, Settings, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { DefaultAboutBawmCreationPermissions } from "@/lib/types";
import { AboutBawmCard } from "@/components/about/about-bawm-card";
import { getUser } from "@/services/firestore";

export default function AboutBawmListPage() {
    const { user, userProfile } = useAuth();
    const [publications, setPublications] = useState<AboutBawm[]>([]);
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState<AboutBawmCreationPermissions>(DefaultAboutBawmCreationPermissions);
    
    useEffect(() => {
        const publicationsRef = collection(db, "aboutBawm");
        const unsubscribe = onSnapshot(publicationsRef, async (querySnapshot) => {
            const fetchedPublicationsPromises = querySnapshot.docs.map(async (docSnapshot) => {
                const data = docSnapshot.data();
                let author: UserProfile | null = null;
                if (data.authorId) {
                    author = await getUser(data.authorId);
                }

                return {
                    ...data,
                    id: docSnapshot.id,
                    author,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                } as AboutBawm;
            });

            const fetchedPublications = await Promise.all(fetchedPublicationsPromises);
            setPublications(fetchedPublications);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching 'About BAWM' publications:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            const permsRef = doc(db, "app_settings", "aboutBawmCreationPermissions");
            const unsubscribe = onSnapshot(permsRef, (permsSnap) => {
                if (permsSnap.exists()) {
                    setPermissions(permsSnap.data() as AboutBawmCreationPermissions);
                } else {
                    setPermissions(DefaultAboutBawmCreationPermissions);
                }
            });
            return () => unsubscribe();
        }
    }, [user]);

    const isAdmin = userProfile?.userType === 'Admin';
    const canCreate = user && (permissions.allowedUserIds.includes(user.uid) || isAdmin);

    return (
        <div>
            <div className="flex flex-row items-center justify-between mb-4">
                <div>
                    <h1 className="text-3xl font-bold">About BAWM</h1>
                    <p className="text-muted-foreground">Explore content about BAWM.</p>
                </div>
                <div className="flex items-center gap-2">
                    {canCreate && (
                        <Button asChild>
                            <Link href="/about-bawm/create">
                                <PlusCircle className="mr-2 h-4 w-4"/>
                                Create New
                            </Link>
                        </Button>
                    )}
                    {isAdmin && (
                            <Button asChild variant="outline" size="icon">
                            <Link href="/admin/about-bawm-settings">
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
                ) : publications.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {publications.map(pub => <AboutBawmCard key={pub.id} publication={pub} />)}
                    </div>
                ) : (
                    <div className="text-center py-16 text-muted-foreground">
                        <p>No content has been published yet. {canCreate ? "Be the first to create some!" : ""}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
