import { useState } from 'react';
import { 
  Share2, 
  Copy, 
  Check, 
  Facebook, 
  Instagram, 
  Twitter, 
  Linkedin,
  MessageCircle,
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PropertyShareProps {
  propertyId: string;
  title: string;
  className?: string;
  variant?: 'outline' | 'ghost' | 'default';
  size?: 'icon' | 'default' | 'sm';
}

export function PropertyShare({ propertyId, title, className, variant = 'outline', size = 'icon' }: PropertyShareProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const shareUrl = `${window.location.origin}/property/${propertyId}`;
  const shareText = `Check out this amazing property on ZeroBroker: ${title}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ZeroBroker Property',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast.error('Error sharing');
        }
      }
    } else {
      setIsOpen(true);
    }
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-[#25D366] hover:bg-[#25D366]/90',
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank'),
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-[#1877F2] hover:bg-[#1877F2]/90',
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank'),
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-[#1DA1F2] hover:bg-[#1DA1F2]/90',
      action: () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank'),
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-[#0A66C2] hover:bg-[#0A66C2]/90',
      action: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank'),
    },
    {
      name: 'Instagram',
      icon: Instagram,
      color: 'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] hover:opacity-90',
      action: () => {
        handleCopyLink();
        toast.info('Link copied! Open Instagram to share in stories.');
      },
    },
    {
      name: 'TikTok',
      icon: () => (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.59-1.01V19.06c.1 6.64-7.56 10.32-11.84 6.27-3.92-3.32-2.31-10.42 2.94-11.14 1-.16 2.03-.08 3 .15v4.11c-.81-.25-1.7-.31-2.52-.1-.85.22-1.58.74-2 1.49-.91 1.72-.05 4.17 1.86 4.79 1.7.53 3.73-.39 3.99-2.18.06-1.16.03-10.46.03-11.66 2.5.15 4.88 1.25 6.47 3.2L16.44 4.17c-1.17-1.13-1.68-2.67-1.75-4.17h-2.16z"/>
        </svg>
      ),
      color: 'bg-black hover:bg-black/90',
      action: () => {
        handleCopyLink();
        toast.info('Link copied! Open TikTok to share.');
      },
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={cn("rounded-full transition-all duration-300", className)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleNativeShare();
          }}
        >
          <Share2 className={cn(size === 'icon' ? "w-4 h-4" : "w-4 h-4 mr-2")} />
          {size !== 'icon' && "Share"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl border-white/10 bg-card/95 backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-display tracking-tight">Share Property</DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium">
            Spread the word and help someone find their zero-brokerage home!
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 py-6">
            {shareOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.name}
                  onClick={() => {
                    option.action();
                    if (option.name !== 'Instagram' && option.name !== 'TikTok') setIsOpen(false);
                  }}
                  className="flex flex-col items-center gap-2 group transition-all"
                >
                  <div className={cn(
                    "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all duration-300 group-hover:scale-110 group-active:scale-95 group-hover:rotate-3",
                    option.color
                  )}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                    {option.name}
                  </span>
                </button>
              );
            })}
        </div>

        <div className="flex items-center space-x-2 bg-secondary/30 p-2 rounded-2xl border border-white/5">
          <div className="flex-1 min-w-0 px-2">
            <p className="text-xs text-muted-foreground truncate font-medium">
              {shareUrl}
            </p>
          </div>
          <Button 
            type="submit" 
            size="sm" 
            className="px-3 rounded-xl gap-2 font-bold uppercase text-[10px] tracking-widest h-9"
            onClick={handleCopyLink}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
