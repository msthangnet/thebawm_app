
'use client';
import type { Video, UserProfile } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Edit, MoreVertical, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface VideoCardProps {
    video: Video;
    uploader: UserProfile;
}

// Function to format view count
const formatViews = (count: number): string => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K views`;
    return `${count} views`;
};

export function VideoCard({ video, uploader }: VideoCardProps) {
    const { userProfile } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const handleEdit = () => {
        router.push(`/videos/edit/${video.id}`);
    };

    const handleDelete = () => {
        // TODO: Implement actual deletion from Firestore
        toast({ title: 'Video Deleted', description: `"${video.title}" has been deleted.`, variant: 'destructive'});
    };

    return (
        <div className="flex flex-col gap-3">
             <Link href={`/videos/${video.slug}`} className="block relative aspect-video rounded-xl overflow-hidden group">
                 <Image 
                    src={video.thumbnailUrl} 
                    alt={video.title} 
                    fill 
                    className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                    data-ai-hint="video thumbnail"
                 />
             </Link>
             <div className="flex gap-3">
                <Link href={`/profile/${uploader.username}`}>
                    <Avatar>
                        <AvatarImage src={uploader.profilePictureUrl || undefined} alt={uploader.displayName} />
                        <AvatarFallback>{uploader.displayName?.substring(0,1)}</AvatarFallback>
                    </Avatar>
                </Link>
                <div className="flex-grow">
                    <div className="flex flex-col">
                        <Link href={`/videos/${video.slug}`} className="font-semibold leading-snug hover:text-primary transition-colors">
                            {video.title}
                        </Link>
                        <Link href={`/profile/${uploader.username}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            {uploader.displayName}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                            {formatViews(video.viewCount)} &bull; {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true }).replace('about ', '').replace('over ', '')}
                        </p>
                    </div>
                </div>
                {userProfile?.userType === 'Admin' && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={handleEdit}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
             </div>
        </div>
    );
}
