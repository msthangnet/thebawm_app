
'use client';
import { useState, useRef } from 'react';
import type { UserProfile, Conversation } from '@/lib/types';
import { useMessageSettings } from '@/context/message-settings-context';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ImageIcon, Video, Send, Paperclip, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import Image from 'next/image';

interface ChatInputProps {
  currentUser: UserProfile;
  selectedConversation: Conversation;
  onSendMessage: (message: { text: string; image?: File; video?: File }) => void;
  areFriends: boolean;
}

export function ChatInput({ currentUser, selectedConversation, onSendMessage, areFriends }: ChatInputProps) {
  const [text, setText] = useState('');
  const [filePreview, setFilePreview] = useState<{ url: string; file: File; type: 'image' | 'video' } | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { settings } = useMessageSettings();
  const { toast } = useToast();

  const userRole = currentUser.userType ?? 'Active';
  const canSendPhoto = settings[userRole]?.canSendPhoto ?? false;
  const canSendVideo = settings[userRole]?.canSendVideo ?? false;
  
  const handleSend = () => {
    if (!text.trim() && !filePreview) return;
    
    const messagePayload: { text: string; image?: File; video?: File } = { text };
    if (filePreview) {
      if (filePreview.type === 'image') {
        messagePayload.image = filePreview.file;
      } else {
        messagePayload.video = filePreview.file;
      }
    }
    
    onSendMessage(messagePayload);
    setText('');
    setFilePreview(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
      const file = event.target.files?.[0];
      if (!file) return;

      setFilePreview({
          url: URL.createObjectURL(file),
          file: file,
          type: type
      });
  }

  const removeAttachment = () => {
      if (filePreview) {
          URL.revokeObjectURL(filePreview.url);
          setFilePreview(null);
      }
  }

  const isPrivileged = currentUser.userType === 'Admin' || currentUser.userType === 'Editor';

  if (!areFriends && !isPrivileged) {
    return (
      <div className="p-4 border-t">
        <Alert>
          <AlertTitle>Not Connected</AlertTitle>
          <AlertDescription>You must be connected with this user to send messages.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-4 border-t">
      <div className="relative">
         {filePreview && (
            <div className="relative mb-2 w-32 h-32">
                {filePreview.type === 'image' ? (
                    <Image src={filePreview.url} alt="Preview" fill className="object-cover rounded-md" />
                ) : (
                    <video src={filePreview.url} className="w-full h-full rounded-md" controls />
                )}
                <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={removeAttachment}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
        )}
        <Textarea
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="pr-24"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
            <Popover>
                <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" disabled={(!canSendPhoto && !canSendVideo) || !!filePreview}>
                        <Paperclip className="h-5 w-5" />
                        <span className="sr-only">Attach file</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2">
                    <input type="file" accept="image/*" ref={imageInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'image')} />
                    <Button 
                        variant="ghost"
                        className="w-full justify-start"
                        disabled={!canSendPhoto}
                        onClick={() => imageInputRef.current?.click()}
                    >
                        <ImageIcon className="mr-2 h-4 w-4" /> Photo
                    </Button>
                     <input type="file" accept="video/*" ref={videoInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'video')} />
                    <Button 
                        variant="ghost" 
                        className="w-full justify-start"
                        disabled={!canSendVideo}
                        onClick={() => videoInputRef.current?.click()}
                    >
                        <Video className="mr-2 h-4 w-4" /> Video
                    </Button>
                </PopoverContent>
            </Popover>
           <Button type="button" size="icon" onClick={handleSend} disabled={!text.trim() && !filePreview}>
            <Send className="h-5 w-5" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
