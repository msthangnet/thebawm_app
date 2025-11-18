
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/lib/types';

export function ProductCard({ product }: { product: Product }) {
    return (
        <Link href={`/marketplace/${product.id}`} className="group">
            <Card className="overflow-hidden h-full flex flex-col">
                <div className="aspect-square relative">
                    <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                    />
                     <Badge className="absolute top-2 right-2">{product.category}</Badge>
                </div>
                <CardContent className="p-4 flex-grow flex flex-col justify-between">
                    <div>
                        <h3 className="font-semibold text-lg truncate group-hover:text-primary">{product.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                    </div>
                    <p className="font-bold text-xl mt-2 text-primary">${product.price.toFixed(2)}</p>
                </CardContent>
            </Card>
        </Link>
    );
}
