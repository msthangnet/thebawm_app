
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export function Hero() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-image');

  return (
    <section className="relative w-full h-[70vh] min-h-[500px] flex items-center justify-center text-center text-white">
      {heroImage && (
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          className="object-cover"
          priority
          data-ai-hint={heroImage.imageHint}
        />
      )}
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 container mx-auto px-4">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-5xl lg:text-6xl font-headline">
          Welcome to The Bawm
        </h1>
        <p className="mx-auto mt-4 max-w-[700px] text-lg md:text-xl">
          Your new community awaits. Connect, share, and grow together in a space that's all yours.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/signup">Get Started</Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/login">Log In</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
