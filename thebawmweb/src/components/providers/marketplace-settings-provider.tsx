
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MarketplacePermissions, DefaultMarketplacePermissions } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

interface MarketplaceSettingsContextType {
    settings: MarketplacePermissions;
    loading: boolean;
}

const MarketplaceSettingsContext = createContext<MarketplaceSettingsContextType | undefined>(undefined);

export function MarketplaceSettingsProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [settings, setSettings] = useState<MarketplacePermissions>(DefaultMarketplacePermissions);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const settingsRef = doc(db, 'app_settings', 'marketplacePermissions');
        const unsubscribe = onSnapshot(settingsRef, (doc) => {
            if (doc.exists()) {
                setSettings(doc.data() as MarketplacePermissions);
            } else {
                setSettings(DefaultMarketplacePermissions);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching marketplace settings:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return (
        <MarketplaceSettingsContext.Provider value={{ settings, loading }}>
            {children}
        </MarketplaceSettingsContext.Provider>
    );
}

export function useMarketplaceSettings() {
    const context = useContext(MarketplaceSettingsContext);
    if (context === undefined) {
        throw new Error('useMarketplaceSettings must be used within a MarketplaceSettingsProvider');
    }
    return context;
}
