
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MailCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import Link from "next/link";

export default function VerifyEmailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [time, setTime] = useState(60);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace("/login");
      } else if (user.emailVerified) {
        router.replace("/feed");
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const interval = setInterval(() => {
        if (user) {
            user.reload().then(() => {
                if(user.emailVerified) {
                    router.replace('/feed');
                }
            })
        }
    }, 5000);
    return () => clearInterval(interval);
  }, [user, router]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (time > 0) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime - 1);
      }, 1000);
    }
    return () => {
      if(interval) clearInterval(interval);
    };
  }, [time]);


  const handleResend = async () => {
    if (!user || time > 0) return;

    setSending(true);
    try {
      await sendEmailVerification(user);
      toast({
        title: "Verification Email Sent",
        description: "A new verification link has been sent to your email address.",
      });
      setTime(60);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification email.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };
  
  if (authLoading || !user || user.emailVerified) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
            <MailCheck className="w-16 h-16 text-primary mb-4" />
            <CardTitle className="text-2xl font-headline">Verify Your Email</CardTitle>
            <CardDescription>
                A verification link has been sent to your email address: <strong>{user.email}</strong>.
                Please click the link to continue.
            </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
                Didn't receive an email? Check your spam folder or click below to resend.
            </p>
            <Button onClick={handleResend} disabled={sending || time > 0} className="w-full mt-4">
                {sending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {time > 0 ? `Resend in ${time}s` : "Resend Verification Email"}
            </Button>
            <div className="mt-6 text-sm">
                <Link href="/login" className="underline text-primary">
                    Back to Login
                </Link>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
