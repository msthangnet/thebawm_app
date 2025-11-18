

"use client";

import { QuizInfo, UserProfile } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { doc, deleteDoc, writeBatch, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "../ui/input";
import { Loader2, Trash2, X, Search } from "lucide-react";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";

function QuizLimitsSettings({ quiz, onUpdate }: { quiz: QuizInfo, onUpdate: () => void }) {
    const [timeLimit, setTimeLimit] = useState(quiz.timeLimitMinutes);
    const [attemptLimit, setAttemptLimit] = useState(quiz.attemptLimit);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        setSaving(true);
        try {
            const quizRef = doc(db, "quizzes", quiz.id);
            await updateDoc(quizRef, {
                timeLimitMinutes: Number(timeLimit),
                attemptLimit: Number(attemptLimit)
            });
            toast({ title: "Settings Saved", description: "Quiz limits have been updated." });
            onUpdate();
        } catch (error) {
            console.error("Error saving limits:", error);
            toast({ title: "Error", description: "Could not save settings.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
         <Card>
            <CardHeader>
                <CardTitle>Quiz Limits</CardTitle>
                <CardDescription>Set the time and attempt limits for this quiz.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="time-limit">Time Limit (Minutes)</Label>
                        <Input
                            id="time-limit"
                            type="number"
                            min="1"
                            value={timeLimit}
                            onChange={(e) => setTimeLimit(Number(e.target.value))}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="attempt-limit">Attempt Limit</Label>
                        <Input
                            id="attempt-limit"
                            type="number"
                            min="1"
                            value={attemptLimit}
                            onChange={(e) => setAttemptLimit(Number(e.target.value))}
                        />
                    </div>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Save Limits
                </Button>
            </CardContent>
        </Card>
    )
}

function PostersSettings({ quiz, onUpdate }: { quiz: QuizInfo, onUpdate: () => void }) {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [allowedPosters, setAllowedPosters] = useState<UserProfile[]>([]);
    const [loadingPosters, setLoadingPosters] = useState(true);

    const postersIds = useMemo(() => Array.isArray(quiz.posters) ? quiz.posters : [], [quiz.posters]);

    const fetchAllowedPosters = useCallback(async () => {
        setLoadingPosters(true);
        if (postersIds.length === 0) {
            setAllowedPosters([]);
            setLoadingPosters(false);
            return;
        }
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where('uid', 'in', postersIds.slice(0, 30)));
            const usersSnapshot = await getDocs(q);
            const fetchedUsers = usersSnapshot.docs.map(doc => doc.data() as UserProfile);
            setAllowedPosters(fetchedUsers);
        } catch (error) {
            console.error("Error fetching allowed posters:", error);
        } finally {
            setLoadingPosters(false);
        }
    }, [postersIds]);


    useEffect(() => {
        fetchAllowedPosters();
    }, [fetchAllowedPosters]);

    useEffect(() => {
        const handler = setTimeout(async () => {
            if (searchQuery.trim().length > 2) {
                setIsSearching(true);
                try {
                    const usersRef = collection(db, "users");
                    const q = query(
                        usersRef,
                        where('displayName', '>=', searchQuery),
                        where('displayName', '<=', searchQuery + '\uf8ff'),
                        limit(10)
                    );
                    const usersSnapshot = await getDocs(q);
                    const results = usersSnapshot.docs.map(doc => doc.data() as UserProfile)
                        .filter(u => !postersIds.includes(u.uid) && u.uid !== quiz.ownerId);
                    setSearchResults(results);
                } catch (error) {
                    console.error("Error searching users:", error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(handler);

    }, [searchQuery, postersIds, quiz.ownerId]);

    const handleAddPoster = async (userId: string) => {
        setSaving(true);
        try {
            const quizRef = doc(db, "quizzes", quiz.id);
            await updateDoc(quizRef, {
                posters: arrayUnion(userId)
            });
            toast({ title: "User Added", description: "This user can now post in the quiz." });
            setSearchQuery("");
            setSearchResults([]);
            onUpdate();
        } catch (error) {
            console.error("Error adding poster:", error);
            toast({ title: "Error", description: "Could not grant permission.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleRemovePoster = async (userId: string) => {
        setSaving(true);
        try {
            const quizRef = doc(db, "quizzes", quiz.id);
            await updateDoc(quizRef, {
                posters: arrayRemove(userId)
            });
            toast({ title: "User Removed", description: "This user can no longer post in the quiz." });
            onUpdate();
        } catch (error) {
            console.error("Error removing poster:", error);
            toast({ title: "Error", description: "Could not revoke permission.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle>Special Posting Permissions</CardTitle>
                <CardDescription>Grant specific users permission to post regardless of participant status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="text-lg font-medium mb-2">Grant Posting Access</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search by display name to add user..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                        {(isSearching) && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin" />}
                        {searchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg">
                                {searchResults.map(u => (
                                    <div key={u.uid} onClick={() => handleAddPoster(u.uid)} className="flex items-center gap-3 p-2 hover:bg-muted cursor-pointer text-sm">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={u.profilePictureUrl || undefined} />
                                            <AvatarFallback>{u.displayName?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{u.displayName}</p>
                                            <p className="text-xs text-muted-foreground">@{u.username}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <Separator />
                <div>
                    <h3 className="text-lg font-medium mb-4">Users with Special Posting Access</h3>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                            <p className="font-semibold text-gray-500">Site Admins (Always allowed)</p>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                            <p className="font-semibold text-gray-500">Quiz Owner (Always allowed)</p>
                        </div>

                        {loadingPosters ? (
                             <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                        ) : allowedPosters.length > 0 ? (
                           allowedPosters.map(u => (
                                <div key={u.uid} className="flex items-center justify-between p-2 rounded-md hover:bg-muted text-sm">
                                   <div className="flex items-center gap-3">
                                       <Avatar className="h-8 w-8">
                                           <AvatarImage src={u.profilePictureUrl || undefined} alt={u.displayName} />
                                           <AvatarFallback>{u.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                                       </Avatar>
                                       <div>
                                           <div className="font-semibold">{u.displayName}</div>
                                           <div className="text-xs text-muted-foreground">@{u.username}</div>
                                       </div>
                                   </div>
                                   <Button variant="ghost" size="icon" onClick={() => handleRemovePoster(u.uid)} disabled={saving}>
                                       <X className="h-4 w-4" />
                                   </Button>
                               </div>
                           ))
                        ) : (
                           !loadingPosters && <p className="text-sm text-muted-foreground text-center py-4">No other users have been granted special posting access.</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function QuizSettingsTab({ quiz, onQuizUpdate }: { quiz: QuizInfo, onQuizUpdate: () => void }) {
    const { user, userProfile } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");

    const isOwner = user?.uid === quiz.ownerId;
    const isAdmin = userProfile?.userType === 'Admin';
    const canEdit = isOwner || isAdmin;
    
    const handleDeleteQuiz = async () => {
        setIsDeleting(true);
        try {
            const batch = writeBatch(db);

            const postsQuery = query(collection(db, "quizzesPost"), where("quizId", "==", quiz.id));
            const postsSnapshot = await getDocs(postsQuery);
            postsSnapshot.forEach(doc => batch.delete(doc.ref));

            const announcementsQuery = query(collection(db, "quizAnnouncementPosts"), where("quizId", "==", quiz.id));
            const announcementsSnapshot = await getDocs(announcementsQuery);
            announcementsSnapshot.forEach(doc => batch.delete(doc.ref));
            
            const questionsQuery = query(collection(db, "quizzes", quiz.id, "questions"));
            const questionsSnapshot = await getDocs(questionsQuery);
            questionsSnapshot.forEach(doc => batch.delete(doc.ref));
            
            const submissionsQuery = query(collection(db, "quizSubmissions"), where("quizId", "==", quiz.id));
            const submissionsSnapshot = await getDocs(submissionsQuery);
            submissionsSnapshot.forEach(doc => batch.delete(doc.ref));

            const quizRef = doc(db, "quizzes", quiz.id);
            batch.delete(quizRef);

            await batch.commit();

            toast({ title: "Quiz Deleted", description: `The quiz "${quiz.name}" has been permanently deleted.` });
            router.push('/quizzes');

        } catch (error) {
            console.error("Error deleting quiz:", error);
            toast({ title: "Error", description: "Could not delete the quiz.", variant: "destructive" });
        } finally {
            setIsDeleting(false);
            setDeleteDialogOpen(false);
        }
    };


    if (!canEdit) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Settings</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">You do not have permission to change settings for this quiz.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-8">
            <QuizLimitsSettings quiz={quiz} onUpdate={onQuizUpdate} />
            <PostersSettings quiz={quiz} onUpdate={onQuizUpdate} />
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle>Delete Quiz</CardTitle>
                    <CardDescription>Permanently delete this quiz and all of its content. This action cannot be undone.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="destructive">Delete This Quiz</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Are you absolutely sure?</DialogTitle>
                                <DialogDescription>
                                   This will permanently delete the quiz <strong>{quiz.name}</strong> and all related data.
                                   To confirm, type <span className="font-bold text-foreground">{quiz.quizId}</span> below.
                                </DialogDescription>
                            </DialogHeader>
                            <Input 
                                placeholder="Type quiz ID to confirm"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                            />
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                                <Button 
                                    variant="destructive" 
                                    onClick={handleDeleteQuiz} 
                                    disabled={isDeleting || confirmText !== quiz.quizId}
                                >
                                    {isDeleting ? <Loader2 className="animate-spin mr-2" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    Delete Quiz
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
        </div>
    );
}
