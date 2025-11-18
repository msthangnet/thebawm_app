

"use client";

import { useState, useEffect, useCallback } from "react";
import { PageInfo, UserProfile } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Loader2, Trash2 } from "lucide-react";
import { collection, getDocs, query, where, documentId, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";


function FollowerCard({ user: follower, page, isModerator }: { user: UserProfile, page: PageInfo, isModerator: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const handleBan = async () => {
      const pageRef = doc(db, 'pages', page.id);
      const userRef = doc(db, 'users', follower.uid);
      try {
          await updateDoc(pageRef, {
              followers: arrayRemove(follower.uid),
              bannedUsers: arrayUnion(follower.uid)
          });
          await updateDoc(userRef, { followedPages: arrayRemove(page.id) });
          toast({ title: "User Banned", description: `${follower.displayName} has been banned from this page.`});
      } catch (error) {
          console.error("Error banning user:", error);
          toast({ title: "Error", description: "Could not ban user.", variant: "destructive" });
      }
  }

  const isSelf = user?.uid === follower.uid;

  return (
    <Card className="p-4 flex items-center gap-4">
       <Link href={`/profile/${follower.username}`} className="flex-grow flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={follower.profilePictureUrl || undefined} alt={follower.displayName} />
          <AvatarFallback>{follower.displayName?.charAt(0).toUpperCase() || follower.username?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-grow">
            <p className="font-semibold hover:underline">{follower.displayName}</p>
            <p className="text-sm text-muted-foreground">@{follower.username}</p>
        </div>
      </Link>
      {isModerator && !isSelf && follower.uid !== page.ownerId && (
        <Button variant="ghost" size="icon" className="text-destructive" onClick={handleBan}>
            <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </Card>
  );
}


export function PageFollowersTab({ page }: { page: PageInfo }) {
    const { user, userProfile } = useAuth();
    const [followers, setFollowers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    const isOwner = page.ownerId === user?.uid;
    const isAdmin = userProfile?.userType === 'Admin';
    const canModerate = isOwner || isAdmin;

    const fetchFollowers = useCallback(async () => {
        if (page.followers.length === 0) {
            setLoading(false);
            return;
        }
        try {
            const usersRef = collection(db, "users");
            // Firestore 'in' query is limited to 30 elements. Batch if needed.
            const q = query(usersRef, where(documentId(), 'in', page.followers.slice(0,30)));
            const snapshot = await getDocs(q);
            const fetchedFollowers = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
            setFollowers(fetchedFollowers);
        } catch (error) {
            console.error("Error fetching followers:", error);
        } finally {
            setLoading(false);
        }
    }, [page.followers]);

    useEffect(() => {
        fetchFollowers();
    }, [fetchFollowers]);


    return (
        <Card>
            <CardHeader>
                <CardTitle>Followers</CardTitle>
                <CardDescription>{page.name} has {page.followers.length} {page.followers.length === 1 ? 'follower' : 'followers'}.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : followers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {followers.map(follower => <FollowerCard key={follower.uid} user={follower} page={page} isModerator={canModerate} />)}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-8">This page doesn't have any followers yet.</p>
                )}
            </CardContent>
        </Card>
    );
}
