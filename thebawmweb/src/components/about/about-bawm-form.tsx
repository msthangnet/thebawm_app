

"use client";

import { useForm, useFieldArray, useFormContext, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { AboutBawm, AboutBawmPage } from '@/lib/types';
import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Upload, CalendarIcon, PlusCircle, Trash2, GripVertical, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAuth } from '@/hooks/use-auth';
import { addDoc, collection, serverTimestamp, getDocs, query, where, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { getDownloadURL, ref, uploadBytes, deleteObject } from 'firebase/storage';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';

const pageSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Page title cannot be empty.'),
  content: z.string().optional(),
  contentType: z.enum(['paragraph', 'code']).default('paragraph'),
  imageUrls: z.array(z.string().url()).optional(),
  imageFiles: z.array(z.any()).optional(),
  order: z.number(),
});

const formSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }),
  slug: z.string()
    .min(3, "Link must be at least 3 characters.")
    .max(50, "Link must be 50 characters or less.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Link can only contain lowercase letters, numbers, and single hyphens."),
  description: z.string().max(2000).optional(),
  coverPhotoUrl: z.any().optional(),
  tags: z.array(z.string()).optional(),
  publishDate: z.date().optional(),
  pages: z.array(pageSchema).min(1, 'Content must have at least one page.'),
});

type AboutBawmFormValues = z.infer<typeof formSchema>;

function ImageUpload({ field, label, helpText, aspectRatio = 'square', alt }: {
    field: any;
    label: string;
    helpText: string;
    aspectRatio?: 'square' | 'portrait' | 'landscape';
    alt: string;
}) {
    const [preview, setPreview] = useState<string | null>(typeof field.value === 'string' ? field.value : null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            field.onChange(e.target.files);
        }
    };

    return (
        <FormItem>
            <FormLabel>{label}</FormLabel>
            <div className="items-center gap-4 grid grid-cols-1 sm:grid-cols-3">
                 <div className={cn("rounded-md border border-dashed flex items-center justify-center bg-muted overflow-hidden", {
                     'aspect-square w-32 h-32': aspectRatio === 'square',
                     'aspect-[2/3] w-32': aspectRatio === 'portrait',
                     'aspect-video w-full': aspectRatio === 'landscape'
                 })}>
                    {preview ? (
                        <Image src={preview} alt={alt} width={128} height={128} className="object-cover w-full h-full" data-ai-hint="book image" />
                    ) : (
                        <Upload className="w-8 h-8 text-muted-foreground" />
                    )}
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                     <FormControl>
                        <Input type="file" accept="image/*" onChange={handleFileChange} className="hidden" ref={inputRef} />
                    </FormControl>
                    <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>Upload Image</Button>
                     <FormDescription>{helpText}</FormDescription>
                </div>
            </div>
             <FormMessage />
        </FormItem>
    );
}

