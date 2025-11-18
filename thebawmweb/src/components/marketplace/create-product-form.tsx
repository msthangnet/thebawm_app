
'use client';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useMarketplaceSettings } from '@/components/providers/marketplace-settings-provider';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Upload, X, Loader2 } from 'lucide-react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ProductCategory, Product } from '@/lib/types';
import Link from 'next/link';


const allCategories: ProductCategory[] = ['Women Fashion', 'Men Fashion', 'Traditional', 'Culture', 'Hand crafted', 'Electronic', 'Foods', 'Kids assets', 'Instruments', 'others'];

const formSchema = z.object({
  name: z.string().min(3, "Product name is too short").max(100, "Product name is too long"),
  description: z.string().min(10, "Description is too short").max(5000, "Description is too long"),
  price: z.coerce.number().min(0.01, "Price must be positive"),
  category: z.enum(allCategories, { required_error: "Please select a category" }),
  stock: z.coerce.number().int().min(0, "Stock can't be negative"),
  images: z.array(z.any()).min(1, "At least one image is required").max(5, "You can upload up to 5 images"),
  sellerContact: z.string().min(10, "Please provide a valid contact number"),
});

type ProductFormValues = z.infer<typeof formSchema>;

export function CreateProductForm() {
    const { user, userProfile } = useAuth();
    const { settings, loading: settingsLoading } = useMarketplaceSettings();
    const router = useRouter();
    const { toast } = useToast();
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            description: '',
            price: 0,
            stock: 1,
            images: [],
            sellerContact: '',
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "images"
    });

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newFiles = Array.from(files);
            const totalFiles = fields.length + newFiles.length;

            if (totalFiles > 5) {
                toast({ title: "Image Limit Exceeded", description: "You can upload a maximum of 5 images.", variant: "destructive" });
                return;
            }

            append(newFiles);
            const newPreviews = newFiles.map(file => URL.createObjectURL(file));
            setImagePreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeImage = (index: number) => {
        remove(index);
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };


    async function onSubmit(values: ProductFormValues) {
        if (!user) return;
        setLoading(true);

        try {
            const imageUrls: string[] = await Promise.all(
                values.images.map(async (imageFile) => {
                    const storageRef = ref(storage, `products/${user.uid}/${Date.now()}_${imageFile.name}`);
                    const uploadResult = await uploadBytes(storageRef, imageFile);
                    return getDownloadURL(uploadResult.ref);
                })
            );

            const productData: Omit<Product, 'id' | 'createdAt'> = {
                name: values.name,
                description: values.description,
                price: values.price,
                category: values.category,
                stock: values.stock,
                images: imageUrls,
                sellerId: user.uid,
                sellerContact: values.sellerContact,
            };

            const docRef = await addDoc(collection(db, 'products'), {
                ...productData,
                createdAt: serverTimestamp(),
            });
            toast({ title: "Product Listed!", description: "Your product is now live on the marketplace." });
            router.push(`/marketplace/${docRef.id}`);

        } catch (error) {
            console.error("Error creating product:", error);
            toast({ title: "Error", description: "Could not list your product.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }
    
    if (settingsLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8" /></div>
    }

    const canPublish = user && (settings.allowedUserIds.includes(user.uid) || userProfile?.userType === 'Admin');

    if (!canPublish) {
         return (
            <Card>
                <CardHeader>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>You do not have permission to sell products on the marketplace.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>If you believe this is a mistake, please contact an administrator.</p>
                     <Button asChild className="mt-4"><Link href="/marketplace">Back to Marketplace</Link></Button>
                </CardContent>
            </Card>
        );
    }
    

    return (
        <Card>
            <CardHeader>
                <CardTitle>List a New Product</CardTitle>
                <CardDescription>Fill out the form below to sell your item on the marketplace.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Product Name</FormLabel>
                                    <FormControl><Input {...field} placeholder="e.g., Hand-Woven Scarf" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl><Textarea {...field} placeholder="Describe your product in detail..." rows={5} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Price ($)</FormLabel>
                                        <FormControl><Input {...field} type="number" step="0.01" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="stock"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Stock Quantity</FormLabel>
                                        <FormControl><Input {...field} type="number" min="0" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category</FormLabel>
                                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {allCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="sellerContact"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contact Number (WhatsApp)</FormLabel>
                                    <FormControl><Input {...field} placeholder="e.g., +1234567890" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="space-y-2">
                             <FormLabel>Product Images (up to 5)</FormLabel>
                             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                 {imagePreviews.map((preview, index) => (
                                     <div key={index} className="relative aspect-square">
                                         <Image src={preview} alt={`Preview ${index}`} fill className="object-cover rounded-md" />
                                         <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeImage(index)}>
                                             <X className="h-4 w-4" />
                                         </Button>
                                     </div>
                                 ))}
                                 {fields.length < 5 && (
                                     <label htmlFor="image-upload" className="flex flex-col items-center justify-center aspect-square border-2 border-dashed rounded-md cursor-pointer hover:bg-muted">
                                         <Upload className="h-8 w-8 text-muted-foreground" />
                                         <span className="text-xs text-muted-foreground mt-1">Upload</span>
                                     </label>
                                 )}
                             </div>
                             <Input id="image-upload" type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                             {form.formState.errors.images && <FormMessage>{form.formState.errors.images.message?.toString()}</FormMessage>}
                        </div>
                        
                        <div className="flex justify-end">
                            <Button type="submit" size="lg" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {loading ? "Listing Product..." : "List Product"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
