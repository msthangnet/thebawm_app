
'use client';

import { VideoForm } from '@/components/videos/video-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function PublishVideoPage() {
    return (
        <div className="container mx-auto max-w-4xl py-12 px-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-headline text-primary">Publish Your Video</CardTitle>
                    <CardDescription>Share your creation with the entire Bawm community.</CardDescription>
                </CardHeader>
                <CardContent>
                    <VideoForm />
                </CardContent>
            </Card>
        </div>
    );
}
