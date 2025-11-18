
'use client';
import { CreateProductForm } from "@/components/marketplace/create-product-form";
import { MarketplaceSettingsProvider } from "@/components/providers/marketplace-settings-provider";

export default function AddProductPage() {
    return (
        <MarketplaceSettingsProvider>
            <div className="max-w-2xl mx-auto py-8">
                <CreateProductForm />
            </div>
        </MarketplaceSettingsProvider>
    )
}
