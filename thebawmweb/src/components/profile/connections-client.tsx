
"use client";

import type { UserProfile } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCard } from "@/components/community/user-card";

export function ConnectionsClient({ profile, connections }: { profile: UserProfile, connections: UserProfile[] }) {
  if (!profile) {
    return <div>User not found.</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Connections</CardTitle>
          <CardDescription>{profile.displayName} has {connections.length} {connections.length === 1 ? 'connection' : 'connections'}.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {connections.length > 0 ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {connections.map(conn => (
                    <UserCard key={conn.uid} user={conn} />
                ))}
           </div>
        ) : (
            <p className="text-muted-foreground text-center py-8">No connections to show.</p>
        )}
      </CardContent>
    </Card>
  );
}
