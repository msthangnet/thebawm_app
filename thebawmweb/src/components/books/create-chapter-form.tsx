
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
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, serverTimestamp, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Publication, PublicationPage } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const chapterFormSchema = z.object({
  title: z.string().min(1, "Chapter title is required.").max(100),
  contentType: z.enum(['paragraph', 'code']),
  content: z.string().min(1, "Content is required."),
});

type ChapterFormValues = z.infer<typeof chapterFormSchema>;

export function CreateChapterForm({ book, onFinished }: { book: Publication, onFinished: () => void }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const form = useForm<ChapterFormValues>({
        resolver: zodResolver(chapterFormSchema),
        defaultValues: {
            title: "",
            contentType: "paragraph",
            content: ""
        },
    });

    async function onSubmit(values: ChapterFormValues) {
        setLoading(true);
        try {
            const pagesCollectionRef = collection(db, `publications/${book.id}/pages`);
            const pagesSnapshot = await getDocs(pagesCollectionRef);
            const newOrder = pagesSnapshot.size;

            await addDoc(pagesCollectionRef, {
                title: values.title,
                contentType: values.contentType,
                content: values.content,
                order: newOrder,
                createdAt: serverTimestamp(),
            });

            toast({ title: "Chapter Created!", description: `"${values.title}" has been added.` });
            onFinished();

        } catch (error) {
            console.error("Error creating chapter:", error);
            toast({ title: "Error", description: "Could not create the chapter.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Chapter Title</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Introduction" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="contentType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Content Type</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a content type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="paragraph">Paragraph</SelectItem>
                                    <SelectItem value="code">Code</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Content</FormLabel>
                            <FormControl>
                                <Textarea 
                                  placeholder="Write your chapter content here..." 
                                  {...field} 
                                  className="min-h-[200px]"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Chapter
                    </Button>
                </div>
            </form>
        </Form>
    );
}
