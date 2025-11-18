
"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { LayoutGrid, LogOut, User as UserIcon, Bell, Newspaper, Users, Flag, Calendar, Group, BellRing } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NotificationPopover } from "./notification-popover";
import { AppGridMenu } from "./app-grid-menu";
import { MessagePopover } from "./message-popover";
import { cn } from "@/lib/utils";

export function Header() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/landing");
  };

  const navItems = [
    { href: "/feed", icon: Newspaper, label: "Social" },
    { href: "/community", icon: Users, label: "Community" },
    { href: "/pages", icon: Flag, label: "Pages" },
    { href: "/groups", icon: Group, label: "Groups" },
    { href: "/events", icon: Calendar, label: "Events" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center px-4">
        <div className="flex-1 flex items-center justify-start">
            <Logo />
        </div>
        
        <nav className="flex-1 hidden items-center justify-center gap-8 md:flex">
          {user && (
            <TooltipProvider>
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn("transition-colors hover:text-primary", isActive ? "text-accent" : "text-muted-foreground")}
                        aria-label={item.label}
                      >
                        <item.icon className="h-6 w-6" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </TooltipProvider>
          )}
        </nav>
        <div className="flex flex-1 items-center justify-end gap-2">
          {user ? (
            <>
              <AppGridMenu />
              <MessagePopover />
              <NotificationPopover />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={userProfile?.profilePictureUrl || undefined} alt={userProfile?.username} />
                      <AvatarFallback>
                        {userProfile?.displayName?.charAt(0).toUpperCase() || userProfile?.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userProfile?.displayName || userProfile?.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push(`/profile/${userProfile?.username}`)}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => router.push(`/notifications`)}>
                    <BellRing className="mr-2 h-4 w-4" />
                    <span>Notifications</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

