
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Loader2 } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (!user.emailVerified) {
        router.replace("/verify-email");
      } else if (userProfile?.userType === 'Suspended' || userProfile?.userType === 'Inactive') {
        router.replace('/landing');
      } else if (userProfile?.userType !== 'Admin' && pathname.startsWith('/admin')) {
         router.replace('/feed');
      }
    }
  }, [user, userProfile, loading, router, pathname]);

  if (loading || !user || !user.emailVerified) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (userProfile?.userType !== 'Admin' && pathname.startsWith('/admin')) {
      return (
        <div className="flex h-screen items-center justify-center bg-background">
            <p>Access Denied. You must be an administrator to view this page.</p>
        </div>
      );
  }

  if (userProfile?.userType === 'Suspended' || userProfile?.userType === 'Inactive') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const isMessagesPage = pathname === '/messages';


  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className={`flex-grow ${!isMessagesPage ? 'container mx-auto px-2 py-4' : ''}`}>{children}</main>
      {!isMessagesPage && <Footer />}
    </div>
  );
}
