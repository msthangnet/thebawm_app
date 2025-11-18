
"use client";

import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, Video, Send, Loader2, X, CalendarClock, Settings } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { collection, addDoc, serverTimestamp, getDoc, doc, Timestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { format } from "date-fns";
import { GroupInfo, PostPermissions, DefaultPostPermissions } from "@/lib/types";

type CreateGroupPostProps = {
  groupId: string;
  groupInfo: GroupInfo | null;
};

async function getPostPermissions(groupId?: string): Promise<PostPermissions> {
    if (groupId) {
        const settingsRef = doc(db, "groups", groupId, "settings", "postPermissions");
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
            return { ...DefaultPostPermissions, ...docSnap.data() } as PostPermissions;
        }
    }
    const settingsRef = doc(db, "app_settings", "postPermissions");
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            ...DefaultPostPermissions,
            ...data,
            imageUploadLimit: {
                ...DefaultPostPermissions.imageUploadLimit,
                ...(data.imageUploadLimit || {})
            },
         } as PostPermissions
    }
    return DefaultPostPermissions;
}

export function CreateGroupPost({ groupId, groupInfo }: CreateGroupPostProps) {
  const { user, userProfile } = useAuth();
  const [postText, setPostText] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [loading, setLoading] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [permissions, setPermissions] = useState<PostPermissions>(DefaultPostPermissions);
  const [checkingPermissions, setCheckingPermissions] = useState(true);

  const { toast } = useToast();
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  const fetchPermissions = useCallback(async () => {
    if (!user || !groupInfo) return;
    setCheckingPermissions(true);
    try {
        const perms = await getPostPermissions(groupInfo.id);
        setPermissions(perms);
    } catch (error) {
        console.error("Error fetching permissions:", error);
        toast({ title: "Error", description: "Could not load posting permissions.", variant: "destructive" });
    } finally {
        setCheckingPermissions(false);
    }
  }, [user, toast, groupInfo]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);
  
  if (!user || !userProfile) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const userType = userProfile.userType || 'Inactive';
    const imageLimit = permissions.imageUploadLimit[userType] || 1;
    const isVideo = files[0].type.startsWith("video/");
    
    if (isVideo) {
        if (files.length > 1) {
            toast({ title: "Video Upload Limit", description: "You can only upload one video per post.", variant: "destructive"});
            return;
        }
        setMediaFiles([files[0]]);
        setMediaPreviews([URL.createObjectURL(files[0])]);
        setMediaType("video");
    } else { // Handle images
        if (mediaFiles.length + files.length > imageLimit) {
            toast({ title: "Image Upload Limit", description: `You can only upload up to ${imageLimit} images.`, variant: "destructive"});
            return;
        }
        const newFiles = Array.from(files);
        setMediaFiles(prev => [...prev, ...newFiles]);
        const newPreviews = newFiles.map(file => URL.createObjectURL(file));
        setMediaPreviews(prev => [...prev, ...newPreviews]);
        setMediaType("image");
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
    if (mediaFiles.length === 1) {
        setMediaType(null);
    }
  }

  const handlePost = async () => {
    if (!postText.trim() && mediaFiles.length === 0) return;

    setLoading(true);

    try {
      let mediaUrls: string[] = [];
      if (mediaFiles.length > 0) {
        mediaUrls = await Promise.all(
              mediaFiles.map(async (file) => {
                  const storageRef = ref(storage, `groupPost/${groupInfo?.id}/${user.uid}/${Date.now()}_${file.name}`);
                  const uploadResult = await uploadBytes(storageRef, file);
                  return await getDownloadURL(uploadResult.ref);
              })
          );
      }

      await addDoc(collection(db, "groupPost"), {
        authorId: user.uid,
        groupId: groupInfo?.id,
        text: postText,
        mediaUrls: mediaUrls,
        mediaType: mediaType,
        createdAt: serverTimestamp(),
        likes: [],
        viewCount: 0,
        shareCount: 0,
        commentCount: 0,
        scheduledAt: scheduleDate || null,
        source: `Post on group '${groupInfo?.name}'`,
      });

      setPostText("");
      setMediaFiles([]);
      setMediaPreviews([]);
      setMediaType(null);
      setScheduleDate(undefined);
      toast({
        title: scheduleDate ? "Post scheduled!" : "Post created!",
        description: scheduleDate ? `Your post will be published on ${format(scheduleDate, 'PPp')}.` : "Your post has been shared in the group.",
      });
      router.refresh();

    } catch (error) {
      console.error("Error creating group post: ", error);
      toast({
        title: "Error",
        description: "Could not create your post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const userType = userProfile.userType || 'Inactive';
  const canUploadImage = permissions.canUploadImage.includes(userType);
  const imageUploadLimit = permissions.imageUploadLimit[userType] || 1;
  const canUploadVideo = permissions.canUploadVideo.includes(userType);
  const canSchedule = permissions.canSchedulePost.includes(userType);

  const isPostDisabled = (!postText.trim() && mediaFiles.length === 0) || loading;
  const placeholderText = `Write something in this group...`;

  const isOwner = groupInfo?.ownerId === user.uid;
  const isSiteAdmin = userProfile.userType === 'Admin';


  return (
    <Card>
      <CardContent className="p-2 sm:p-4">
        {checkingPermissions ? (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        ) : (
            <div className="w-full">
                <Textarea
                placeholder={placeholderText}
                className="w-full border-none focus-visible:ring-0 resize-none shadow-none text-base"
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                disabled={loading}
                />
                
                {mediaPreviews.length > 0 && (
                    <div className="mt-4 grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                        {mediaPreviews.map((preview, index) => (
                        <div key={index} className="relative">
                            {mediaType === 'image' && (
                            <Image src={preview} alt={`Preview ${index + 1}`} width={150} height={150} className="rounded-lg object-cover aspect-square w-full" />
                            )}
                            {mediaType === 'video' && (
                            <video src={preview} controls className="rounded-lg aspect-square w-full" />
                            )}
                            <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeMedia(index)} disabled={loading}>
                            <X className="h-4 w-4" />
                            </Button>
                        </div>
                        ))}
                    </div>
                )}
                
                {scheduleDate && (
                    <div className="text-sm text-primary bg-primary/10 p-2 rounded-md mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CalendarClock className="h-4 w-4" />
                            <span>Scheduled for: {format(scheduleDate, 'PPp')}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setScheduleDate(undefined)}><X className="h-4 w-4"/></Button>
                    </div>
                )}

                <div className="mt-4 flex justify-between items-center">
                    <div className="flex gap-1 items-center">
                         <Avatar className="h-8 w-8">
                            <AvatarImage src={userProfile?.profilePictureUrl || undefined} />
                            <AvatarFallback>{userProfile?.displayName?.charAt(0).toUpperCase() || userProfile?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <input type="file" accept="image/*" multiple={imageUploadLimit > 1} ref={imageInputRef} onChange={handleFileChange} className="hidden" disabled={!canUploadImage || mediaType === 'video' || mediaFiles.length >= imageUploadLimit}/>
                        <input type="file" accept="video/*" ref={videoInputRef} onChange={handleFileChange} className="hidden" disabled={!canUploadVideo || mediaFiles.length > 0}/>
                        <Button variant="ghost" size="icon" aria-label="Add image" onClick={() => imageInputRef.current?.click()} disabled={loading || mediaFiles.length >= imageUploadLimit || !canUploadImage || mediaType === 'video'}>
                            <ImageIcon className={`h-5 w-5 ${canUploadImage ? 'text-green-500' : 'text-muted-foreground'}`} />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Add video" onClick={() => videoInputRef.current?.click()} disabled={loading || mediaFiles.length > 0 || !canUploadVideo}>
                            <Video className={`h-5 w-5 ${canUploadVideo ? 'text-blue-500' : 'text-muted-foreground'}`} />
                        </Button>
                         {canSchedule && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" aria-label="Schedule post" disabled={loading}>
                                        <CalendarClock className="h-5 w-5 text-purple-500" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={scheduleDate}
                                        onSelect={setScheduleDate}
                                        disabled={(date) => date < new Date()}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                         )}
                    </div>
                    <div className="flex items-center gap-2">
                         {(isOwner || isSiteAdmin) && groupInfo && (
                            <Button variant="ghost" size="icon" aria-label="Post Settings" onClick={() => router.push(`/groups/${groupInfo.groupId}/admin-post-settings`)}>
                                <Settings className="h-5 w-5" />
                            </Button>
                        )}
                        <Button onClick={handlePost} disabled={isPostDisabled} className="sm:w-auto w-10 sm:px-4 p-0">
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : scheduleDate ? (
                                <CalendarClock className="h-4 w-4" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            <span className="hidden sm:inline ml-2">{scheduleDate ? 'Schedule' : 'Post'}</span>
                        </Button>
                    </div>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
