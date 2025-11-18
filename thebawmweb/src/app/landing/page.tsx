import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      <main className="flex-grow">
        <Hero />
        <Features />
      </main>
    </div>
  );
}
