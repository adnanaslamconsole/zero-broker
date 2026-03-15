import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Send, CheckCircle2, MessageSquare, Building2, MapPin, User, Mail, Phone, ShoppingBag, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { getUserFriendlyErrorMessage, logError } from '@/lib/errors';

type QuestionStep = 'greeting' | 'property_type' | 'location' | 'intent' | 'full_name' | 'email' | 'phone' | 'complete';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
}

const QUESTIONS: Record<QuestionStep, { question: string; icon: any }> = {
  greeting: { question: "Hi! I'm your ZeroBroker Assistant. I can help you find your dream property, check brokerage-free listings, or even list your own place. What's on your mind today?", icon: MessageSquare },
  property_type: { question: "What type of property are you looking for? (e.g., Apartment, House, Villa, PG, Commercial)", icon: Building2 },
  location: { question: "Which location or city are you interested in?", icon: MapPin },
  intent: { question: "Are you looking to Rent, Sell or Buy?", icon: ShoppingBag },
  full_name: { question: "What's your full name?", icon: User },
  email: { question: "What's your email address?", icon: Mail },
  phone: { question: "And finally, what's your phone number?", icon: Phone },
  complete: { question: "Perfect! I've noted down your preferences. Our neighborhood experts will curate the best zero-brokerage options for you and reach out shortly.", icon: CheckCircle2 },
};

const PROPERTY_TYPES = ['apartment', 'house', 'villa', 'pg', 'hostel', 'commercial', 'plot', 'flat', 'bungalow'];
const INTENTS = ['rent', 'buy', 'sell', 'lease'];

