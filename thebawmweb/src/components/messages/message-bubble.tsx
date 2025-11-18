
"use client"

import * as React from "react"
import type { Message, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Check, CheckCheck, Clock, X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

interface MessageBubbleProps {
  message: Message;
  currentUser: UserProfile;
}

function FullScreenImageViewer({ imageUrl, onClose }: { imageUrl: string; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
            <div className="relative w-full h-full p-4 flex items-center justify-center">
                <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:text-white hover:bg-white/10" onClick={onClose}>
                    <X className="h-8 w-8" />
                </Button>
                 <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                    <Image 
                        src={imageUrl} 
                        alt="Fullscreen image" 
                        width={1200}
                        height={800}
                        className="object-contain max-h-[90vh] w-auto h-auto"
                    />
                </div>
            </div>
        </div>
    );
}

const MessageStatusIcon = ({ status }: { status: Message['status'] }) => {
    if (status === 'read') return <CheckCheck className="h-4 w-4 text-green-400" />;
    return null; 
};

export function MessageBubble({ message, currentUser }: MessageBubbleProps) {
  const [showTime, setShowTime] = React.useState(false);
  const [fullScreenImage, setFullScreenImage] = React.useState<string | null>(null);
  const isCurrentUser = message.senderId === currentUser.uid;

  return (
    <>
      {fullScreenImage && <FullScreenImageViewer imageUrl={fullScreenImage} onClose={() => setFullScreenImage(null)} />}
      <div className={cn('flex flex-col', isCurrentUser ? 'items-end' : 'items-start')}>
          <div className={cn('flex items-end gap-2', isCurrentUser ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-xs md:max-w-md lg:max-w-lg rounded-lg p-2 cursor-pointer',
                isCurrentUser
                  ? 'bg-primary text-primary-foreground rounded-br-none'
                  : 'bg-accent text-accent-foreground rounded-bl-none'
              )}
              onClick={() => setShowTime(!showTime)}
            >
              {message.imageUrl && (
                  <div className="relative w-[200px] aspect-square rounded-md overflow-hidden mb-2 cursor-pointer" onClick={(e) => { e.stopPropagation(); setFullScreenImage(message.imageUrl!); }}>
                      <Image src={message.imageUrl} alt="attached image" fill className="object-cover" data-ai-hint="chat image" />
                  </div>
              )}
               {message.videoUrl && (
                  <div className="relative aspect-video rounded-md overflow-hidden mb-2">
                      <video src={message.videoUrl} className="w-full h-full" controls />
                  </div>
              )}
              {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}
               {isCurrentUser && message.status && (
                  <div className="flex justify-end items-center mt-1">
                      <MessageStatusIcon status={message.status} />
                  </div>
              )}
            </div>
          </div>
           {showTime && (
              <p className="text-xs text-muted-foreground px-2 mt-1">
                  {format(new Date(message.createdAt), 'p')}
              </p>
          )}
      </div>
    </>
  );
}
