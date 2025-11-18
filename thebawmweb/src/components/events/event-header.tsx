

"use client";

import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { EventInfo } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Camera, Edit, Users, Globe, Lock, Loader2, MoreVertical, Calendar, Play, Forward } from "lucide-react";
import { useState } from "react";
import { ParticipateButton } from "./participate-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";

const imageFormSchema = z.object({
  image: z.any().refine(files => files?.length > 0, "Image is required."),
});
type ImageFormValues = z.infer<typeof imageFormSchema>;

function ImageEditDialog({ event, children, imageType, onUpdate }: { event: EventInfo, children: React.ReactNode, imageType: 'profile' | 'cover', onUpdate?: () => void }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const form = useForm<ImageFormValues>({
        resolver: zodResolver(imageFormSchema)
    });

    const onSubmit = async (data: ImageFormValues) => {
        try {
            const file = data.image[0];
            const folder = imageType === 'profile' ? `events/${event.eventId}/profile` : `events/${event.eventId}/cover`;
            const storageRef = ref(storage, `${folder}/${file.name}`);
            const uploadResult = await uploadBytes(storageRef, file);
            const imageUrl = await getDownloadURL(uploadResult.ref);

            const eventDocRef = doc(db, "events", event.id);
            
            const updateData: { [key: string]: string } = {};
            
            if (imageType === 'profile') {
                updateData.profilePictureUrl = imageUrl;
            } else {
                updateData.coverImageUrl = imageUrl;
            }
            await updateDoc(eventDocRef, updateData);
    
            onUpdate?.();
            router.refresh();

            toast({ title: `${imageType === 'profile' ? 'Profile picture' : 'Cover image'} updated!` });
            setOpen(false);

        } catch (error) {
            console.error(error);
            toast({ title: "Error updating image", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Update {imageType === 'profile' ? 'Profile Picture' : 'Cover Image'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="image"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Select new image</FormLabel>
                                    <FormControl>
                                        <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Upload & Save'}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export function EventHeader({ event }: { event: EventInfo }) {
  const { user, userProfile } = useAuth();
  const defaultCover = PlaceHolderImages.find(p => p.id === 'default-page-cover');

  const isOwner = user?.uid === event.ownerId;
  const isAdmin = userProfile?.userType === 'Admin';
  const canEdit = isOwner || isAdmin;
  const isParticipant = event.participants?.includes(user?.uid || '');

  const now = new Date();
  const startDate = event.startDate?.toDate ? event.startDate.toDate() : new Date(event.startDate);
  const endDate = event.endDate?.toDate ? event.endDate.toDate() : new Date(event.endDate);

  let status: 'upcoming' | 'ongoing' | 'ended' = 'upcoming';
  let statusText = 'Upcoming';
  let statusColorClass = 'bg-yellow-500 text-white';

  if (now > endDate) {
      status = 'ended';
      statusText = 'Ended';
      statusColorClass = 'bg-red-500 text-white';
  } else if (now >= startDate && now <= endDate) {
      status = 'ongoing';
      statusText = 'Ongoing';
      statusColorClass = 'bg-green-500 text-white';
  }
  
  return (
    <div className="border-b">
      <div className="h-48 md:h-64 relative group">
        <Image
          src={event.coverImageUrl || defaultCover?.imageUrl || ''}
          alt="Cover image"
          fill
          className="object-cover"
        />
        {canEdit && (
            <ImageEditDialog event={event} imageType="cover">
              <Button variant="secondary" className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="mr-2 h-4 w-4"/>
                  Edit Cover Photo
              </Button>
            </ImageEditDialog>
        )}
      </div>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center md:items-end -mt-14 md:-mt-16">
          <div className="relative group">
            <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-background">
              <AvatarImage src={event.profilePictureUrl || undefined} alt={event.name} />
              <AvatarFallback>{event.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
             {canEdit && (
                <ImageEditDialog event={event} imageType="profile">
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Camera className="h-8 w-8 text-white"/>
                    </div>
                </ImageEditDialog>
            )}
          </div>
          <div className="mt-4 md:ml-6 text-center md:text-left flex-grow">
            <div className="flex items-center gap-2 justify-center md:justify-start">
                <h1 className="text-3xl font-bold">{event.name}</h1>
            </div>
            <p className="text-muted-foreground">@{event.eventId} &middot; {event.category}</p>
            <div className="mt-2 text-sm text-muted-foreground flex items-center justify-center md:justify-start gap-4">
                <div className="flex items-center gap-1">
                    {event.eventType === 'private' ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                    <span>{event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)} Event</span>
                </div>
                <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{event.participants.length} {event.participants.length === 1 ? 'Participant' : 'Participants'}</span>
                </div>
            </div>
          </div>
          <div className="mt-4 md:ml-auto flex flex-col items-center md:items-end gap-2">
            <div className="w-full">
              <ParticipateButton event={event} variant={isParticipant ? "secondary" : "default"} />
            </div>
            <Badge className={cn("text-xs mt-1", statusColorClass)}>{statusText}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
