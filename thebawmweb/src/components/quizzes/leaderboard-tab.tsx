
"use client";

import { useState, useEffect } from "react";
import { QuizInfo, UserProfile, QuizSubmission } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Loader2, Trophy, Medal, Star, Trash2 } from "lucide-react";
import { collection, query, where, orderBy, getDocs, documentId, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "../ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export function LeaderboardTab({ quiz }: { quiz: QuizInfo }) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const isOwner = quiz.ownerId === user?.uid;
  const isAdmin = userProfile?.userType === 'Admin';
  const canModerate = isOwner || isAdmin;

  useEffect(() => {
    setLoading(true);
    const submissionsQuery = query(
      collection(db, "quizSubmissions"),
      where("quizId", "==", quiz.id),
      orderBy("score", "desc")
    );

    const unsubscribe = onSnapshot(submissionsQuery, async (submissionsSnapshot) => {
        if (submissionsSnapshot.empty) {
            setSubmissions([]);
            setLoading(false);
            return;
        }

        const submissionData = submissionsSnapshot.docs.map(doc => ({...doc.data(), id: doc.id} as QuizSubmission));

        const userIds = [...new Set(submissionData.map(s => s.userId))];
        if (userIds.length > 0) {
            const usersQuery = query(collection(db, "users"), where(documentId(), "in", userIds.slice(0,30)));
            const usersSnapshot = await getDocs(usersQuery);
            const usersMap = new Map<string, UserProfile>();
            usersSnapshot.forEach(doc => usersMap.set(doc.id, { ...doc.data(), uid: doc.id } as UserProfile));
            
            submissionData.forEach(sub => {
                sub.user = usersMap.get(sub.userId);
            });
        }
        
        setSubmissions(submissionData);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching leaderboard:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [quiz.id]);
  
  const handleDeleteSubmission = async (submissionId: string) => {
      try {
          await deleteDoc(doc(db, "quizSubmissions", submissionId));
          toast({ title: "Submission removed", description: "The user's attempt has been deleted."});
      } catch (error) {
          console.error("Error deleting submission:", error);
          toast({ title: "Error", description: "Could not remove submission.", variant: "destructive" });
      }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 2) return <Star className="h-5 w-5 text-orange-400" />;
    return <span className="w-5 text-center font-bold">{rank + 1}</span>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <CardDescription>See who's at the top of the {quiz.name} quiz.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
        ) : submissions.length > 0 ? (
          <div className="space-y-4">
            {submissions.map((submission, index) => (
              submission.user && (
                <div key={submission.id} className="flex items-center gap-4 p-2 rounded-md hover:bg-muted">
                    <div className="w-8 flex justify-center items-center">{getRankIcon(index)}</div>
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={submission.user.profilePictureUrl || undefined} />
                        <AvatarFallback>{submission.user.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Link href={`/profile/${submission.user.username}`} className="flex-grow font-semibold hover:underline">
                        {submission.user.displayName}
                    </Link>
                    <p className="font-bold text-lg">{submission.score} pts</p>
                    {canModerate && submission.user.uid !== user?.uid && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Submission?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete {submission.user.displayName}'s attempt. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteSubmission(submission.id)}>Remove</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
              )
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No one has completed the quiz yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
