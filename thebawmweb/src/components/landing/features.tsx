import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Newspaper, MessageSquarePlus } from "lucide-react";

const features = [
  {
    icon: <Users className="h-10 w-10 text-primary" />,
    title: "Create Your Profile",
    description: "Personalize your space with a profile picture, cover image, bio, and more to show who you are.",
  },
  {
    icon: <Newspaper className="h-10 w-10 text-primary" />,
    title: "Explore the Social Feed",
    description: "Discover posts from everyone in the community. Like, comment, and engage with content that matters to you.",
  },
  {
    icon: <MessageSquarePlus className="h-10 w-10 text-primary" />,
    title: "Share Your Moments",
    description: "Create posts with text, images, and videos. Share your life, thoughts, and creations with the community.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
            Everything You Need to Connect
          </h2>
          <p className="mx-auto mt-4 max-w-[600px] text-muted-foreground">
            The Bawm provides all the tools to build and belong to a thriving online community.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card key={index} className="text-center flex flex-col items-center">
              <CardHeader>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  {feature.icon}
                </div>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
