
"use client";

import { format } from "date-fns";
import { Home, MapPin, Heart, BookOpen, GraduationCap, Gift, Users } from "lucide-react";

import type { UserProfile } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AboutClient({ profile }: { profile: UserProfile }) {
  const { user } = useAuth();
  
  if (!profile) {
    return <div>User not found.</div>;
  }

  const infoItems = [
    { icon: Home, label: "Lives in", value: profile.liveIn },
    { icon: MapPin, label: "From", value: profile.hometown },
    { icon: Heart, label: "Relationship", value: profile.relationshipStatus },
    { icon: BookOpen, label: "Studying", value: profile.currentStudy },
    { icon: GraduationCap, label: "Institute", value: profile.instituteName },
    { icon: Gift, label: "Born on", value: profile.dob ? format(new Date(profile.dob), "PPP") : null },
    { icon: Users, label: "Gender", value: profile.gender },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>About</CardTitle>
          <CardDescription>A little bit about {profile.displayName}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile.bio && (
          <div>
            <h3 className="font-semibold mb-2">Bio</h3>
            <p className="text-muted-foreground">{profile.bio}</p>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-4 pt-4">
          {infoItems.map((item, index) => item.value ? (
            <div key={index} className="flex items-center gap-3">
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{item.label}: <span className="font-semibold">{item.value}</span></span>
            </div>
          ) : null)}
        </div>
         {!infoItems.some(item => item.value) && !profile.bio && (
            <p className="text-muted-foreground text-center py-8">No information to show.</p>
        )}
      </CardContent>
    </Card>
  );
}
