
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Lyrics } from '@/lib/types';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, X, Music, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { db, storage } from '@/lib/firebase';
import { getDownloadURL, ref, uploadBytes, deleteObject } from 'firebase/storage';
import { addDoc, collection, serverTimestamp, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

const formSchema = z.object({
  title: z.string().min(2, { message: 'Title must be at least 2 characters.' }),
  slug: z.string().min(2, "Link is required").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Link can only contain lowercase letters, numbers, and single hyphens."),
  fullLyrics: z.string().min(10, { message: 'Lyrics must be at least 10 characters long.' }),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).min(1, { message: 'At least one tag is required.'}),
  songAudio: z.any().optional(),
  karaokeAudio: z.any().optional(),
});

interface LyricsFormProps {
    existingLyricsData?: Lyrics;
}


function AudioUpload({ field, label, helpText }: { field: any, label: string, helpText: string }) {
    const [fileName, setFileName] = useState<string | null>(typeof field.value === 'string' ? field.value.split('/').pop()?.split('?')[0].replace(/%2F/g, '/').split('/').pop() || null : null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            field.onChange(e.target.files);
            setFileName(file.name);
        }
    };
    
    return (
        <FormItem>
            <FormLabel>{label}</FormLabel>
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 border border-dashed rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                    <Music className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="flex-1">
                     <Input type="file" accept="audio/mpeg,audio/wav" onChange={handleFileChange} ref={inputRef} className="hidden" />
                     <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                        {fileName ? "Change" : "Upload"} Audio
                    </Button>
                    <FormDescription className="mt-2">{fileName ? `Selected: ${fileName}` : helpText}</FormDescription>
                </div>
             </div>
            <FormMessage />
        </FormItem>
    )
}

