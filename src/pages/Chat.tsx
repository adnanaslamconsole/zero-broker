import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Send, CheckCircle2, MessageSquare, Building2, MapPin, User, Mail, Phone, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

type QuestionStep = 'property_type' | 'location' | 'intent' | 'full_name' | 'email' | 'phone' | 'complete';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
}

const QUESTIONS: Record<QuestionStep, { question: string; icon: React.ElementType }> = {
  property_type: { question: "What type of property are you looking for? (e.g., Apartment, House, Villa, PG, Commercial)", icon: Building2 },
  location: { question: "Which location or city are you interested in?", icon: MapPin },
  intent: { question: "Are you looking to Rent, Sell or Buy?", icon: ShoppingBag },
  full_name: { question: "What's your full name?", icon: User },
  email: { question: "What's your email address?", icon: Mail },
  phone: { question: "And finally, what's your phone number?", icon: Phone },
  complete: { question: "Great! I've collected all your information. We'll get back to you soon.", icon: CheckCircle2 },
};

export default function Chat() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<QuestionStep>('property_type');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', type: 'bot', content: "Hi! I'm here to help you find your next property. Let's start with a few details." },
    { id: '2', type: 'bot', content: QUESTIONS.property_type.question }
  ]);
  const [input, setInput] = useState('');
  const [formData, setFormData] = useState<Partial<Record<QuestionStep, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const validate = (val: string, step: QuestionStep) => {
    if (!val.trim()) return "Please enter a value.";
    if (step === 'email') {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(val)) return "Please enter a valid email address.";
    }
    if (step === 'phone') {
      const phoneRe = /^\d{10}$/;
      if (!phoneRe.test(val.replace(/\D/g, ''))) return "Please enter a valid 10-digit phone number.";
    }
    return null;
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isSubmitting || currentStep === 'complete') return;

    const error = validate(input, currentStep);
    if (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), type: 'bot', content: error }]);
      return;
    }

    const newUserMsg: Message = { id: Date.now().toString(), type: 'user', content: input };
    setMessages(prev => [...prev, newUserMsg]);
    
    const updatedFormData = { ...formData, [currentStep]: input };
    setFormData(updatedFormData);
    setInput('');

    const steps: QuestionStep[] = ['property_type', 'location', 'intent', 'full_name', 'email', 'phone', 'complete'];
    const nextStepIndex = steps.indexOf(currentStep) + 1;
    const nextStep = steps[nextStepIndex];

    if (nextStep === 'complete') {
      setIsSubmitting(true);
      try {
        const { error: dbError } = await supabase.from('user_leads').insert({
          property_type: updatedFormData.property_type,
          location: updatedFormData.location,
          transaction_intent: updatedFormData.intent,
          full_name: updatedFormData.full_name,
          email: updatedFormData.email,
          phone: updatedFormData.phone,
          user_id: user?.id
        });

        if (dbError) throw dbError;

        setMessages(prev => [...prev, { id: Date.now().toString(), type: 'bot', content: QUESTIONS.complete.question }]);
        setCurrentStep('complete');
      } catch (err) {
        setMessages(prev => [...prev, { id: Date.now().toString(), type: 'bot', content: "Something went wrong. Please try again later." }]);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now().toString(), type: 'bot', content: QUESTIONS[nextStep].question }]);
        setCurrentStep(nextStep);
      }, 500);
    }
  };

const CurrentIcon = QUESTIONS[currentStep].icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-4 sm:py-6 flex flex-col items-center justify-center max-w-2xl">
        <div className="w-full bg-card rounded-2xl border border-border shadow-xl overflow-hidden flex flex-col h-[75vh] sm:h-[70vh]">
          <div className="p-3 sm:p-4 border-b border-border bg-primary/5 flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-foreground leading-tight">ZeroBroker Assistant</h2>
              <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 animate-pulse" />
                Online | Automated Assistant
              </p>
            </div>
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 scroll-smooth"
          >
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cn(
                    'flex items-start gap-2 sm:gap-3',
                    msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <div className={cn(
                    'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 mt-1',
                    msg.type === 'user' ? 'bg-primary' : 'bg-secondary'
                  )}>
                    {msg.type === 'user' ? (
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-foreground" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary-foreground" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm shadow-sm',
                      msg.type === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                        : 'bg-secondary text-secondary-foreground rounded-tl-none'
                    )}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isSubmitting && (
              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground italic ml-9 sm:ml-11">
                <div className="flex gap-1">
                  <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" />
                  <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
                Saving your information...
              </div>
            )}
          </div>

          <div className="p-3 sm:p-4 border-t border-border bg-background/50 backdrop-blur-sm pb-20 sm:pb-4">
            {currentStep === 'complete' ? (
              <div className="flex flex-col items-center gap-2 sm:gap-3 py-2 sm:py-4 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-1">
                  <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
                </div>
                <h3 className="font-bold text-base sm:text-lg">Thank you!</h3>
                <p className="text-xs sm:text-sm text-muted-foreground px-4">Your inquiry has been successfully submitted.</p>
                <Button 
                  className="mt-2"
                  size="sm"
                  onClick={() => window.location.href = '/'}
                >
                  Back to Homepage
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSend} className="flex gap-2">
                <div className="relative flex-1 group">
                  <div className="absolute inset-y-0 left-3 sm:left-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                    {CurrentIcon && (
                      <CurrentIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    )}
                  </div>
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={currentStep === 'intent' ? 'Type "Sell" or "Buy"' : 'Type your message...'}
                    className="h-10 sm:h-12 pl-10 sm:pl-11 bg-background border-border/60 focus:border-primary/50 transition-all rounded-xl text-sm"
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!input.trim() || isSubmitting}
                  className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl shadow-lg shadow-primary/20 shrink-0"
                >
                  <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
