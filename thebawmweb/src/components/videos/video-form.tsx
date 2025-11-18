
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Upload, Calendar as CalendarIcon, Video, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/hooks/use-auth';
import { db, storage } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes, deleteObject } from 'firebase/storage';
import { Video as VideoType } from '@/lib/types';

const videoQualityLevels = ["144p", "360p", "720p", "1080p"] as const;

const formSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters.' }),
  slug: z.string().min(3, "Link is required").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Link can only contain lowercase letters, numbers, and single hyphens."),
  description: z.string().max(5000, { message: 'Description is too long.' }).optional(),
  videoFiles: z.object({
    "144p": z.any().optional(),
    "360p": z.any().optional(),
    "720p": z.any().optional(),
    "1080p": z.any().optional(),
  }).refine(files => Object.values(files).some(file => file?.length > 0 || typeof file === 'string'), {
    message: 'At least one video quality is required.'
  }),
  thumbnailFile: z.any().refine(file => file?.length > 0 || typeof file === 'string', 'A thumbnail image is required.'),
  tags: z.array(z.string()).min(1, { message: 'At least one tag is required.'}),
  scheduledTime: z.date().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function TagsInput({ field }: { field: any }) {
    const [inputValue, setInputValue] = useState('');
    const addTag = () => {
        if (inputValue && !field.value.includes(inputValue)) {
            field.onChange([...field.value, inputValue]);
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
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="Add a tag and press Enter"
                />
                 <Button type="button" onClick={addTag}>Add Tag</Button>
            </div>
            <FormDescription>Tags help people find your video. Add up to 10 tags.</FormDescription>
            <FormMessage />
        </FormItem>
    )
}

export function VideoForm({ existingVideoData }: { existingVideoData?: VideoType }) {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(existingVideoData?.thumbnailUrl || null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: existingVideoData ? {
            ...existingVideoData,
            scheduledTime: existingVideoData.scheduledTime ? new Date(existingVideoData.scheduledTime) : undefined,
            videoFiles: existingVideoData.videoUrls,
            thumbnailFile: existingVideoData.thumbnailUrl,
        } : {
            title: '',
            slug: '',
            description: '',
            tags: [],
            videoFiles: {},
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
        if (titleValue && !form.formState.dirtyFields.slug && !existingVideoData) {
            const slug = generateSlug(titleValue);
            form.setValue('slug', slug);
        }
    }, [titleValue, generateSlug, form, existingVideoData]);

    async function checkSlugUniqueness(slug: string): Promise<string> {
        if(existingVideoData?.slug === slug) return slug;

        const videosRef = collection(db, 'videos');
        let finalSlug = slug;
        let counter = 2;
        let isUnique = false;

        while (!isUnique) {
            const q = query(videosRef, where('slug', '==', finalSlug));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                isUnique = true;
            } else {
                finalSlug = `${slug}-${counter}`;
                counter++;
            }
        }
        return finalSlug;
    }


    async function onSubmit(values: FormValues) {
        if (!user) {
            toast({ title: "Authentication Error", description: "You must be logged in to publish a video.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const uniqueSlug = await checkSlugUniqueness(values.slug);
            if (uniqueSlug !== values.slug) {
                form.setValue('slug', uniqueSlug);
                 toast({ title: "Link updated", description: "The link was already taken and has been updated.", variant: "default" });
            }
            
            const videoUrls: Record<string, string> = existingVideoData?.videoUrls || {};
            const fileName = values.title.replace(/\s+/g, '-').toLowerCase();

            for (const quality of videoQualityLevels) {
                const fileList = values.videoFiles[quality];
                if (fileList && typeof fileList !== 'string') {
                    if (videoUrls[quality]) {
                        await deleteObject(ref(storage, videoUrls[quality])).catch(err => console.warn("Old video file not found, skipping delete.", err));
                    }
                    const file = fileList[0];
                    const storageRef = ref(storage, `videos/${user.uid}/${quality}/${fileName}`);
                    const uploadResult = await uploadBytes(storageRef, file);
                    videoUrls[quality] = await getDownloadURL(uploadResult.ref);
                }
            }
            
            let thumbnailUrl = existingVideoData?.thumbnailUrl || "";
            if (values.thumbnailFile && typeof values.thumbnailFile !== 'string') {
                if (thumbnailUrl) {
                    await deleteObject(ref(storage, thumbnailUrl)).catch(err => console.warn("Old thumbnail not found, skipping delete.", err));
                }
                const thumbnailFile = values.thumbnailFile[0];
                const thumbnailStorageRef = ref(storage, `videos/${user.uid}/thumbnails/${Date.now()}-${thumbnailFile.name}`);
                const thumbnailUploadResult = await uploadBytes(thumbnailStorageRef, thumbnailFile);
                thumbnailUrl = await getDownloadURL(thumbnailUploadResult.ref);
            }

            const videoData = {
                title: values.title,
                slug: uniqueSlug,
                description: values.description || "",
                tags: values.tags,
                videoUrls,
                thumbnailUrl,
                uploaderId: user.uid,
                scheduledTime: values.scheduledTime || null,
            };

            if (existingVideoData) {
                const videoRef = doc(db, 'videos', existingVideoData.id);
                await updateDoc(videoRef, { ...videoData });
                toast({ title: "Video Updated!", description: `Your video "${values.title}" has been updated.` });
            } else {
                await addDoc(collection(db, "videos"), {
                    ...videoData,
                    viewCount: 0,
                    likes: [],
                    dislikes: [],
                    createdAt: serverTimestamp(),
                });
                toast({
                    title: values.scheduledTime ? 'Video Scheduled!' : 'Video Published!',
                    description: `Your video "${values.title}" is being processed.`,
                });
            }
            
            router.push('/videos');
            router.refresh();

        } catch (error) {
            console.error("Error saving video:", error);
            toast({ title: "Error", description: "Something went wrong while saving the video.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="space-y-4 rounded-md border p-4">
                    <h3 className="font-semibold">Video Files</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {videoQualityLevels.map(quality => (
                        <FormField
                            key={quality}
                            control={form.control}
                            name={`videoFiles.${quality}`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Video ({quality})</FormLabel>
                                    <FormControl>
                                        <Input type="file" accept="video/mp4,video/quicktime" onChange={(e) => field.onChange(e.target.files)} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    ))}
                    </div>
                    <FormMessage>{form.formState.errors.videoFiles?.message}</FormMessage>
                    </div>
                <FormField
                    control={form.control}
                    name="thumbnailFile"
                    render={({ field }) => (
                         <FormItem>
                            <FormLabel>Thumbnail Image</FormLabel>
                            <div className="flex items-center gap-4">
                                <div className="w-48 h-27 border border-dashed rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                                {thumbnailPreview ? (
                                    <Image src={thumbnailPreview} alt="Thumbnail preview" width={192} height={108} className="object-cover w-full h-full" />
                                ) : (
                                    <Upload className="w-12 h-12 text-muted-foreground" />
                                )}
                                </div>
                                <div>
                                    <Input 
                                        type="file" 
                                        accept="image/jpeg,image/png" 
                                        onChange={(e) => {
                                            field.onChange(e.target.files);
                                            if (e.target.files && e.target.files[0]) {
                                                setThumbnailPreview(URL.createObjectURL(e.target.files[0]));
                                            }
                                        }} 
                                        className="hidden" 
                                        ref={field.ref}
                                    />
                                    <Button type="button" variant="outline" onClick={() => document.getElementById('thumbnail-input')?.click()}>
                                        {thumbnailPreview ? "Change" : "Select"} Image
                                    </Button>
                                    <Input id="thumbnail-input" type="file" accept="image/jpeg,image/png" onChange={(e) => {
                                        field.onChange(e.target.files);
                                        if (e.target.files && e.target.files[0]) {
                                            setThumbnailPreview(URL.createObjectURL(e.target.files[0]));
                                        }
                                    }} className="hidden"/>
                                    <FormDescription className="mt-2">Recommended 16:9 ratio.</FormDescription>
                                </div>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl><Input placeholder="My Awesome Video" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                    <FormField control={form.control} name="slug" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Link</FormLabel>
                        <FormControl><Input placeholder="my-awesome-video" {...field} disabled={!!existingVideoData} /></FormControl>
                        <FormDescription>This will be the unique URL for your video.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )} />
                
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Textarea placeholder="Tell everyone about your video" rows={5} {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => <TagsInput field={field} />}
                />

                <FormField
                    control={form.control}
                    name="scheduledTime"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Schedule Publication (Optional)</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant={'outline'} className={cn('w-[240px] pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                            {field.value ? format(new Date(field.value), 'PPP p') : <span>Publish now</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <FormDescription>Select a date and time to publish your video in the future.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" size="lg" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {existingVideoData ? 'Save Changes' : (form.getValues('scheduledTime') ? 'Schedule Video' : 'Publish Video')}
                </Button>
            </form>
        </Form>
    );
}
