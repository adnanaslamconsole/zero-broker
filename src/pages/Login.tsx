import { FormEvent, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { Phone, Clock, ShieldCheck, ArrowLeft, Mail, Smartphone, ArrowRight, User, Briefcase, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { assertEmailNotDisposable } from '@/lib/disposableEmailGuard';

const AnimatedBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden bg-[#020617]">
    {/* Primary Ambient Glow */}
    <div className="absolute top-0 -left-[10%] w-[70%] h-[70%] rounded-full bg-primary/10 blur-[120px] animate-pulse-glow" />
    <div className="absolute bottom-0 -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse-glow" style={{ animationDelay: '1s' }} />
    
    {/* Floating Orbs */}
    <motion.div
      animate={{
        x: [0, 100, 0],
        y: [0, -50, 0],
        scale: [1, 1.2, 1],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: "linear",
      }}
      className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/20 blur-[80px]"
    />
    <motion.div
      animate={{
        x: [0, -80, 0],
        y: [0, 100, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 25,
        repeat: Infinity,
        ease: "linear",
      }}
      className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-600/10 blur-[100px]"
    />
    
    {/* Subtle Grid Pattern */}
    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0di00aC0ydjRoLTR2Mmg0djRoMnYtNGg0di0yaC00em0wLTMwVjBoLTJ2NGgtNHYyaDR2NGgyVjZoNHY0aC00ek02IDM0di00SDR2NGgtNHYyaDR2NGgydi00aDR2LTJINnpNNiA0VjBINFY0aC00djJoNHY0aDJWNmg0VjRINnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20" />
  </div>
);

export default function Login() {
  const { loginWithOtp, verifyOtp, user } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState<'tenant' | 'owner'>('tenant');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'method' | 'otp'>('method');
  const [timer, setTimer] = useState(0);
  const navigate = useNavigate();
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (user) {
      navigate('/profile');
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
    const formattedIdentifier = isEmail ? identifier.trim().toLowerCase() : identifier.replace(/[^\d+]/g, '');

    if (isEmail) {
      try {
        await assertEmailNotDisposable(formattedIdentifier);
      } catch (err) {
        setError((err as Error).message);
        return;
      }
    }

    setIsSendingOtp(true);
    try {
      await loginWithOtp(formattedIdentifier, type, undefined, role);
      setStep('otp');
      setTimer(60);
    } catch (err) {
      setError("Failed to send code. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;
    const isEmail = identifier.includes('@');
    const type = isEmail ? 'email' : 'phone';
    const formattedIdentifier = isEmail ? identifier.trim().toLowerCase() : identifier.replace(/\D/g, '');
    
    setIsResendingOtp(true);
    try {
      await loginWithOtp(formattedIdentifier, type, undefined, role);
      setTimer(60);
    } finally {
      setIsResendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!identifier || !otp) return;
    
    const isEmail = identifier.includes('@');
    const type = isEmail ? 'email' : 'phone';
    const formattedIdentifier = isEmail ? identifier.trim().toLowerCase() : identifier.replace(/\D/g, '');

    try {
      setIsVerifyingOtp(true);
      await verifyOtp(formattedIdentifier, otp, type);
      navigate('/profile');
    } catch (error) {
      setOtp('');
      setError("Invalid OTP code");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col font-sans selection:bg-primary/30">
      <AnimatedBackground />
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 z-10">
        <div className="w-full max-w-[460px]">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="group relative"
          >
            {/* Glossy Card Container */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-[2.5rem] blur-xl group-hover:blur-2xl transition-all duration-500" />
            
            <div className="relative bg-[#020617]/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl p-8 sm:p-12">
              <div className="text-center space-y-3 mb-10">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 text-primary mb-4 shadow-glow"
                >
                  {step === 'method' ? <User className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
                </motion.div>
                
                <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
                  {step === 'method' ? 'Welcome Back' : 'Verification'}
                </h1>
                <p className="text-slate-400 text-sm leading-relaxed max-w-[280px] mx-auto">
                  {step === 'method' 
                    ? 'Simplify your property journey with ZeroBroker' 
                    : `We've sent an 8-digit code to your ${identifier.includes('@') ? 'email' : 'phone'}`
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
                    className="space-y-8"
                  >
                    <div className="space-y-4">
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">I am a</label>
                      <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-900/60 rounded-2xl border border-white/5 relative">
                        {/* Sliding Indicator */}
                        <motion.div
                          layoutId="role-indicator"
                          className="absolute inset-y-1.5 bg-primary rounded-xl shadow-lg shadow-primary/20 z-0"
                          initial={false}
                          animate={{ 
                            left: role === 'tenant' ? '6px' : 'calc(50% + 1.5px)',
                            right: role === 'tenant' ? 'calc(50% + 1.5px)' : '6px'
                          }}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                        
                        <button
                          onClick={() => setRole('tenant')}
                          className={cn(
                            "relative z-10 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors duration-300",
                            role === 'tenant' ? "text-white" : "text-slate-400 hover:text-slate-200"
                          )}
                        >
                          <User className="w-4 h-4" /> Tenant
                        </button>
                        <button
                          onClick={() => setRole('owner')}
                          className={cn(
                            "relative z-10 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors duration-300",
                            role === 'owner' ? "text-white" : "text-slate-400 hover:text-slate-200"
                          )}
                        >
                          <Briefcase className="w-4 h-4" /> Owner
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleSendOtp} className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1 flex justify-between">
                          Identifier
                          <span className="text-[10px] font-normal lowercase opacity-60">phone or email</span>
                        </label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                            {identifier.includes('@') ? <Mail className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                          </div>
                          <Input
                            type="text"
                            placeholder="yourname@example.com"
                            value={identifier}
                            onChange={(e) => {
                              setIdentifier(e.target.value);
                              if (error) setError("");
                            }}
                            className={cn(
                              "h-14 pl-12 bg-slate-900/40 border-white/10 text-white placeholder:text-slate-600 focus:border-primary/50 focus:ring-primary/20 transition-all rounded-2xl",
                              error && "border-destructive/50"
                            )}
                          />
                        </div>
                        {error && (
                          <motion.p 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs font-medium text-destructive/90 flex items-center gap-1.5 ml-1"
                          >
                            <AlertCircle className="w-3.5 h-3.5" /> {error}
                          </motion.p>
                        )}
                      </div>

                      <Button 
                        type="submit" 
                        size="lg" 
                        className="group w-full h-14 text-lg font-bold rounded-2xl bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-[0.98]" 
                        disabled={!identifier || isSendingOtp}
                      >
                        {isSendingOtp ? (
                          <span className="flex items-center gap-2">
                            <Clock className="w-5 h-5 animate-spin" /> Starting...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Send Code <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                          </span>
                        )}
                      </Button>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="otp-verification"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <div className="flex flex-col items-center justify-center space-y-8 py-2">
                      <div className="bg-slate-900/60 p-5 rounded-3xl border border-white/10 shadow-inner">
                        <InputOTP
                          maxLength={8}
                          value={otp}
                          onChange={(value) => setOtp(value)}
                          disabled={isVerifyingOtp}
                        >
                          <InputOTPGroup className="gap-2">
                            {[...Array(8)].map((_, i) => (
                              <InputOTPSlot 
                                key={i}
                                index={i} 
                                className="w-9 h-14 sm:w-11 sm:h-16 text-xl sm:text-2xl font-bold rounded-xl border-white/10 bg-[#020617]/60 text-white focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-lg transition-all" 
                              />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      
                      <Badge variant="outline" className="px-4 py-1.5 rounded-full bg-primary/5 text-primary border-primary/20 animate-pulse-glow">
                        <span className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest">
                          <ShieldCheck className="w-3.5 h-3.5" /> Secure Session
                        </span>
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      <Button 
                        onClick={handleVerifyOtp}
                        size="lg" 
                        className="w-full h-16 text-xl font-bold rounded-2xl bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 transition-all active:scale-[0.98]" 
                        disabled={otp.length !== 8 || isVerifyingOtp}
                      >
                        {isVerifyingOtp ? (
                          <span className="flex items-center gap-2">
                            <Clock className="w-6 h-6 animate-spin" /> Authorizing...
                          </span>
                        ) : 'Verify & Continue'}
                      </Button>
                      
                      <div className="flex flex-col gap-5 pt-2">
                        <p className="text-sm text-center text-slate-400">
                          Resend security code in{' '}
                          <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded ml-1">
                            {timer.toString().padStart(2, '0')}s
                          </span>
                        </p>
                        
                        <div className="h-px bg-white/5 w-full" />
                        
                        <div className="flex flex-col gap-4">
                          <button 
                            onClick={handleResendOtp}
                            disabled={timer > 0 || isResendingOtp || isVerifyingOtp}
                            className="text-sm font-bold text-primary hover:text-primary/80 disabled:opacity-30 transition-colors uppercase tracking-widest"
                          >
                            {isResendingOtp ? 'Resending...' : 'Resend Code'}
                          </button>
                          
                          <button 
                            onClick={() => {
                              setStep('method');
                              setOtp('');
                              setError('');
                            }}
                            className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 hover:text-white transition-colors"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            Back to identification
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
