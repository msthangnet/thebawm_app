
'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MessageSettings, UserProfile } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { AssignableUserTypes } from '@/lib/types';

interface MessageSettingsContextType {
    settings: MessageSettings;
    setSettings: (settings: MessageSettings) => void;
    loading: boolean;
}

const defaultSettings: MessageSettings = AssignableUserTypes.reduce((acc, role) => {
    if (role) {
        acc[role] = { canSendPhoto: role === 'Admin', canSendVideo: role === 'Admin' };
    }
    return acc;
}, {} as MessageSettings);


const MessageSettingsContext = createContext<MessageSettingsContextType | undefined>(undefined);

export function MessageSettingsProvider({ children }: { children: ReactNode }) {
    const { user, userProfile } = useAuth();
    const [settings, setSettings] = useState<MessageSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || userProfile?.userType !== 'Admin') {
            setLoading(false);
            return;
        }

        const settingsRef = doc(db, 'app_settings', 'messagePermissions');
        const unsubscribe = onSnapshot(settingsRef, (doc) => {
            if (doc.exists()) {
                setSettings(doc.data() as MessageSettings);
            } else {
                setSettings(defaultSettings);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching message settings:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, userProfile]);

    const handleSetSettings = async (newSettings: MessageSettings) => {
        setSettings(newSettings);
        if (userProfile?.userType === 'Admin') {
            const settingsRef = doc(db, 'app_settings', 'messagePermissions');
            await setDoc(settingsRef, newSettings, { merge: true });
        }
    };

    return (
        <MessageSettingsContext.Provider value={{ settings, setSettings: handleSetSettings, loading }}>
            {children}
        </MessageSettingsContext.Provider>
    );
}

export function useMessageSettings() {
    const context = useContext(MessageSettingsContext);
    if (context === undefined) {
        throw new Error('useMessageSettings must be used within a MessageSettingsProvider');
    }
    return context;
}
