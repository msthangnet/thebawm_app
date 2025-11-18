import Link from 'next/link';
import { Users } from 'lucide-react';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="The Bawm Home">
      <div className="rounded-lg bg-primary p-2">
        <Users className="h-6 w-6 text-primary-foreground" />
      </div>
      <span className="hidden text-xl font-bold tracking-tight text-foreground sm:inline-block">
        The Bawm
      </span>
    </Link>
  );
}