export default function Chat() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<QuestionStep>('greeting');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', type: 'bot', content: QUESTIONS.greeting.question }
  ]);
  const [input, setInput] = useState('');
  const [formData, setFormData] = useState<Partial<Record<QuestionStep, string>>>({
    full_name: user?.profile.name,
    email: user?.profile.email,
    phone: user?.profile.mobile
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const extractInfo = (text: string) => {
    const lower = text.toLowerCase();
    const extracted: Partial<Record<QuestionStep, string>> = {};

    // Intent
    if (lower.includes('rent') || lower.includes('lease')) extracted.intent = 'Rent';
    if (lower.includes('buy') || lower.includes('purchase')) extracted.intent = 'Buy';
    if (lower.includes('sell')) extracted.intent = 'Sell';

    // Property Type
    PROPERTY_TYPES.forEach(type => {
      if (lower.includes(type)) extracted.property_type = type.charAt(0).toUpperCase() + type.slice(1);
    });

    // Location (Basic extraction for common cities)
    const cities = ['mumbai', 'bangalore', 'delhi', 'pune', 'hyderabad', 'chennai', 'kolkata', 'gurgaon', 'noida'];
    cities.forEach(city => {
      if (lower.includes(city)) extracted.location = city.charAt(0).toUpperCase() + city.slice(1);
    });

    return extracted;
  };

  const validate = (val: string, step: QuestionStep) => {
    if (!val.trim()) return "Please provide some details.";
    
    // Generic gossip handler
    const gossip = ['hi', 'hello', 'hey', 'who are you', 'test', 'good morning', 'good evening'];
    if (gossip.includes(val.toLowerCase().trim()) && step !== 'full_name') {
      return "I'd love to chat, but first let's get some basic details so I can help you better!";
    }

    if (step === 'email') {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(val)) return "That doesn't look like a valid email. Could you double-check?";
    }
    if (step === 'phone') {
      const phoneRe = /^\d{10}$/;
      if (!phoneRe.test(val.replace(/\D/g, ''))) return "Please enter a valid 10-digit phone number.";
    }
    if (step === 'intent') {
      const valid = INTENTS.some(i => val.toLowerCase().includes(i));
      if (!valid) return "Please specify if you're looking to Rent, Buy, or Sell.";
    }
    return null;
  };

  const getNextStep = (currentData: Partial<Record<QuestionStep, string>>): QuestionStep => {
    if (!currentData.intent) return 'intent';
    if (!currentData.property_type) return 'property_type';
    if (!currentData.location) return 'location';
    if (!currentData.full_name) return 'full_name';
    if (!currentData.email) return 'email';
    if (!currentData.phone) return 'phone';
    return 'complete';
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isSubmitting || currentStep === 'complete') return;

    const userInput = input.trim();
    const newUserMsg: Message = { id: Date.now().toString(), type: 'user', content: userInput };
    setMessages(prev => [...prev, newUserMsg]);
    setInput('');

    // Handle initial greeting or gossip
    if (currentStep === 'greeting') {
      const extracted = extractInfo(userInput);
      const newFormData = { ...formData, ...extracted };
      setFormData(newFormData);

      const next = getNextStep(newFormData);
      setTimeout(() => {
        if (Object.keys(extracted).length > 0) {
          setMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            type: 'bot', 
            content: `Understood! You're looking for a ${extracted.property_type || ''} to ${extracted.intent || ''} ${extracted.location ? 'in ' + extracted.location : ''}.` 
          }]);
        }
        
        if (next === 'complete') {
          saveLead(newFormData);
        } else {
          setMessages(prev => [...prev, { id: Date.now().toString(), type: 'bot', content: QUESTIONS[next].question }]);
          setCurrentStep(next);
        }
      }, 800);
      return;
    }

    // Standard Step Validation
    const error = validate(userInput, currentStep);
    if (error) {
      setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now().toString(), type: 'bot', content: error }]);
      }, 500);
      return;
    }

    // Step Processing
    const updatedFormData = { ...formData, [currentStep]: userInput };
    // Also try to extract extra info from the message if current step isn't name/email/phone
    if (!['full_name', 'email', 'phone'].includes(currentStep)) {
      const extra = extractInfo(userInput);
      Object.assign(updatedFormData, extra);
    }
    
    setFormData(updatedFormData);

    const next = getNextStep(updatedFormData);
    if (next === 'complete') {
      saveLead(updatedFormData);
    } else {
      setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now().toString(), type: 'bot', content: QUESTIONS[next].question }]);
        setCurrentStep(next);
      }, 600);
    }
  };

  const saveLead = async (data: Partial<Record<QuestionStep, string>>) => {
    setIsSubmitting(true);
    try {
      const { error: dbError } = await supabase.from('user_leads').insert({
        property_type: data.property_type,
        location: data.location,
        transaction_intent: data.intent,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        user_id: user?.profile.id
      });

      if (dbError) throw dbError;

      setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now().toString(), type: 'bot', content: QUESTIONS.complete.question }]);
        setCurrentStep('complete');
        setIsSubmitting(false);
      }, 1000);
    } catch (err) {
      logError(err as Error, { action: 'chat.saveLead' });
      setMessages(prev => [...prev, { id: Date.now().toString(), type: 'bot', content: "I've saved your interest, but I hit a minor snag with our servers. Don't worry, our team will still see your request!" }]);
      setCurrentStep('complete');
      setIsSubmitting(false);
    }
  };

  const CurrentIcon = QUESTIONS[currentStep]?.icon || MessageSquare;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans antialiased">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-4 sm:py-8 flex flex-col items-center justify-center max-w-2xl relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-1/4 -left-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="absolute bottom-1/4 -right-12 w-64 h-64 bg-accent/5 rounded-full blur-3xl -z-10 animate-pulse [animation-delay:2s]" />

        <div className="w-full bg-card/70 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[75vh] sm:h-[80vh] relative transition-all duration-500">
          <div className="p-4 sm:p-6 border-b border-white/5 bg-gradient-to-r from-primary/10 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/20 flex items-center justify-center shadow-inner">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-card animate-pulse" />
              </div>
              <div>
                <h2 className="font-black text-sm sm:text-base text-foreground tracking-tight">ZeroBroker AI</h2>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-wider opacity-60">
                  Intelligent Assistant
                </p>
              </div>
            </div>
            <div className="flex gap-2">
               <div className="w-2 h-2 rounded-full bg-primary/20" />
               <div className="w-2 h-2 rounded-full bg-primary/40" />
               <div className="w-2 h-2 rounded-full bg-primary/60" />
            </div>
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 scroll-smooth no-scrollbar"
          >
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cn(
                    'flex items-end gap-3',
                    msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg',
                    msg.type === 'user' ? 'bg-primary' : 'bg-secondary/80'
                  )}>
                    {msg.type === 'user' ? (
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                    ) : (
                      <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-secondary-foreground" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-all shadow-sm',
                      msg.type === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-secondary/50 text-secondary-foreground rounded-bl-none border border-white/5'
                    )}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isSubmitting && (
              <div className="flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-widest ml-12 sm:ml-14 animate-pulse">
                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-primary" />
                Securing your info...
              </div>
            )}
          </div>

          <div className="p-4 sm:p-8 border-t border-white/5 bg-background/30 backdrop-blur-md pb-24 sm:pb-8">
            {currentStep === 'complete' ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-4 py-4 text-center"
              >
                <div className="w-16 h-16 rounded-3xl bg-green-500/10 flex items-center justify-center shadow-lg shadow-green-500/10">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-xl tracking-tight">Mission Accomplished!</h3>
                  <p className="text-sm text-muted-foreground font-medium">Sit back while we find your dream home.</p>
                </div>
                <Button 
                  size="lg"
                  onClick={() => window.location.href = '/'}
                  className="rounded-2xl font-black uppercase text-xs tracking-widest h-14 px-8 shadow-xl shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all"
                >
                  Return to Base
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={handleSend} className="flex gap-3 relative group">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-4 sm:left-5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-all duration-300">
                    <CurrentIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      currentStep === 'greeting' ? 'Tell me what you are looking for...' :
                      currentStep === 'intent' ? 'Type "Sell", "Buy" or "Rent"...' : 
                      'Type clearly here...'
                    }
                    className="h-12 sm:h-16 pl-12 sm:pl-14 pr-4 bg-background/50 border-white/10 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all rounded-2xl text-sm sm:text-base font-medium"
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!input.trim() || isSubmitting}
                  className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 active:scale-90 transition-all shrink-0 bg-primary hover:bg-primary/90"
                >
                  <Send className="w-5 h-5 sm:w-6 sm:h-6" />
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
