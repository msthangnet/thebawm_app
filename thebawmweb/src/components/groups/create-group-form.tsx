
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
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

const groupFormSchema = z.object({
  name: z.string().min(3, "Group name must be at least 3 characters long.").max(50, "Group name must be 50 characters or less."),
  groupId: z.string()
    .min(3, "Group ID must be at least 3 characters.")
    .max(30, "Group ID must be 30 characters or less.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Group ID can only contain lowercase letters, numbers, and single hyphens."),
  category: z.string().min(1, "Category is required.").max(30, "Category must be 30 characters or less."),
  description: z.string().max(255, "Description must be 255 characters or less.").optional(),
  groupType: z.enum(["public", "private"], { required_error: "You must select a group type." }),
  profilePicture: z.any().optional(),
});

type GroupFormValues = z.infer<typeof groupFormSchema>;

export function CreateGroupForm() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const form = useForm<GroupFormValues>({
        resolver: zodResolver(groupFormSchema),
        defaultValues: {
            name: "",
            groupId: "",
            category: "",
            description: "",
            groupType: "public",
        },
    });

    async function onSubmit(values: GroupFormValues) {
        if (!user) {
            toast({ title: "Error", description: "You must be logged in to create a group.", variant: "destructive" });
            return;
        }

        setLoading(true);

        try {
            const groupsRef = collection(db, "groups");
            const q = query(groupsRef, where("groupId", "==", values.groupId));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                form.setError("groupId", { type: "manual", message: "This Group ID is already taken." });
                setLoading(false);
                return;
            }

            let profilePictureUrl = "";
            if (values.profilePicture && values.profilePicture[0]) {
                 const file = values.profilePicture[0];
                 const storageRef = ref(storage, `groups/${values.groupId}/profile/${file.name}`);
                 const uploadResult = await uploadBytes(storageRef, file);
                 profilePictureUrl = await getDownloadURL(uploadResult.ref);
            }
            
            const newGroupData = {
                name: values.name,
                groupId: values.groupId,
                category: values.category,
                description: values.description || "",
                ownerId: user.uid,
                admins: [user.uid],
                members: [user.uid],
                createdAt: serverTimestamp(),
                profilePictureUrl: profilePictureUrl,
                coverImageUrl: "",
                posters: 'admins',
                groupType: values.groupType,
                pendingMembers: [],
            };

            const groupDocRef = await addDoc(collection(db, "groups"), newGroupData);
            
            toast({ title: "Group Created!", description: `The group "${values.name}" has been successfully created.` });
            router.push(`/groups/${values.groupId}`);

        } catch (error) {
            console.error("Error creating group:", error);
            toast({ title: "Error", description: "Could not create the group. Please try again.", variant: "destructive" });
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
                            <FormLabel>Group Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Book Lovers Club" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="groupId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Group ID</FormLabel>
                            <FormControl>
                                <Input placeholder="book-lovers-club" {...field} />
                            </FormControl>
                             <FormDescription>
                                This will be your group's unique web address. Use only lowercase letters, numbers, and hyphens.
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
                                <Input placeholder="e.g., Reading, Hobbies, Tech" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="groupType"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Group Privacy</FormLabel>
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
                                    Public - Anyone can see who's in the group and what they post.
                                    </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="private" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                    Private - Only members can see who's in the group and what they post.
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
                                <Textarea placeholder="Tell everyone what your group is about." {...field} />
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
                        Create Group
                    </Button>
                </div>
            </form>
        </Form>
    );
}
