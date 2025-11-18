
'use client';
import { useState, useEffect } from 'react';
import { ProductCard } from '@/components/marketplace/product-card';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MarketplaceSettingsProvider, useMarketplaceSettings } from '@/components/providers/marketplace-settings-provider';
import { Plus, Search, ListFilter, Settings, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Product, ProductCategory } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getProducts } from '@/services/firestore';
import { Loader2 } from 'lucide-react';

const allCategories: ProductCategory[] = ['Women Fashion', 'Men Fashion', 'Traditional', 'Culture', 'Hand crafted', 'Electronic', 'Foods', 'Kids assets', 'Instruments', 'others'];

function MarketplacePageContent() {
    const { user, userProfile } = useAuth();
    const { settings } = useMarketplaceSettings();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'All'>('All');
    const [sortBy, setSortBy] = useState('newest');
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

     useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const fetchedProducts = await getProducts();
                setProducts(fetchedProducts);
            } catch (error) {
                console.error("Error fetching products:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const isAdmin = userProfile?.userType === 'Admin';
    const canPublish = user && (settings.allowedUserIds.includes(user.uid) || isAdmin);

    const filteredAndSortedProducts = products
        .filter(product => {
            const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
            const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCategory && matchesSearch;
        })
        .sort((a, b) => {
            switch(sortBy) {
                case 'price-asc':
                    return a.price - b.price;
                case 'price-desc':
                    return b.price - a.price;
                case 'newest':
                default:
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
        });

      return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div className="relative w-full md:w-auto flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search for products..."
                        className="pl-10 md:w-[220px]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as ProductCategory | 'All')}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <Tag className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Categories</SelectItem>
                            {allCategories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <ListFilter className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest</SelectItem>
                            <SelectItem value="price-asc">Price: Low to High</SelectItem>
                            <SelectItem value="price-desc">Price: High to Low</SelectItem>
                        </SelectContent>
                    </Select>
                    {canPublish && (
                        <Button asChild>
                            <Link href="/marketplace/add-product">
                                <Plus className="mr-1 h-4 w-4" /> Add
                            </Link>
                        </Button>
                    )}
                    {isAdmin && (
                        <Button asChild variant="outline" size="icon">
                            <Link href="/admin/marketplace-settings">
                                <Settings className="h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
                         
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                    {filteredAndSortedProducts.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}

             {!loading && filteredAndSortedProducts.length === 0 && (
                <div className="text-center py-16 text-muted-foreground bg-muted rounded-lg col-span-full">
                    <h3 className="text-2xl font-semibold">No products found.</h3>
                    <p>Try a different search term or category!</p>
                </div>
            )}
        </div>
    );
}

export default function MarketplacePage() {
    return (
        <MarketplaceSettingsProvider>
            <MarketplacePageContent />
        </MarketplaceSettingsProvider>
    )
}
