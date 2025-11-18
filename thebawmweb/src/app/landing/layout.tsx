import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