function TagsInput({ field }: { field: any }) {
    const [inputValue, setInputValue] = useState('');
    const addTag = () => {
        if (inputValue && !field.value?.includes(inputValue)) {
            field.onChange([...(field.value || []), inputValue.trim()]);
            setInputValue('');
        }
    };
    const removeTag = (tagToRemove: string) => {
        field.onChange(field.value?.filter((tag: string) => tag !== tagToRemove));
    };

    return (
         <FormItem>
            <FormLabel>Tags</FormLabel>
             <div className="flex flex-wrap gap-2">
                {(field.value || []).map((tag: string) => (
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
                    placeholder="Add tags..."
                />
                 <Button type="button" onClick={addTag}>Add Tag</Button>
            </div>
            <FormDescription>Tags help people discover your content.</FormDescription>
            <FormMessage />
        </FormItem>
    )
}

function PageContentEditor({ pageIndex }: { pageIndex: number }) {
    const { control, watch, setValue } = useFormContext<AboutBawmFormValues>();
    const [previewScript, setPreviewScript] = useState(false);
    
    const contentValue = watch(`pages.${pageIndex}.content`);
    const contentType = watch(`pages.${pageIndex}.contentType`);
    const imageUrls = watch(`pages.${pageIndex}.imageUrls`) || [];
    const imageFiles = watch(`pages.${pageIndex}.imageFiles`) || [];
    const [imagePreviews, setImagePreviews] = useState<string[]>(imageUrls);

    const handleImageFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        
        const currentFiles = (imageFiles || []);
        const totalFiles = currentFiles.length + files.length;
        if (totalFiles > 4) {
            alert("You can only upload a maximum of 4 images.");
            return;
        }
        
        setValue(`pages.${pageIndex}.imageFiles`, [...currentFiles, ...files]);
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...newPreviews]);
    };
    
    const removeImage = (indexToRemove: number) => {
        const currentUrls = [...(imageUrls || [])];
        const currentFiles = [...(imageFiles || [])];

        // This logic handles removing either an existing URL or a newly added file
        if(indexToRemove < currentUrls.length){
            currentUrls.splice(indexToRemove, 1);
        } else {
            const fileIndex = indexToRemove - currentUrls.length;
            currentFiles.splice(fileIndex, 1);
        }
        
        setValue(`pages.${pageIndex}.imageUrls`, currentUrls);
        setValue(`pages.${pageIndex}.imageFiles`, currentFiles);

        const newPreviews = [...imagePreviews];
        newPreviews.splice(indexToRemove, 1);
        setImagePreviews(newPreviews);
    };

    return (
        <Card className="p-4 bg-muted/50">
            <div className="space-y-4">
                 <FormField control={control} name={`pages.${pageIndex}.title`} render={({ field }) => (
                    <FormItem><FormLabel>Page Title</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField
                    control={control}
                    name={`pages.${pageIndex}.contentType`}
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
                                    <SelectItem value="code">Code (HTML)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                {contentType === 'paragraph' && (
                    <FormField control={control} name={`pages.${pageIndex}.content`} render={({ field }) => (
                        <FormItem><FormLabel>Content</FormLabel><FormControl><Textarea {...field} rows={15} placeholder="Start writing your page..." value={field.value || ''}/></FormControl><FormMessage /></FormItem>
                    )} />
                )}
                {contentType === 'code' && (
                    <div>
                         <div className="flex justify-between items-center mb-2">
                             <FormLabel>HTML Content</FormLabel>
                             <div className="flex items-center gap-2">
                                <Switch id="preview-switch" checked={previewScript} onCheckedChange={setPreviewScript} />
                                <Label htmlFor="preview-switch">Preview</Label>
                             </div>
                         </div>
                         {previewScript ? (
                             <div className="p-4 border rounded-md min-h-[300px] bg-white" dangerouslySetInnerHTML={{ __html: contentValue || '' }} />
                         ) : (
                             <FormField control={control} name={`pages.${pageIndex}.content`} render={({ field }) => (
                                <FormItem><FormControl><Textarea {...field} rows={15} placeholder="<html>...</html>" value={field.value || ''}/></FormControl><FormMessage /></FormItem>
                            )} />
                         )}
                    </div>
                )}

                 <div className="space-y-2">
                    <Label>Page Images (up to 4)</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {imagePreviews.map((src, index) => (
                            <div key={index} className="relative aspect-square">
                                <Image src={src} alt={`Preview ${index + 1}`} fill className="object-cover rounded-md" />
                                <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeImage(index)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    {imagePreviews.length < 4 && (
                        <div className="flex items-center">
                            <Input id={`image-upload-${pageIndex}`} type="file" multiple accept="image/*" className="hidden" onChange={handleImageFilesChange} />
                            <Button type="button" variant="outline" asChild>
                                <label htmlFor={`image-upload-${pageIndex}`} className="cursor-pointer">
                                    <Upload className="mr-2 h-4 w-4" /> Add Images
                                </label>
                            </Button>
                        </div>
                    )}
                 </div>
            </div>
        </Card>
    );
}

function PageEditor() {
    const { control } = useFormContext<AboutBawmFormValues>();
    const { fields, append, remove, move } = useFieldArray({
        control,
        name: 'pages'
    });

    const [activePageIndex, setActivePageIndex] = useState(0);

    const addPage = () => {
        const newIndex = fields.length;
        append({ id: `p-${Date.now()}`, title: `Page ${newIndex + 1}`, content: '', contentType: 'paragraph', order: newIndex, imageUrls: [], imageFiles: [] });
        setActivePageIndex(newIndex);
    };
    
    const activePage = fields[activePageIndex];

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1 space-y-2">
                {fields.map((field, index) => (
                    <div key={field.id} className={cn("flex items-center gap-2 p-2 rounded-md", activePageIndex === index && "bg-primary/10")}>
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                        <button type="button" className="flex-grow text-left truncate" onClick={() => setActivePageIndex(index)}>
                            {field.title || `Page ${index + 1}`}
                        </button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                ))}
                <Button type="button" variant="outline" className="w-full" onClick={addPage}><PlusCircle className="mr-2" /> Add Page</Button>
            </div>
            <div className="md:col-span-3">
                {activePage ? (
                     <PageContentEditor key={activePage.id} pageIndex={activePageIndex} />
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground bg-muted rounded-lg p-8">Select or add a page to start editing.</div>
                )}
            </div>
        </div>
    )
}

export function AboutBawmForm({ existingData }: { existingData?: AboutBawm }) {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const form = useForm<AboutBawmFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: existingData ? {
            ...existingData,
            description: existingData.description || '',
            publishDate: existingData.publishDate ? new Date(existingData.publishDate) : undefined,
            pages: (existingData.pages || []).map(p => ({...p, content: p.content || '', imageUrls: p.imageUrls || [], imageFiles: []})),
        } : {
            title: '',
            slug: '',
            description: '',
            tags: [],
            pages: [{id: `p-${Date.now()}`, title: 'Page 1', content: '', contentType: 'paragraph', order: 0, imageUrls: [], imageFiles: []}],
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
    
    async function onSubmit(values: AboutBawmFormValues) {
        if (!user) return;
        setLoading(true);

        try {
             if (!existingData) {
                const dataRef = collection(db, "aboutBawm");
                const q = query(dataRef, where("slug", "==", values.slug));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    form.setError("slug", { type: "manual", message: "This link is already taken." });
                    setLoading(false);
                    return;
                }
            }

            let coverPhotoUrl = existingData?.coverPhotoUrl || "";
            if (values.coverPhotoUrl && typeof values.coverPhotoUrl !== 'string') {
                 const file = values.coverPhotoUrl[0];
                 const storageRef = ref(storage, `aboutBawm/${values.slug}/cover/${file.name}`);
                 const uploadResult = await uploadBytes(storageRef, file);
                 coverPhotoUrl = await getDownloadURL(uploadResult.ref);
            }

            const aboutBawmData = {
                title: values.title,
                slug: values.slug,
                description: values.description || "",
                tags: values.tags || [],
                authorId: user.uid,
                coverPhotoUrl,
                isPublished: !values.publishDate || values.publishDate <= new Date(),
                publishDate: values.publishDate || null,
            };

            let docId = existingData?.id;

            if (existingData) {
                const docRef = doc(db, 'aboutBawm', existingData.id);
                await updateDoc(docRef, {
                    ...aboutBawmData,
                    updatedAt: serverTimestamp()
                });
            } else {
                const newDocRef = await addDoc(collection(db, "aboutBawm"), {
                    ...aboutBawmData,
                    readCount: 0,
                    createdAt: serverTimestamp(),
                });
                docId = newDocRef.id;
            }

            for (const page of values.pages) {
                const pageRef = doc(db, `aboutBawm/${docId}/pages`, page.id);
                const finalImageUrls = page.imageUrls ? [...page.imageUrls] : [];

                if (page.imageFiles && page.imageFiles.length > 0) {
                    for(const file of page.imageFiles) {
                         const imageRef = ref(storage, `aboutBawm/${docId}/pages/${page.id}/${file.name}`);
                         const uploadResult = await uploadBytes(imageRef, file);
                         const downloadUrl = await getDownloadURL(uploadResult.ref);
                         finalImageUrls.push(downloadUrl);
                    }
                }

                await setDoc(pageRef, { 
                    id: page.id,
                    title: page.title,
                    content: page.content || '',
                    contentType: page.contentType,
                    order: page.order,
                    imageUrls: finalImageUrls
                 }, { merge: true });
            }

            toast({
              title: existingData ? 'Content Updated!' : 'Content Created!',
              description: `The content "${values.title}" has been successfully saved.`,
            });
            router.push(`/about-bawm/${values.slug}`); 

        } catch (error) {
            console.error("Error saving content:", error);
            toast({ title: "Error", description: "Something went wrong while saving.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    if (!user) return null;

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Content Details</CardTitle>
                        <CardDescription>Provide the main information for your content.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Our Mission" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField
                            control={form.control}
                            name="slug"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Link</FormLabel>
                                    <FormControl>
                                        <Input placeholder="our-mission" {...field} disabled={!!existingData} />
                                    </FormControl>
                                    <FormDescription>
                                        This will be the unique web address. Cannot be changed after creation.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="A short summary..." {...field} rows={5} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="coverPhotoUrl" render={({ field }) => (
                            <ImageUpload field={field} label="Cover Photo" helpText="Upload a cover image (16:9 ratio recommended)." alt="Cover photo preview" aspectRatio="landscape" />
                        )} />
                        <FormField control={form.control} name="tags" render={({ field }) => <TagsInput field={field} />} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Pages</CardTitle>
                        <CardDescription>Add, reorder, and edit your pages here.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PageEditor />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Publication</CardTitle>
                        <CardDescription>Control when your content goes live.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="publishDate" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Schedule Publication (Optional)</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                                <Button variant={'outline'} className={cn('w-[240px] pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                    {field.value ? format(field.value, 'PPP') : <span>Publish immediately</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent></Popover><FormDescription>Select a date to publish. Leave blank to publish now.</FormDescription><FormMessage /></FormItem>
                        )} />
                    </CardContent>
                </Card>

                <Button type="submit" size="lg" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {existingData ? "Save Changes" : "Publish"}
                </Button>
            </form>
        </FormProvider>
    );
}
