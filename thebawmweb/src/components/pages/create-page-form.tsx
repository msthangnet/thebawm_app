
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, arrayUnion } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

const pageFormSchema = z.object({
  name: z.string().min(3, "Page name must be at least 3 characters long.").max(50, "Page name must be 50 characters or less."),
  pageId: z.string()
    .min(3, "Page ID must be at least 3 characters.")
    .max(30, "Page ID must be 30 characters or less.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Page ID can only contain lowercase letters, numbers, and single hyphens."),
  category: z.string().min(1, "Category is required.").max(30, "Category must be 30 characters or less."),
  description: z.string().max(255, "Description must be 255 characters or less.").optional(),
  profilePicture: z.any().optional(),
});

type PageFormValues = z.infer<typeof pageFormSchema>;

export function CreatePageForm() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const form = useForm<PageFormValues>({
        resolver: zodResolver(pageFormSchema),
        defaultValues: {
            name: "",
            pageId: "",
            category: "",
            description: "",
        },
    });

    async function onSubmit(values: PageFormValues) {
        if (!user) {
            toast({ title: "Error", description: "You must be logged in to create a page.", variant: "destructive" });
            return;
        }

        setLoading(true);

        try {
            // Check if pageId is unique
            const pagesRef = collection(db, "pages");
            const q = query(pagesRef, where("pageId", "==", values.pageId));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                form.setError("pageId", { type: "manual", message: "This Page ID is already taken." });
                setLoading(false);
                return;
            }

            let profilePictureUrl = "";
            if (values.profilePicture && values.profilePicture[0]) {
                 const file = values.profilePicture[0];
                 const storageRef = ref(storage, `pages/${values.pageId}/profile/${file.name}`);
                 const uploadResult = await uploadBytes(storageRef, file);
                 profilePictureUrl = await getDownloadURL(uploadResult.ref);
            }

            const newPageRef = await addDoc(collection(db, "pages"), {
                name: values.name,
                pageId: values.pageId,
                category: values.category,
                description: values.description || "",
                ownerId: user.uid,
                admins: [user.uid],
                followers: [user.uid],
                likes: [],
                createdAt: serverTimestamp(),
                profilePictureUrl: profilePictureUrl,
                coverImageUrl: "",
                posters: 'admins', // Default setting
            });

            // Add page to user's followed pages
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                followedPages: arrayUnion(newPageRef.id)
            });
            
            toast({ title: "Page Created!", description: `The page "${values.name}" has been successfully created.` });
            router.push(`/pages/${values.pageId}`);

        } catch (error) {
            console.error("Error creating page:", error);
            toast({ title: "Error", description: "Could not create the page. Please try again.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Page Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., My Awesome Community" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="pageId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Page ID</FormLabel>
                            <FormControl>
                                <Input placeholder="my-awesome-community" {...field} />
                            </FormControl>
                             <FormDescription>
                                This will be your page's unique web address. Use only lowercase letters, numbers, and hyphens.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Hobbies, Business, Gaming" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Tell everyone what your page is about." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="profilePicture"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Profile Picture (Optional)</FormLabel>
                            <FormControl>
                                <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files)} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Page
                    </Button>
                </div>
            </form>
        </Form>
    );
}
