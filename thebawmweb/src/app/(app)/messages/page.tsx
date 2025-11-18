"use client";

import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { ChatLayout } from "@/components/messages/chat-layout";
import { MessageSettingsProvider } from "@/context/message-settings-context";

export default function MessagesPage() {
    const { user, loading } = useAuth();
    
    if (loading || !user) {
        return (
          <div className="flex h-screen items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        );
    }
    
    return (
        <MessageSettingsProvider>
            <div className="h-[calc(100vh-theme(spacing.16))]">
                <ChatLayout currentUser={user} />
            </div>
        </MessageSettingsProvider>
    )
}
