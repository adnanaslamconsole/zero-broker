import { FormEvent, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Clock, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const { loginWithOtp, verifyOtp, isLoading, user } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState<'tenant' | 'owner'>('tenant');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'method' | 'otp'>('method');
  const [timer, setTimer] = useState(0);
  const navigate = useNavigate();

  // Redirect if already logged in or if user state changes (e.g. logout)
  useEffect(() => {
    if (user) {
      navigate('/profile');
    } else {
      // Reset form if user is null (logged out)
      setIdentifier('');
      setOtp('');
      setStep('method');
      setError('');
    }
  }, [user, navigate]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const [error, setError] = useState<string>('');

  const validateIdentifier = (val: string) => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRe = /^\d{10}$/;
    
    if (!val) return "Email or Phone is required";
    if (!emailRe.test(val) && !phoneRe.test(val.replace(/\D/g, ''))) {
      return "Please enter a valid email or 10-digit phone number";
    }
    return "";
  };

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = validateIdentifier(identifier);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    const isEmail = identifier.includes('@');
    const type = isEmail ? 'email' : 'phone';
    const formattedIdentifier = isEmail ? identifier.trim().toLowerCase() : identifier.replace(/\D/g, '');

    await loginWithOtp(formattedIdentifier, type, undefined, role);
    setStep('otp');
    setTimer(60);
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;
    const isEmail = identifier.includes('@');
    const type = isEmail ? 'email' : 'phone';
    const formattedIdentifier = isEmail ? identifier.trim().toLowerCase() : identifier.replace(/\D/g, '');
    await loginWithOtp(formattedIdentifier, type, undefined, role);
    setTimer(60);
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!identifier || !otp) return;
    
    const isEmail = identifier.includes('@');
    const type = isEmail ? 'email' : 'phone';
    const formattedIdentifier = isEmail ? identifier.trim().toLowerCase() : identifier.replace(/\D/g, '');

    try {
      await verifyOtp(formattedIdentifier, otp, type);
      navigate('/profile');
    } catch (error) {
      setOtp('');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
        <div className="w-full max-w-[440px] space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-3xl border border-border/60 shadow-2xl shadow-primary/5 p-6 sm:p-10 backdrop-blur-sm"
          >
            <div className="text-center space-y-2 mb-8">
              <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">
                {step === 'method' ? 'Welcome Back' : 'Verify Identity'}
              </h1>
              <p className="text-muted-foreground text-sm">
                {step === 'method' 
                  ? 'Sign in with your mobile number or email' 
                  : `Enter the 8-digit code sent to ${identifier}`
                }
              </p>
            </div>

            <AnimatePresence mode="wait">
              {step === 'method' ? (
                <motion.div
                  key="login-form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <form onSubmit={handleSendOtp} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground/80 ml-1">I am a</label>
                      <Tabs value={role} onValueChange={(v) => setRole(v as any)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-secondary/30 rounded-xl">
                          <TabsTrigger value="tenant" className="rounded-lg text-xs">Tenant / Buyer</TabsTrigger>
                          <TabsTrigger value="owner" className="rounded-lg text-xs">Owner / Seller</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground/80 ml-1">
                        Mobile Number or Email
                      </label>
                      <div className="space-y-2">
                        <Input
                          type="text"
                          placeholder="type mobile number or email"
                          value={identifier}
                          onChange={(e) => {
                            setIdentifier(e.target.value);
                            if (error) setError("");
                          }}
                          required
                          className={cn(
                            "h-12 bg-secondary/20 border-border/40 focus:border-primary/50 transition-all rounded-xl",
                            error && "border-destructive/50 focus:border-destructive"
                          )}
                        />
                        {error && (
                          <motion.p 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs font-medium text-destructive ml-1"
                          >
                            {error}
                          </motion.p>
                        )}
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      size="lg" 
                      className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/10" 
                      disabled={!identifier || isLoading}
                    >
                      {isLoading ? 'Sending...' : 'Send OTP'}
                    </Button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="otp-verification"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col items-center justify-center space-y-6 py-4">
                    <div className="bg-secondary/20 p-4 sm:p-6 rounded-3xl border border-border/40 backdrop-blur-sm">
                      <InputOTP
                        maxLength={8}
                        value={otp}
                        onChange={(value) => setOtp(value)}
                        disabled={isLoading}
                      >
                        <InputOTPGroup className="gap-1.5 sm:gap-2">
                          {[...Array(8)].map((_, i) => (
                            <InputOTPSlot 
                              key={i}
                              index={i} 
                              className="w-8 h-12 sm:w-10 sm:h-14 text-lg sm:text-xl font-bold rounded-lg border-2 border-border/50 focus:border-primary bg-background shadow-sm transition-all" 
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      Secure 8-digit verification code
                    </div>
                  </div>

                  <Button 
                    onClick={handleVerifyOtp}
                    size="lg" 
                    className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98]" 
                    disabled={otp.length !== 8 || isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Clock className="w-5 h-5 animate-spin" /> Verifying...
                      </span>
                    ) : 'Verify OTP'}
                  </Button>
                  
                  <div className="text-center space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Didn't receive the code?{' '}
                      <button 
                        onClick={handleResendOtp}
                        disabled={timer > 0 || isLoading}
                        className={cn(
                          "font-bold text-primary hover:underline disabled:opacity-50 disabled:no-underline",
                          timer > 0 && "cursor-not-allowed"
                        )}
                      >
                        {timer > 0 ? `Resend in ${timer}s` : 'Resend OTP'}
                      </button>
                    </p>
                    
                    <button 
                      onClick={() => {
                        setStep('method');
                        setOtp('');
                        setError('');
                      }}
                      className="flex items-center gap-2 mx-auto text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Try a different number or email
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>


        </div>
      </main>
      <Footer />
    </div>
  );
}
