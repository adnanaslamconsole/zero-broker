import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Calendar, Zap, Star } from 'lucide-react';

interface ProofEvent {
  id: string;
  type: 'visit' | 'verified' | 'booked' | 'kyc';
  message: string;
  time: string;
  location: string;
}

const mockEvents: ProofEvent[] = [
  { id: '1', type: 'visit', message: 'recently booked a visit!', location: 'Bandra, Mumbai', time: '2 min ago' },
  { id: '2', type: 'verified', message: 'property just got verified!', location: 'Koramangala, Bangalore', time: '5 min ago' },
  { id: '3', type: 'booked', message: 'paid visit token for 2BHK', location: 'Whitefield, Bangalore', time: '12 min ago' },
  { id: '4', type: 'kyc', message: 'user got identity verified', location: 'Pune', time: '15 min ago' },
  { id: '5', type: 'visit', message: 'scheduled a site visit', location: 'DLF Phase 3, Gurgaon', time: '20 min ago' },
];

const SocialProof: React.FC = () => {
  const [currentEvent, setCurrentEvent] = useState<ProofEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const showRandomEvent = () => {
      const randomEvent = mockEvents[Math.floor(Math.random() * mockEvents.length)];
      setCurrentEvent(randomEvent);
      setIsVisible(true);

      // Hide after 5 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 5000);
    };

    // Initial delay
    const initialDelay = setTimeout(showRandomEvent, 3000);

    // Repeat every 15-25 seconds
    const interval = setInterval(() => {
      showRandomEvent();
    }, 20000 + Math.random() * 5000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, []);

  if (!currentEvent) return null;

  return (
    <div className="fixed bottom-20 left-4 z-[100] pointer-events-none">
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, x: -50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.9 }}
            className="bg-background/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-4 flex items-center gap-4 w-[280px] sm:w-[320px] pointer-events-auto"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
               {currentEvent.type === 'visit' && <Calendar className="w-5 h-5 text-primary" />}
               {currentEvent.type === 'verified' && <ShieldCheck className="w-5 h-5 text-success" />}
               {currentEvent.type === 'booked' && <Zap className="w-5 h-5 text-accent" />}
               {currentEvent.type === 'kyc' && <Star className="w-5 h-5 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground line-clamp-1">
                Someone in <span className="text-primary">{currentEvent.location}</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {currentEvent.message}
              </p>
              <p className="text-[9px] text-muted-foreground/60 mt-1 uppercase tracking-wider font-medium">
                {currentEvent.time}
              </p>
            </div>
            <div className="absolute top-2 right-2">
               <ShieldCheck className="w-3 h-3 text-success opacity-50" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SocialProof;
