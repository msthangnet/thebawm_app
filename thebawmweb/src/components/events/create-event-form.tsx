
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { Loader2, CalendarIcon } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const eventFormSchema = z.object({
  name: z.string().min(3, "Event name must be at least 3 characters long.").max(50, "Event name must be 50 characters or less."),
  eventId: z.string()
    .min(3, "Event ID must be at least 3 characters.")
    .max(30, "Event ID must be 30 characters or less.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Event ID can only contain lowercase letters, numbers, and single hyphens."),
  category: z.string().min(1, "Category is required.").max(30, "Category must be 30 characters or less."),
  description: z.string().max(500, "Description must be 500 characters or less.").optional(),
  eventType: z.enum(["public", "private"], { required_error: "You must select an event type." }),
  profilePicture: z.any().optional(),
  startDate: z.date({ required_error: "A start date is required." }),
  endDate: z.date({ required_error: "An end date is required." }),
}).refine(data => data.endDate > data.startDate, {
    message: "End date must be after start date.",
    path: ["endDate"],
});


type EventFormValues = z.infer<typeof eventFormSchema>;

export function CreateEventForm() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const form = useForm<EventFormValues>({
        resolver: zodResolver(eventFormSchema),
        defaultValues: {
            name: "",
            eventId: "",
            category: "",
            description: "",
            eventType: "public",
        },
    });

    async function onSubmit(values: EventFormValues) {
        if (!user) {
            toast({ title: "Error", description: "You must be logged in to create an event.", variant: "destructive" });
            return;
        }

        setLoading(true);

        try {
            const eventsRef = collection(db, "events");
            const q = query(eventsRef, where("eventId", "==", values.eventId));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                form.setError("eventId", { type: "manual", message: "This Event ID is already taken." });
                setLoading(false);
                return;
            }

            let profilePictureUrl = "";
            if (values.profilePicture && values.profilePicture[0]) {
                 const file = values.profilePicture[0];
                 const storageRef = ref(storage, `events/${values.eventId}/profile/${file.name}`);
                 const uploadResult = await uploadBytes(storageRef, file);
                 profilePictureUrl = await getDownloadURL(uploadResult.ref);
            }
            
            const newEventData = {
                name: values.name,
                eventId: values.eventId,
                category: values.category,
                description: values.description || "",
                ownerId: user.uid,
                admins: [user.uid],
                participants: [user.uid],
                createdAt: serverTimestamp(),
                profilePictureUrl: profilePictureUrl,
                coverImageUrl: "",
                posters: 'admins',
                eventType: values.eventType,
                pendingParticipants: [],
                startDate: values.startDate,
                endDate: values.endDate,
                participantPostLimit: 5,
            };

            await addDoc(collection(db, "events"), newEventData);
            
            toast({ title: "Event Created!", description: `The event "${values.name}" has been successfully created.` });
            router.push(`/events/${values.eventId}`);

        } catch (error) {
            console.error("Error creating event:", error);
            toast({ title: "Error", description: "Could not create the event. Please try again.", variant: "destructive" });
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
                            <FormLabel>Event Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Summer Music Festival" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="eventId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Event ID</FormLabel>
                            <FormControl>
                                <Input placeholder="summer-music-fest" {...field} />
                            </FormControl>
                             <FormDescription>
                                This will be your event's unique web address. Use only lowercase letters, numbers, and hyphens.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Start Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value, "PPP")
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>End Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value, "PPP")
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date < (form.getValues("startDate") || new Date(new Date().setHours(0,0,0,0)))}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
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
                            <FormControl>
                                <Input placeholder="e.g., Music, Conference, Workshop" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="eventType"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Event Privacy</FormLabel>
                            <FormControl>
                                <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                                >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="public" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                    Public - Anyone can see the event and participate.
                                    </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="private" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                    Private - Only approved members can participate and see event content.
                                    </FormLabel>
                                </FormItem>
                                </RadioGroup>
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
                                <Textarea placeholder="Tell everyone what your event is about." {...field} />
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
                             <FormDescription>
                                This will be used as the main image for your event.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Event
                    </Button>
                </div>
            </form>
        </Form>
    );
}
