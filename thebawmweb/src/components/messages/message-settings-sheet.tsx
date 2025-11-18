
'use client';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button";
import { Settings, Save } from "lucide-react";
import { useMessageSettings, type MessageSettings } from "@/context/message-settings-context";
import { Label } from "@/components/ui/label";
import type { UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Separator } from "../ui/separator";
import { Switch } from "../ui/switch";
import { AssignableUserTypes } from "@/lib/types";

export function MessageSettingsSheet() {
  const { settings, setSettings } = useMessageSettings();
  const [localSettings, setLocalSettings] = useState<MessageSettings>(settings);
  const { toast } = useToast();

  const handleSwitchChange = (role: UserProfile['userType'], field: keyof MessageSettings[string], value: boolean) => {
    if (!role) return;
    setLocalSettings(prev => ({
      ...prev,
      [role]: {
        ...(prev[role] || { canSendPhoto: false, canSendVideo: false }),
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    setSettings(localSettings);
    toast({
      title: "Settings Saved",
      description: "Messaging permissions have been updated.",
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Open Message Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Messaging Settings</SheetTitle>
          <SheetDescription>
            Manage media permissions for different user roles in direct messages.
          </SheetDescription>
        </SheetHeader>
        <div className="py-6 space-y-8">
          {AssignableUserTypes.map(role => (
            <div key={role} className="space-y-4">
              <h4 className="font-semibold text-lg text-primary">{role}</h4>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <Label htmlFor={`canSendPhoto-${role}`}>Can Send Photos</Label>
                    <p className="text-xs text-muted-foreground">Allow users to send photos.</p>
                  </div>
                  <Switch
                    id={`canSendPhoto-${role}`}
                    checked={localSettings[role!]?.canSendPhoto || false}
                    onCheckedChange={(checked) => handleSwitchChange(role, 'canSendPhoto', checked)}
                    disabled={role === 'Admin'}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <Label htmlFor={`canSendVideo-${role}`}>Can Send Videos</Label>
                     <p className="text-xs text-muted-foreground">Allow users to send videos.</p>
                  </div>
                  <Switch
                    id={`canSendVideo-${role}`}
                    checked={localSettings[role!]?.canSendVideo || false}
                    onCheckedChange={(checked) => handleSwitchChange(role, 'canSendVideo', checked)}
                    disabled={role === 'Admin'}
                  />
                </div>
              </div>
              {role !== 'Admin' && <Separator className="!mt-8" />}
            </div>
          ))}
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button type="button" onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
