
"use client";

import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { QuizInfo, QuizQuestion, UserQuizAttempt } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Camera, Users, Globe, Lock, Calendar, Play, Forward, Trophy, Loader2 } from "lucide-react";
import { ParticipateButton } from "./participate-button";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const imageFormSchema = z.object({
  image: z.any().refine(files => files?.length > 0, "Image is required."),
});
type ImageFormValues = z.infer<typeof imageFormSchema>;

function ImageEditDialog({ quiz, children, imageType, onUpdate }: { quiz: QuizInfo, children: React.ReactNode, imageType: 'profile' | 'cover', onUpdate?: () => void }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const form = useForm<ImageFormValues>({
        resolver: zodResolver(imageFormSchema)
    });

    const onSubmit = async (data: ImageFormValues) => {
        try {
            const file = data.image[0];
            const folder = imageType === 'profile' ? `quizzes/${quiz.quizId}/profile` : `quizzes/${quiz.quizId}/cover`;
            const storageRef = ref(storage, `${folder}/${file.name}`);
            const uploadResult = await uploadBytes(storageRef, file);
            const imageUrl = await getDownloadURL(uploadResult.ref);

            const quizDocRef = doc(db, "quizzes", quiz.id);
            
            const updateData: { [key: string]: string } = {};
            
            if (imageType === 'profile') {
                updateData.profilePictureUrl = imageUrl;
            } else {
                updateData.coverImageUrl = imageUrl;
            }
            await updateDoc(quizDocRef, updateData);
    
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


export function QuizHeader({ quiz, questions, onTakeQuiz }: { quiz: QuizInfo, questions: QuizQuestion[], onTakeQuiz: () => void }) {
  const { user, userProfile } = useAuth();
  const defaultCover = PlaceHolderImages.find(p => p.id === 'default-page-cover');
  const [userAttempts, setUserAttempts] = useState<UserQuizAttempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(true);

  const isOwner = user?.uid === quiz.ownerId;
  const isAdmin = userProfile?.userType === 'Admin';
  const canEdit = isOwner || isAdmin;
  const isParticipant = quiz.participants?.includes(user?.uid || '');

  useEffect(() => {
    if (!user || !isParticipant) {
      setLoadingAttempts(false);
      return;
    }
    const fetchAttempts = async () => {
        setLoadingAttempts(true);
        try {
            const attemptsQuery = query(
                collection(db, 'quizSubmissions'),
                where('quizId', '==', quiz.id),
                where('userId', '==', user.uid)
            );
            const snapshot = await getDocs(attemptsQuery);
            const attempts = snapshot.docs.map(doc => doc.data() as UserQuizAttempt);
            setUserAttempts(attempts);
        } catch (error) {
            console.error("Error fetching user attempts:", error);
        } finally {
            setLoadingAttempts(false);
        }
    };
    fetchAttempts();
  }, [user, quiz.id, isParticipant]);

  const now = new Date();
  const startDate = new Date(quiz.startDate);
  const endDate = new Date(quiz.endDate);

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
  
  const attemptsLeft = quiz.attemptLimit - userAttempts.length;
  const canTakeQuiz = isParticipant && status === 'ongoing' && questions.length > 0 && attemptsLeft > 0;
  const canAlwaysTakeQuiz = (isOwner || isAdmin) && questions.length > 0;

  return (
    <div className="border-b">
      <div className="h-48 md:h-64 relative group">
        <Image
          src={quiz.coverImageUrl || defaultCover?.imageUrl || ''}
          alt="Cover image"
          fill
          className="object-cover"
        />
        {canEdit && (
            <ImageEditDialog quiz={quiz} imageType="cover">
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
              <AvatarImage src={quiz.profilePictureUrl || undefined} alt={quiz.name} />
              <AvatarFallback>{quiz.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
             {canEdit && (
                <ImageEditDialog quiz={quiz} imageType="profile">
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Camera className="h-8 w-8 text-white"/>
                    </div>
                </ImageEditDialog>
            )}
          </div>
          <div className="mt-4 md:ml-6 text-center md:text-left flex-grow">
            <div className="flex items-center gap-2 justify-center md:justify-start">
                <h1 className="text-3xl font-bold">{quiz.name}</h1>
            </div>
            <p className="text-muted-foreground">@{quiz.quizId} &middot; {quiz.category}</p>
            <div className="mt-2 text-sm text-muted-foreground flex items-center justify-center md:justify-start gap-4">
                <div className="flex items-center gap-1">
                    {quiz.quizType === 'private' ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                    <span>{quiz.quizType.charAt(0).toUpperCase() + quiz.quizType.slice(1)} Quiz</span>
                </div>
                <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{quiz.participants.length} {quiz.participants.length === 1 ? 'Participant' : 'Participants'}</span>
                </div>
            </div>
          </div>
          <div className="mt-4 md:ml-auto flex flex-col items-center md:items-end gap-2">
            <div className="flex items-center gap-2">
                {(canTakeQuiz || canAlwaysTakeQuiz) && (
                    <Button onClick={onTakeQuiz} disabled={loadingAttempts}>
                        {loadingAttempts ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trophy className="mr-2 h-4 w-4" />}
                        Take Quiz {isParticipant && !isAdmin && !isOwner && `(${attemptsLeft} left)`}
                    </Button>
                )}
                 {!canAlwaysTakeQuiz && isParticipant && attemptsLeft <= 0 && status === 'ongoing' && (
                    <Button disabled>
                        No attempts left
                    </Button>
                 )}
                <ParticipateButton quiz={quiz} variant={isParticipant ? "secondary" : "default"} />
            </div>
            <Badge className={cn("text-xs mt-1", statusColorClass)}>{statusText}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
