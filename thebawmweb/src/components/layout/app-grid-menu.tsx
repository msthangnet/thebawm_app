
"use client";

import {
  Book,
  Clapperboard,
  Award,
  BookUser,
  LayoutGrid,
  LucideIcon,
  MessageSquare,
  Music,
  Newspaper,
  ShoppingCart,
  Users,
  Flag,
  Calendar,
  Group,
  Trophy,
  BookOpen,
  Info,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';

const allAppLinks: { title: string; href: string; icon: LucideIcon; color: string; requiresAuth: boolean }[] = [
    { title: 'Social Feed', href: '/feed', icon: Newspaper, color: 'text-purple-500', requiresAuth: true },
    { title: 'Messages', href: '/messages', icon: MessageSquare, color: 'text-blue-500', requiresAuth: true },
    { title: 'Community', href: '/community', icon: Users, color: 'text-sky-500', requiresAuth: true },
    { title: 'Pages', href: '/pages', icon: Flag, color: 'text-yellow-500', requiresAuth: true },
    { title: 'Groups', href: '/groups', icon: Group, color: 'text-cyan-500', requiresAuth: true },
    { title: 'Events', href: '/events', icon: Calendar, color: 'text-amber-500', requiresAuth: true },
    { title: 'Videos', href: '/videos', icon: Clapperboard, color: 'text-red-500', requiresAuth: true },
    { title: 'Books', href: '/books', icon: BookOpen, color: 'text-green-500', requiresAuth: true },
    { title: 'Lyrics', href: '/lyrics', icon: Music, color: 'text-rose-500', requiresAuth: true },
    { title: 'Quizzes', href: '/quizzes', icon: Trophy, color: 'text-indigo-500', requiresAuth: true },
    { title: 'Marketplace', href: '/marketplace', icon: ShoppingCart, color: 'text-orange-500', requiresAuth: true },
    { title: 'About BAWM', href: '/about-bawm', icon: Info, color: 'text-gray-500', requiresAuth: true },
];

export function AppGridMenu() {
  const { user } = useAuth();

  const appLinks = allAppLinks.filter(link => {
    return !link.requiresAuth || !!user;
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <LayoutGrid className="h-5 w-5" />
          <span className="sr-only">Open App Menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[290px] sm:w-80" align="end">
        <DropdownMenuLabel>Apps</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="grid grid-cols-3 gap-2 p-2">
          {appLinks.map((link) => (
            <DropdownMenuItem key={link.href} asChild>
              <Link href={link.href} className="flex flex-col items-center justify-center gap-2 p-3 h-auto rounded-lg hover:bg-secondary focus:bg-accent focus:text-accent-foreground text-center">
                <link.icon className={`h-8 w-8 ${link.color}`} />
                <span className="text-xs font-medium">{link.title}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
