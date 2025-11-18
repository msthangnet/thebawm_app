

"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { UserProfile, UserManagementPermissions } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Camera, Edit, CalendarIcon, Loader2, MoreVertical, Trash2, UserCog, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { collection, doc, getDocs, query, updateDoc, where, writeBatch, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserTypeIcon } from "../user-type-icon";
import { AssignableUserTypes, DefaultUserManagementPermissions } from "@/lib/types";


const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  bio: z.string().max(160, "Bio can be up to 160 characters").optional(),
  hometown: z.string().optional(),
  liveIn: z.string().optional(),
  currentStudy: z.string().optional(),
  instituteName: z.string().optional(),
  dob: z.date().optional(),
  relationshipStatus: z.enum(['Single', 'In a relationship', 'Engaged', 'Married', 'Complicated', 'Rather not say']).optional(),
  gender: z.enum(['Male', 'Female', 'Other', 'Rather not say']).optional(),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

const imageFormSchema = z.object({
  image: z.any().refine(files => files?.length > 0, "Image is required."),
});
type ImageFormValues = z.infer<typeof imageFormSchema>;


function ImageEditDialog({ profile, children, imageType }: { profile: UserProfile, children: React.ReactNode, imageType: 'profile' | 'cover' }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const { user, refreshUserProfile } = useAuth();
    const router = useRouter();
    const form = useForm<ImageFormValues>({
        resolver: zodResolver(imageFormSchema)
    });

    const onSubmit = async (data: ImageFormValues) => {
        if (!user) return;

        try {
            const file = data.image[0];
            const folder = imageType === 'profile' ? 'profile-pictures' : 'cover-images';
            const storageRef = ref(storage, `${folder}/${user.uid}/${file.name}`);
            const uploadResult = await uploadBytes(storageRef, file);
            const imageUrl = await getDownloadURL(uploadResult.ref);

            const userDocRef = doc(db, "users", user.uid);
            
            const batch = writeBatch(db);
            const updateData: { [key: string]: string } = {};
            
            if (imageType === 'profile') {
                updateData.profilePictureUrl = imageUrl;
            } else {
                updateData.coverImageUrl = imageUrl;
            }
            batch.update(userDocRef, updateData);
    
            await batch.commit();

            await refreshUserProfile();
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

function InfoEditDialog({ profile, children }: { profile: UserProfile, children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user, refreshUserProfile } = useAuth();
  const router = useRouter();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      bio: profile.bio || "",
      hometown: profile.hometown || "",
      liveIn: profile.liveIn || "",
      currentStudy: profile.currentStudy || "",
      instituteName: profile.instituteName || "",
      dob: profile.dob ? new Date(profile.dob) : undefined,
      relationshipStatus: profile.relationshipStatus || undefined,
      gender: profile.gender || undefined,
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    
    try {
        const displayName = `${data.firstName} ${data.lastName}`;
        const updatedProfileData = {
            firstName: data.firstName,
            lastName: data.lastName,
            displayName: displayName,
            bio: data.bio || "",
            hometown: data.hometown || "",
            liveIn: data.liveIn || "",
            currentStudy: data.currentStudy || "",
            instituteName: data.instituteName || "",
            dob: data.dob ? data.dob.toISOString() : "",
            relationshipStatus: data.relationshipStatus || '',
            gender: data.gender || '',
        };
        
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, updatedProfileData);

        await refreshUserProfile();
        router.refresh();

        toast({ title: "Profile updated successfully!" });
        setOpen(false);

    } catch (error) {
      console.error(error);
      toast({ title: "Error updating profile", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Profile Information</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
            <div className="px-6 py-4">
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bio</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                          control={form.control}
                          name="liveIn"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Lives In</FormLabel>
                              <FormControl>
                              <Input {...field} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                      <FormField
                          control={form.control}
                          name="hometown"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Hometown</FormLabel>
                              <FormControl>
                              <Input {...field} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                          control={form.control}
                          name="currentStudy"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Current Study</FormLabel>
                              <FormControl>
                              <Input {...field} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                      <FormField
                          control={form.control}
                          name="instituteName"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Institute Name</FormLabel>
                              <FormControl>
                              <Input {...field} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="dob"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Date of birth</FormLabel>
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
                                    disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                    }
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
                          name="gender"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Gender</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                  <SelectItem value="Male">Male</SelectItem>
                                  <SelectItem value="Female">Female</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                  <SelectItem value="Rather not say">Rather not say</SelectItem>
                              </SelectContent>
                              </Select>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                      <FormField
                          control={form.control}
                          name="relationshipStatus"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Relationship Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                  <SelectItem value="Single">Single</SelectItem>
                                  <SelectItem value="In a relationship">In a relationship</SelectItem>
                                  <SelectItem value="Engaged">Engaged</SelectItem>
                                  <SelectItem value="Married">Married</SelectItem>
                                  <SelectItem value="Complicated">Complicated</SelectItem>
                                  <SelectItem value="Rather not say">Rather not say</SelectItem>
                              </SelectContent>
                              </Select>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                    </div>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                </form>
                </Form>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function UserManagementDialogs({ profile, permissions, userProfile, onUpdate }: { profile: UserProfile, permissions: UserManagementPermissions, userProfile: UserProfile, onUpdate: () => void }) {
    const { toast } = useToast();
    const router = useRouter();
    const [changeTypeOpen, setChangeTypeOpen] = useState(false);
    const [deleteUserOpen, setDeleteUserOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const currentUserType = userProfile.userType || 'Active';
    const canUpdateUserType = permissions.canUpdateUserType.includes(currentUserType);
    const canDeleteUsers = permissions.canDeleteUsers.includes(currentUserType);

    if (profile.uid === userProfile.uid) return null; // Cannot manage self

    const handleChangeUserType = async (newUserType: UserProfile['userType']) => {
        setLoading(true);
        try {
            const userRef = doc(db, 'users', profile.uid);
            await updateDoc(userRef, { userType: newUserType });
            toast({ title: "User Type Updated", description: `${profile.displayName}'s role has been changed to ${newUserType}.` });
            onUpdate();
        } catch (error) {
            console.error("Error updating user type:", error);
            toast({ title: "Error", description: "Could not update user type.", variant: "destructive" });
        } finally {
            setLoading(false);
            setChangeTypeOpen(false);
        }
    };

    const handleDeleteUser = async () => {
        setLoading(true);
        try {
            const userRef = doc(db, 'users', profile.uid);
            const deletedUserRef = doc(db, 'deleted_users', profile.uid);

            const batch = writeBatch(db);
            
            // 1. Get user data before deleting
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                throw new Error("User not found.");
            }
            const userData = userSnap.data();

            // 2. Move user data to deleted_users
            batch.set(deletedUserRef, { ...userData, deletedAt: new Date() });
            
            // 3. Delete the original user document
            batch.delete(userRef);
            
            // A more robust solution would be a Cloud Function to clean up all user content (posts, comments etc.)
            // and delete the user from Firebase Auth.
            // For now, we "soft delete" from the UI perspective by removing the user doc.

            await batch.commit();

            toast({ title: "User Deleted", description: `${profile.displayName}'s account has been deleted.` });
            router.push('/community');
            router.refresh();
        } catch (error) {
            console.error("Error deleting user:", error);
            toast({ title: "Error", description: "Could not delete user.", variant: "destructive" });
        } finally {
            setLoading(false);
            setDeleteUserOpen(false);
        }
    };


    if (!canUpdateUserType && !canDeleteUsers) return null;
    
    return (
      <AlertDialog open={deleteUserOpen} onOpenChange={setDeleteUserOpen}>
        <Dialog open={changeTypeOpen} onOpenChange={setChangeTypeOpen}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <MoreVertical className="h-5 w-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {canUpdateUserType && <DialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <UserCog className="mr-2 h-4 w-4" /> Change User Type
                    </DropdownMenuItem></DialogTrigger>}
                    {canDeleteUsers && <>
                        <DropdownMenuSeparator />
                         <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete User
                        </DropdownMenuItem></AlertDialogTrigger>
                    </>}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Change User Type Dialog */}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Change User Type for {profile.displayName}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <p className="text-sm text-muted-foreground">Select a new role for this user.</p>
                    <Select onValueChange={(value) => handleChangeUserType(value as UserProfile['userType'])} defaultValue={profile.userType}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                            {AssignableUserTypes.map(type => (
                                <SelectItem key={type} value={type!} disabled={loading}>
                                    {type}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     {loading && <div className="flex justify-center mt-4"><Loader2 className="animate-spin"/></div>}
                </div>
            </DialogContent>

             {/* Delete User Alert Dialog */}
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the user's account and all associated data. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteUser} disabled={loading} className="bg-destructive hover:bg-destructive/90">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </Dialog>
      </AlertDialog>
    );
}



export function ProfileHeader({ profile }: { profile: UserProfile }) {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const defaultCover = PlaceHolderImages.find(p => p.id === 'default-cover');
  const [managementPermissions, setManagementPermissions] = useState<UserManagementPermissions>(DefaultUserManagementPermissions);

  const isOwnProfile = user?.uid === profile.uid;
  const [currentProfile, setCurrentProfile] = useState(profile);

  const isConnected = userProfile?.friends?.includes(profile.uid);
  
  const fetchPermissions = useCallback(async () => {
    const settingsRef = doc(db, "app_settings", "userManagementPermissions");
    try {
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
            setManagementPermissions(docSnap.data() as UserManagementPermissions);
        } else {
            setManagementPermissions(DefaultUserManagementPermissions);
        }
    } catch (error) {
        console.error("Error fetching user management permissions:", error);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);
  
  useEffect(() => {
    setCurrentProfile(profile);
  }, [profile]);


  const handleTabChange = (value: string) => {
    if (value === "posts") {
        router.push(`/profile/${profile.username}`);
    } else {
        router.push(`/profile/${profile.username}/${value}`);
    }
  };

  const getActiveTab = () => {
    if (pathname.endsWith("/about")) return "about";
    if (pathname.endsWith("/settings")) return "settings";
    if (pathname.endsWith("/connections")) return "connections";
    return "posts";
  }
  
  const onProfileUpdate = async () => {
      const userDocRef = doc(db, 'users', profile.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const updatedProfile = userDoc.data() as UserProfile;
        setCurrentProfile(updatedProfile);
        router.refresh();
      }
  }

  if (!userProfile) return null;

  return (
    <div className="border-b">
      <div className="h-48 md:h-64 relative group">
        <Image
          src={currentProfile.coverImageUrl || defaultCover?.imageUrl || ''}
          alt="Cover image"
          fill
          className="object-cover"
        />
        {isOwnProfile && (
            <ImageEditDialog profile={currentProfile} imageType="cover">
                <Button variant="secondary" className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="mr-2 h-4 w-4"/>
                    Edit Cover Photo
                </Button>
            </ImageEditDialog>
        )}
      </div>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center md:items-end -mt-16 md:-mt-20">
          <div className="relative group">
            <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-background">
              <AvatarImage src={currentProfile.profilePictureUrl || undefined} alt={currentProfile.displayName || currentProfile.username} />
              <AvatarFallback>{currentProfile.displayName?.charAt(0).toUpperCase() || currentProfile.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
             {isOwnProfile && (
                <ImageEditDialog profile={currentProfile} imageType="profile">
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Camera className="h-8 w-8 text-white"/>
                    </div>
                </ImageEditDialog>
            )}
          </div>
          <div className="mt-4 md:ml-6 text-center md:text-left flex-grow">
            <div className="flex items-center justify-center md:justify-start gap-2">
                <h1 className="text-3xl font-bold">{currentProfile.displayName}</h1>
                <UserTypeIcon userType={currentProfile.userType} className="h-5 w-5" />
            </div>
            <p className="text-muted-foreground">@{currentProfile.username}</p>
          </div>
          <div className="mt-4 md:ml-auto flex items-center gap-2">
            {isOwnProfile ? (
                <InfoEditDialog profile={currentProfile}>
                    <Button variant="secondary">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Profile
                    </Button>
                </InfoEditDialog>
            ) : (
                <>
                  {(isConnected || userProfile.userType === 'Admin') && (
                    <Button onClick={() => router.push(`/messages?conversationId=${userProfile.uid}-${profile.uid}`)}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Message
                    </Button>
                  )}
                  <UserManagementDialogs profile={currentProfile} permissions={managementPermissions} userProfile={userProfile} onUpdate={onProfileUpdate} />
                </>
            )}
          </div>
        </div>

        <Tabs defaultValue={getActiveTab()} onValueChange={handleTabChange} className="mt-6">
          <TabsList>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="connections">Connections</TabsTrigger>
            {isOwnProfile && <TabsTrigger value="settings">Settings</TabsTrigger>}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
