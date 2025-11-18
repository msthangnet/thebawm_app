

"use client";

import { UserProfile } from "@/lib/types";
import { Clock, Star, Zap, CheckCircle, LucideIcon, Eye, Shield, Award } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { cn } from "@/lib/utils";

type UserType = NonNullable<UserProfile['userType']>;

const userTypeConfig: Record<UserType, { icon: LucideIcon; label: string; color: string }> = {
  Active: { icon: Clock, label: 'Active User', color: 'text-blue-500' },
  Thunder: { icon: Zap, label: 'Thunder User', color: 'text-purple-500' },
  Star: { icon: Star, label: 'Star User', color: 'text-yellow-500' },
  Leader: { icon: Award, label: 'Leader', color: 'text-orange-500' },
  Editor: { icon: Shield, label: 'Editor', color: 'text-green-500' },
  Admin: { icon: CheckCircle, label: 'Administrator', color: 'text-red-500' },
  Inactive: { icon: Clock, label: 'Inactive User', color: 'text-gray-500' },
  Suspended: { icon: Clock, label: 'Suspended User', color: 'text-gray-500' },
};


export function UserTypeIcon({ userType, className }: { userType?: UserType, className?: string }) {
    if (!userType) {
        const Icon = Eye;
        const label = 'Viewer';
        const color = 'text-muted-foreground';
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className={cn(color, className)}>
                            <Icon className={cn("h-3.5 w-3.5", className)} />
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{label}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    const config = userTypeConfig[userType];

    if (!config) {
        return null;
    }

    const { icon: Icon, label, color } = config;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className={cn(color, className)}>
                        <Icon className={cn("h-3.5 w-3.5", className)} />
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{label}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

