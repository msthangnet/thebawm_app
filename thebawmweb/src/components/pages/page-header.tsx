
"use client";

import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { PageInfo } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Camera, Edit, ThumbsUp, UserPlus, Heart, Users } from "lucide-react";
import { useState } from "react";
import { FollowPageButton } from "./follow-page-button";
import { LikePageButton } from "./like-page-button";

export function PageHeader({ page }: { page: PageInfo }) {
  const { user, userProfile } = useAuth();
  const defaultCover = PlaceHolderImages.find(p => p.id === 'default-page-cover');

  const isOwner = user?.uid === page.ownerId;
  const isAdmin = userProfile?.userType === 'Admin';
  const canEdit = isOwner || isAdmin;
  
  return (
    <div className="border-b">
      <div className="h-48 md:h-64 relative group">
        <Image
          src={page.coverImageUrl || defaultCover?.imageUrl || ''}
          alt="Cover image"
          fill
          className="object-cover"
        />
        {canEdit && (
            <Button variant="secondary" className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="mr-2 h-4 w-4"/>
                Edit Cover Photo
            </Button>
        )}
      </div>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center md:items-end -mt-14 md:-mt-16">
          <div className="relative group">
            <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-background">
              <AvatarImage src={page.profilePictureUrl || undefined} alt={page.name} />
              <AvatarFallback>{page.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
             {canEdit && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="h-8 w-8 text-white"/>
                </div>
            )}
          </div>
          <div className="mt-4 md:ml-6 text-center md:text-left flex-grow">
            <h1 className="text-3xl font-bold">{page.name}</h1>
            <p className="text-muted-foreground">@{page.pageId} &middot; {page.category}</p>
            <div className="mt-2 text-sm text-muted-foreground flex items-center justify-center md:justify-start gap-4">
                <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    <span>{page.likes.length} Likes</span>
                </div>
                <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{page.followers.length} Followers</span>
                </div>
            </div>
          </div>
          <div className="mt-4 md:ml-auto flex items-center gap-2">
            <LikePageButton pageId={page.id} />
            <FollowPageButton pageId={page.id} variant="secondary" />
          </div>
        </div>
      </div>
    </div>
  );
}
