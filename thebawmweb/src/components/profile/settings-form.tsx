"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function SettingsForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthDialogOpen, setReauthDialogOpen] = useState(false);

  const handleUpdatePassword = async () => {
    if (!user) return;
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setIsUpdating(true);

    try {
      if (!user.email) {
          throw new Error("User email not available.");
      }
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      toast({ title: "Password updated successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error(error);
      toast({ title: "Error updating password", description: error.message, variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
      if (!user) return;
      setIsDeleting(true);

      try {
        if (!user.email) {
            throw new Error("User email not available.");
        }
        const credential = EmailAuthProvider.credential(user.email, reauthPassword);
        await reauthenticateWithCredential(user, credential);
        
        // Delete user from Firestore
        await deleteDoc(doc(db, "users", user.uid));
        
        // Delete user from Auth
        await deleteUser(user);

        toast({ title: "Account deleted successfully." });
        router.push('/signup');

      } catch (error: any) {
          console.error(error);
          toast({ title: "Error deleting account", description: error.message, variant: "destructive" });
          setIsDeleting(false);
          setReauthDialogOpen(false);
      }
  }


  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your password here. It's recommended to use a strong, unique password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="password" placeholder="Current Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <Input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <Input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          <Button onClick={handleUpdatePassword} disabled={isUpdating}>
            {isUpdating ? "Updating..." : "Update Password"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Delete Account</CardTitle>
          <CardDescription>Permanently delete your account and all of your content. This action cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent>
            <Dialog open={reauthDialogOpen} onOpenChange={setReauthDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="destructive">Delete My Account</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                           This action cannot be undone. To confirm, please enter your password.
                        </DialogDescription>
                    </DialogHeader>
                    <Input 
                        type="password"
                        placeholder="Enter your password"
                        value={reauthPassword}
                        onChange={(e) => setReauthPassword(e.target.value)}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReauthDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting || !reauthPassword}>
                             {isDeleting ? "Deleting..." : "Delete Account"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
