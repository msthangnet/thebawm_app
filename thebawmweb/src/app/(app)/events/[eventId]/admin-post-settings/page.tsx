
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, setDoc, query, where, getDocs } from "firebase/firestore";
import { PostPermissions, DefaultPostPermissions, UserTypes, EventInfo } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

function PermissionRow({ userType, permissions, onPermissionChange }: { userType: string, permissions: PostPermissions, onPermissionChange: (type: keyof PostPermissions, userType: string, value: any) => void }) {
    return (
        <div className="grid grid-cols-9 items-center gap-4 p-2 rounded-md hover:bg-muted text-sm">
            <div className="font-semibold">{userType}</div>
            <div className="flex justify-center">
                <Checkbox
                    checked={permissions.canPost.includes(userType)}
                    onCheckedChange={(checked) => onPermissionChange('canPost', userType, checked)}
                />
            </div>
            <div className="flex justify-center">
                <Checkbox
                    checked={permissions.canUploadImage.includes(userType)}
                    onCheckedChange={(checked) => onPermissionChange('canUploadImage', userType, checked)}
                />
            </div>
            <div>
                 <Input
                    type="number"
                    min="0"
                    max="10"
                    value={permissions.imageUploadLimit[userType] || 0}
                    onChange={(e) => onPermissionChange('imageUploadLimit', userType, parseInt(e.target.value, 10))}
                    className="w-20 text-center"
                />
            </div>
             <div className="flex justify-center">
                <Checkbox
                    checked={permissions.canUploadVideo.includes(userType)}
                    onCheckedChange={(checked) => onPermissionChange('canUploadVideo', userType, checked)}
                />
            </div>
             <div className="flex justify-center">
                <Checkbox
                    checked={permissions.canEditOwnPost.includes(userType)}
                    onCheckedChange={(checked) => onPermissionChange('canEditOwnPost', userType, checked)}
                />
            </div>
             <div className="flex justify-center">
                <Checkbox
                    checked={permissions.canDeleteOthersPosts.includes(userType)}
                    onCheckedChange={(checked) => onPermissionChange('canDeleteOthersPosts', userType, checked)}
                />
            </div>
             <div className="flex justify-center">
                <Checkbox
                    checked={permissions.canSchedulePost.includes(userType)}
                    onCheckedChange={(checked) => onPermissionChange('canSchedulePost', userType, checked)}
                />
            </div>
            <div>
                <Input
                    type="number"
                    min="0"
                    value={permissions.dailyPostLimit[userType] || 0}
                    onChange={(e) => onPermissionChange('dailyPostLimit', userType, parseInt(e.target.value, 10))}
                    className="w-20 text-center"
                />
            </div>
        </div>
    );
}

export default function EventAdminPostSettings() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const eventIdSlug = params.eventId as string;

    const { toast } = useToast();
    const [permissions, setPermissions] = useState<PostPermissions | null>(null);
    const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchEventAndPermissions = useCallback(async () => {
        if (!eventIdSlug || !user) return;
        setLoading(true);
        try {
            // 1. Fetch Event Info by eventId slug
            const eventsRef = collection(db, "events");
            const q = query(eventsRef, where("eventId", "==", eventIdSlug));
            const eventQuerySnapshot = await getDocs(q);

            if (eventQuerySnapshot.empty) {
                toast({ title: "Error", description: "Event not found.", variant: "destructive" });
                router.replace('/events');
                return;
            }

            const eventDocSnap = eventQuerySnapshot.docs[0];
            const eventData = { ...eventDocSnap.data(), id: eventDocSnap.id } as EventInfo;
            setEventInfo(eventData);

            // 2. Check Permissions
            const isOwner = eventData.ownerId === user.uid;
            const isSiteAdmin = userProfile?.userType === 'Admin';
            if (!isOwner && !isSiteAdmin) {
                toast({ title: "Access Denied", description: "You don't have permission to manage this event's settings.", variant: "destructive" });
                router.replace(`/events/${eventIdSlug}`);
                return;
            }
            
            // 3. Fetch Event-specific or Default Permissions
            const settingsRef = doc(db, "events", eventData.id, "settings", "postPermissions");
            const docSnap = await getDoc(settingsRef);
            if (docSnap.exists()) {
                 const fetchedPerms = docSnap.data();
                const mergedPerms = {
                    ...DefaultPostPermissions,
                    ...fetchedPerms,
                    dailyPostLimit: {
                        ...DefaultPostPermissions.dailyPostLimit,
                        ...(fetchedPerms.dailyPostLimit || {})
                    },
                    imageUploadLimit: {
                         ...DefaultPostPermissions.imageUploadLimit,
                        ...(fetchedPerms.imageUploadLimit || {})
                    }
                };
                setPermissions(mergedPerms as PostPermissions);
            } else {
                setPermissions(DefaultPostPermissions);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ title: "Error", description: "Could not load settings.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [eventIdSlug, user, userProfile, router, toast]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchEventAndPermissions();
        } else if (!authLoading && !user) {
            router.replace('/login');
        }
    }, [authLoading, user, fetchEventAndPermissions, router]);

    const handlePermissionChange = (type: keyof PostPermissions, userType: string, value: any) => {
        setPermissions(prev => {
            if (!prev) return null;
            const newPerms = { ...prev };

            if (type === 'dailyPostLimit' || type === 'imageUploadLimit') {
                (newPerms[type] as Record<string, number>)[userType] = value;
            } else {
                const list = Array.isArray(newPerms[type]) ? [...(newPerms[type] as string[])] : [];
                
                if (value) {
                    if (!list.includes(userType)) list.push(userType);
                } else {
                    const index = list.indexOf(userType);
                    if (index > -1) list.splice(index, 1);
                }
                (newPerms[type] as string[]) = list;
            }
            return newPerms;
        });
    };
    
    const handleSave = async () => {
        if (!permissions || !eventInfo) return;
        setSaving(true);
        try {
            const settingsRef = doc(db, "events", eventInfo.id, "settings", "postPermissions");
            await setDoc(settingsRef, permissions, { merge: true });
            toast({ title: "Settings Saved", description: "Event post permissions have been updated." });
        } catch (error) {
            console.error("Error saving permissions:", error);
            toast({ title: "Error", description: "Could not save settings.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (loading || authLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!permissions || !eventInfo) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <p>Could not load event settings.</p>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle>Event Post Settings: {eventInfo.name}</CardTitle>
                    <CardDescription>Control who can post, what they can post, and how often in this specific event.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div className="grid grid-cols-9 items-center gap-4 p-2 font-bold border-b text-xs text-center">
                            <div className="text-left font-semibold">User Type</div>
                            <div>Can Post</div>
                            <div>Image Upload</div>
                            <div>Image Limit</div>
                            <div>Video Upload</div>
                            <div>Edit Own Post</div>
                            <div>Delete Others</div>
                            <div>Schedule Post</div>
                            <div>Daily Limit</div>
                        </div>

                        {UserTypes.filter(type => type !== 'Inactive' && type !== 'Suspended' && type !== 'Admin' && type !== 'Advanced').map(userType => (
                            <PermissionRow
                                key={userType}
                                userType={userType}
                                permissions={permissions}
                                onPermissionChange={handlePermissionChange}
                            />
                        ))}
                    </div>
                     <Separator className="my-8" />
                     <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Save Event Settings
                        </Button>
                     </div>
                </CardContent>
            </Card>
        </div>
    );
}
