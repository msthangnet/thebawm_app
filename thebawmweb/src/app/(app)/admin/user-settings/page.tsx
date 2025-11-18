
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { UserManagementPermissions, DefaultUserManagementPermissions, AssignableUserTypes, UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

function PermissionRow({ userType, permissions, onPermissionChange }: { userType: Exclude<UserProfile['userType'], undefined | null>, permissions: UserManagementPermissions, onPermissionChange: (type: keyof UserManagementPermissions, userType: string, value: boolean) => void }) {
    return (
        <div className="grid grid-cols-3 items-center gap-4 p-2 rounded-md hover:bg-muted text-sm">
            <div className="font-semibold">{userType}</div>
            <div className="flex justify-center">
                <Checkbox
                    checked={permissions.canUpdateUserType.includes(userType)}
                    onCheckedChange={(checked) => onPermissionChange('canUpdateUserType', userType, !!checked)}
                />
            </div>
            <div className="flex justify-center">
                <Checkbox
                    checked={permissions.canDeleteUsers.includes(userType)}
                    onCheckedChange={(checked) => onPermissionChange('canDeleteUsers', userType, !!checked)}
                />
            </div>
        </div>
    );
}

export default function UserSettingsPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [permissions, setPermissions] = useState<UserManagementPermissions | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!authLoading) {
            if (!user || userProfile?.userType !== 'Admin') {
                toast({ title: "Access Denied", description: "You must be an administrator to view this page.", variant: "destructive" });
                router.replace('/feed');
            }
        }
    }, [user, userProfile, authLoading, router, toast]);

    const fetchPermissions = useCallback(async () => {
        const settingsRef = doc(db, "app_settings", "userManagementPermissions");
        try {
            const docSnap = await getDoc(settingsRef);
            if (docSnap.exists()) {
                const fetchedPerms = docSnap.data();
                const mergedPerms = {
                    ...DefaultUserManagementPermissions,
                    ...fetchedPerms,
                };
                setPermissions(mergedPerms as UserManagementPermissions);
            } else {
                setPermissions(DefaultUserManagementPermissions);
            }
        } catch (error) {
            console.error("Error fetching permissions:", error);
            toast({ title: "Error", description: "Could not load settings.", variant: "destructive" });
        }
    }, [toast]);

    useEffect(() => {
        fetchPermissions();
    }, [fetchPermissions]);

    const handlePermissionChange = (type: keyof UserManagementPermissions, userType: string, value: any) => {
        setPermissions(prev => {
            if (!prev) return null;
            const newPerms = { ...prev };

            const list = Array.isArray(newPerms[type]) ? [...(newPerms[type] as string[])] : [];
            
            if (value) { // checked
                if (!list.includes(userType)) list.push(userType);
            } else { // unchecked
                const index = list.indexOf(userType);
                if (index > -1) list.splice(index, 1);
            }
            (newPerms[type] as string[]) = list;
            
            return newPerms;
        });
    };
    
    const handleSave = async () => {
        if (!permissions) return;
        setSaving(true);
        try {
            const settingsRef = doc(db, "app_settings", "userManagementPermissions");
            await setDoc(settingsRef, permissions);
            toast({ title: "Settings Saved", description: "User management permissions have been updated." });
        } catch (error) {
            console.error("Error saving permissions:", error);
            toast({ title: "Error", description: "Could not save settings.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || !user || !userProfile || !permissions) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle>User Management Settings</CardTitle>
                    <CardDescription>Control which roles can manage other users.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div className="grid grid-cols-3 items-center gap-4 p-2 font-bold border-b text-xs text-center">
                            <div className="text-left font-semibold">User Type</div>
                            <div>Can Promote/Demote</div>
                            <div>Can Delete Users</div>
                        </div>

                        {AssignableUserTypes.filter(type => type !== 'Admin').map(userType => (
                           userType && <PermissionRow
                                key={userType}
                                userType={userType}
                                permissions={permissions}
                                onPermissionChange={handlePermissionChange}
                            />
                        ))}
                         <div className="grid grid-cols-3 items-center gap-4 p-2 rounded-md text-sm">
                            <div className="font-semibold">Admin</div>
                            <div className="flex justify-center"><Checkbox checked disabled /></div>
                            <div className="flex justify-center"><Checkbox checked disabled /></div>
                        </div>
                    </div>
                     <Separator className="my-8" />
                     <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Save Settings
                        </Button>
                     </div>
                </CardContent>
            </Card>
        </div>
    );
}