function TagsInput({ field }: { field: any }) {
    const [inputValue, setInputValue] = useState('');
    const addTag = () => {
        if (inputValue && !field.value.includes(inputValue)) {
            field.onChange([...field.value, inputValue.trim()]);
            setInputValue('');
        }
    };
    const removeTag = (tagToRemove: string) => {
        field.onChange(field.value.filter((tag: string) => tag !== tagToRemove));
    };

    return (
         <FormItem>
            <FormLabel>Tags</FormLabel>
             <div className="flex flex-wrap gap-2">
                {field.value.map((tag: string) => (
                    <div key={tag} className="flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
             <div className="flex gap-2">
                <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                    placeholder="Add tags (e.g., Pop, Ballad)"
                />
                 <Button type="button" onClick={addTag}>Add Tag</Button>
            </div>
            <FormDescription>Tags help people discover your lyrics.</FormDescription>
            <FormMessage />
        </FormItem>
    )
}


export function LyricsForm({ existingLyricsData }: LyricsFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: existingLyricsData ? {
            ...existingLyricsData,
            songAudio: existingLyricsData.songAudioUrl || undefined,
            karaokeAudio: existingLyricsData.karaokeAudioUrl || undefined,
        } : {
            title: '',
            slug: '',
            fullLyrics: '',
            description: '',
            tags: [],
        },
    });

    const titleValue = form.watch('title');

    const generateSlug = useCallback((title: string) => {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }, []);

    useEffect(() => {
        if (titleValue && !form.formState.dirtyFields.slug) {
            const slug = generateSlug(titleValue);
            form.setValue('slug', slug);
        }
    }, [titleValue, generateSlug, form]);

    async function checkSlugUniqueness(slug: string, currentId?: string): Promise<string> {
        const lyricsRef = collection(db, 'lyrics');
        let finalSlug = slug;
        let counter = 2;
        let isUnique = false;

        while (!isUnique) {
            const q = query(lyricsRef, where('slug', '==', finalSlug));
            const snapshot = await getDocs(q);
            if (snapshot.empty || (snapshot.docs.length === 1 && snapshot.docs[0].id === currentId)) {
                isUnique = true;
            } else {
                finalSlug = `${slug}-${counter}`;
                counter++;
            }
        }
        return finalSlug;
    }


    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!user) return;
        setLoading(true);

        try {
            const uniqueSlug = await checkSlugUniqueness(values.slug, existingLyricsData?.id);
            if (uniqueSlug !== values.slug) {
                form.setValue('slug', uniqueSlug);
                toast({ title: "Link updated", description: "The link was already taken and has been updated.", variant: "default" });
            }
            
            let songAudioUrl = existingLyricsData?.songAudioUrl || "";
            if (values.songAudio && typeof values.songAudio !== 'string') {
                 if (existingLyricsData?.songAudioUrl) {
                    await deleteObject(ref(storage, existingLyricsData.songAudioUrl)).catch(console.warn);
                 }
                 const file = values.songAudio[0];
                 const storageRef = ref(storage, `lyrics/${user.uid}/song/${Date.now()}_${file.name}`);
                 const uploadResult = await uploadBytes(storageRef, file);
                 songAudioUrl = await getDownloadURL(uploadResult.ref);
            }

            let karaokeAudioUrl = existingLyricsData?.karaokeAudioUrl || "";
            if (values.karaokeAudio && typeof values.karaokeAudio !== 'string') {
                 if (existingLyricsData?.karaokeAudioUrl) {
                    await deleteObject(ref(storage, existingLyricsData.karaokeAudioUrl)).catch(console.warn);
                 }
                 const file = values.karaokeAudio[0];
                 const storageRef = ref(storage, `lyrics/${user.uid}/karaoke/${Date.now()}_${file.name}`);
                 const uploadResult = await uploadBytes(storageRef, file);
                 karaokeAudioUrl = await getDownloadURL(uploadResult.ref);
            }

            const lyricsData = {
                title: values.title,
                slug: uniqueSlug,
                fullLyrics: values.fullLyrics,
                description: values.description || "",
                tags: values.tags,
                authorId: user.uid,
                songAudioUrl,
                karaokeAudioUrl,
            };

            if (existingLyricsData) {
                const docRef = doc(db, 'lyrics', existingLyricsData.id);
                await updateDoc(docRef, { ...lyricsData, updatedAt: serverTimestamp() });
            } else {
                await addDoc(collection(db, "lyrics"), {
                     ...lyricsData,
                    viewCount: 0,
                    likes: [],
                    shareCount: 0,
                    commentCount: 0,
                    createdAt: serverTimestamp(),
                });
            }


            toast({
              title: existingLyricsData ? 'Lyrics Updated!' : 'Lyrics Published!',
              description: `Your lyrics "${values.title}" have been successfully saved.`,
            });
            router.push(`/lyrics/${uniqueSlug}`); 
            router.refresh();
        } catch (error) {
            console.error("Error saving lyrics: ", error);
            toast({ title: "Error", description: "Failed to save lyrics.", variant: "destructive"});
        } finally {
            setLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{existingLyricsData ? 'Edit Lyrics' : 'Publish New Lyrics'}</CardTitle>
                        <CardDescription>Provide the information for your song lyrics.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Summer Rain" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />

                        <FormField control={form.control} name="slug" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Link</FormLabel>
                                <FormControl><Input placeholder="e.g., summer-rain" {...field} /></FormControl>
                                <FormDescription>This will be the unique URL for your lyrics.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="fullLyrics" render={({ field }) => (
                            <FormItem><FormLabel>Full Lyrics</FormLabel><FormControl><Textarea placeholder="Verse 1..." {...field} rows={15} /></FormControl><FormMessage /></FormItem>
                        )} />
                        
                         <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="The story behind the song..." {...field} rows={5} /></FormControl><FormMessage /></FormItem>
                        )} />
                         
                         <FormField control={form.control} name="tags" render={({ field }) => <TagsInput field={field} />} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Audio Uploads</CardTitle>
                        <CardDescription>Optionally, upload audio files for your song.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="songAudio" render={({ field }) => (
                            <AudioUpload field={field} label="Full Song Audio" helpText="Upload the full version of your song (MP3, WAV)." />
                        )} />
                        <FormField control={form.control} name="karaokeAudio" render={({ field }) => (
                             <AudioUpload field={field} label="Karaoke / Instrumental Audio" helpText="Upload the instrumental version of your song (MP3, WAV)." />
                        )} />
                    </CardContent>
                </Card>

                <Button type="submit" size="lg" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {existingLyricsData ? "Save Changes" : "Publish Lyrics"}
                </Button>
            </form>
        </Form>
    );
}
