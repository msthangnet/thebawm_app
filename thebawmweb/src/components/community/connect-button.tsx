

"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc, writeBatch, collection, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { Loader2, UserPlus, HelpCircle, UserCheck, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import { cn } from "@/lib/utils";

type ConnectionStatus = "not_connected" | "pending_sent" | "pending_received" | "connected";

export function ConnectButton({ targetUserId }: { targetUserId: string }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const checkConnectionStatus = useCallback(async () => {
    if (!user) {
        setLoading(false);
        return;
    };
    try {
      const userConnectionDoc = doc(db, 'users', user.uid, 'connections', targetUserId);
      const docSnap = await getDoc(userConnectionDoc);

      if (docSnap.exists()) {
        setStatus(docSnap.data().status as ConnectionStatus);
      } else {
        const targetConnectionDoc = doc(db, 'users', targetUserId, 'connections', user.uid);
        const targetDocSnap = await getDoc(targetConnectionDoc);
        if (targetDocSnap.exists()) {
             setStatus('pending_received');
        } else {
            setStatus("not_connected");
        }
      }
    } catch (error) {
      console.error("Error checking connection status:", error);
      toast({ title: "Error", description: "Could not check connection status.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, targetUserId, toast]);

  useEffect(() => {
    checkConnectionStatus();
  }, [checkConnectionStatus]);

  const handleConnect = async () => {
    if (!user) return;
    setLoading(true);
    try {
        const userConnectionRef = doc(db, 'users', user.uid, 'connections', targetUserId);
        const targetConnectionRef = doc(db, 'users', targetUserId, 'connections', user.uid);
        const notificationRef = collection(db, 'notifications');
        
        const batch = writeBatch(db);

        batch.set(userConnectionRef, { status: 'pending_sent' });
        batch.set(targetConnectionRef, { status: 'pending_received' });

        batch.set(doc(notificationRef), {
            recipientId: targetUserId,
            senderId: user.uid,
            type: 'connection_request',
            entityId: user.uid,
            entityType: 'user',
            createdAt: serverTimestamp(),
            read: false,
        });

        await batch.commit();

        setStatus('pending_sent');
        toast({ title: "Connection request sent!" });
    } catch (error) {
        console.error("Error sending connection request:", error);
        toast({ title: "Error", description: "Could not send request.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!user) return;
    setLoading(true);
    try {
        const batch = writeBatch(db);

        const userConnectionRef = doc(db, 'users', user.uid, 'connections', targetUserId);
        batch.delete(userConnectionRef);

        const targetConnectionRef = doc(db, 'users', targetUserId, 'connections', user.uid);
        batch.delete(targetConnectionRef);

        // Find and delete the notification
        const notificationsQuery = query(
            collection(db, 'notifications'),
            where('recipientId', '==', targetUserId),
            where('senderId', '==', user.uid),
            where('type', '==', 'connection_request')
        );
        const notificationsSnapshot = await getDocs(notificationsQuery);
        notificationsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        
        setStatus('not_connected');
        toast({ title: "Connection request canceled." });
    } catch (error) {
        console.error("Error canceling request:", error);
        toast({ title: "Error", description: "Could not cancel request.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };
  
  const handleDisconnect = async () => {
    if (!user) return;
    setLoading(true);
    try {
        const userConnectionRef = doc(db, 'users', user.uid, 'connections', targetUserId);
        const targetConnectionRef = doc(db, 'users', targetUserId, 'connections', user.uid);
        
        await writeBatch(db)
          .delete(userConnectionRef)
          .delete(targetConnectionRef)
          .commit();
          
        setStatus('not_connected');
        toast({ title: "Disconnected." });
    } catch (error) {
        console.error("Error disconnecting:", error);
        toast({ title: "Error", description: "Could not disconnect.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };
  
  const handleAccept = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const userConnectionRef = doc(db, 'users', user.uid, 'connections', targetUserId);
        const targetConnectionRef = doc(db, 'users', targetUserId, 'connections', user.uid);
        
        await writeBatch(db)
          .set(userConnectionRef, { status: 'connected' })
          .set(targetConnectionRef, { status: 'connected' })
          .commit();

        setStatus('connected');
        toast({ title: "Connection accepted!" });
      } catch (error) {
          console.error("Error accepting connection:", error);
          toast({ title: "Error", description: "Could not accept connection.", variant: "destructive" });
      } finally {
          setLoading(false);
      }
  };

  const handleDecline = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const userConnectionRef = doc(db, 'users', user.uid, 'connections', targetUserId);
        const targetConnectionRef = doc(db, 'users', targetUserId, 'connections', user.uid);
        
        await writeBatch(db)
            .delete(userConnectionRef)
            .delete(targetConnectionRef)
            .commit();
            
        setStatus('not_connected');
        toast({ title: "Connection declined." });
      } catch (error) {
          console.error("Error declining connection:", error);
          toast({ title: "Error", description: "Could not decline connection.", variant: "destructive" });
      } finally {
          setLoading(false);
      }
  }

  if (loading) {
    return <Button disabled className="w-full"><Loader2 className="animate-spin h-4 w-4 mr-2" />Loading...</Button>
  }
  
  if (status === 'connected') {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button className="w-full bg-green-500 hover:bg-green-600">
                    <UserCheck className="mr-2 h-4 w-4" /> Connected
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect</AlertDialogTitle>
                    <AlertDialogDescription>Are you sure you want to disconnect from this user?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDisconnect} className="bg-destructive hover:bg-destructive/90">Disconnect</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
  }

  if (status === 'pending_sent') {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-white">
                    <HelpCircle className="mr-2 h-4 w-4" /> Requested
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Request</AlertDialogTitle>
                    <AlertDialogDescription>Are you sure you want to cancel this connection request?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Keep Request</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelRequest} variant="destructive">Cancel Request</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
  }

  if (status === 'pending_received') {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                 <Button className="w-full bg-purple-500 hover:bg-purple-600">Accept</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Connection Request</AlertDialogTitle>
                    <AlertDialogDescription>Do you want to accept this connection request?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel asChild>
                        <Button variant="outline" onClick={handleDecline}>Decline</Button>
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleAccept}>Accept</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
  }

  return (
    <Button onClick={handleConnect} className="w-full bg-blue-500 hover:bg-blue-600">
        <UserPlus className="mr-2 h-4 w-4" /> Connect
    </Button>
  );
}
