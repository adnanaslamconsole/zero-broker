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
  <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-50">
    {/* Soft Mesh Gradients */}
    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] animate-pulse-glow" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-orange-200/20 blur-[130px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
    <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-blue-100/30 blur-[100px] animate-pulse-glow" style={{ animationDelay: '3s' }} />
    
    {/* Drifting Shapes */}
    <motion.div
      animate={{
        x: [0, 60, 0],
        y: [0, -40, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 18,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="absolute top-1/4 left-1/3 w-72 h-72 rounded-full bg-orange-100/20 blur-[90px]"
    />
    
    {/* Subtle Premium Pattern */}
    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2YTUyZWMiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggZD0iTTM2IDM0di00aC0ydjRoLTR2Mmg0djRoMnYtNGg0di0yaC00em0wLTMwVjBoLTJ2NGgtNHYyaDR2NGgyVjZoNHY0aC00ek02IDM0di00SDR2NGgtNHYyaDR2NGgydi00aDR2LTJINnpNNiA0VjBINFY0aC00djJoNHY0aDJWNmg0VjRINnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-[0.4]" />
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
    <div className="min-h-screen relative flex flex-col font-sans selection:bg-orange-200">
      <AnimatedBackground />
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 z-10 transition-colors duration-1000">
        <div className="w-full max-w-[500px]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
            className="group relative"
          >
            {/* Soft Ambient Shadow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-400/10 via-primary/10 to-blue-400/10 rounded-[2.5rem] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
            
            <div className="relative bg-white/90 backdrop-blur-3xl border border-white/80 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] overflow-hidden p-8 sm:p-12">
              <div className="text-center space-y-4 mb-10">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/5 text-primary mb-2 shadow-sm border border-primary/10"
                >
                  {step === 'method' ? <User className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
                </motion.div>
                
                <div className="space-y-1">
                  <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-slate-900">
                    {step === 'method' ? 'Welcome Back' : 'Security Check'}
                  </h1>
                  <p className="text-slate-500 text-sm leading-relaxed max-w-[280px] mx-auto">
                    {step === 'method' 
                      ? 'Experience property management, simplified.' 
                      : `Enter the 8-digit code sent to your ${identifier.includes('@') ? 'email' : 'phone'}`
                    }
                  </p>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {step === 'method' ? (
                  <motion.div
                    key="login-form"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-8"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between ml-1 px-1">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Account Type</label>
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100/50 rounded-2xl border border-slate-200/50 relative">
                        {/* Slide Indicator */}
                        <motion.div
                          layoutId="role-indicator"
                          className="absolute inset-y-1.5 bg-white rounded-xl shadow-[0_4px_12px_-2px_rgba(0,0,0,0.12)] z-0"
                          initial={false}
                          animate={{ 
                            left: role === 'tenant' ? '6px' : 'calc(50% + 1px)',
                            right: role === 'tenant' ? 'calc(50% + 1px)' : '6px'
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 35 }}
                        />
                        
                        <button
                          onClick={() => setRole('tenant')}
                          className={cn(
                            "relative z-10 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-300",
                            role === 'tenant' ? "text-primary" : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          <User className="w-4 h-4" /> Tenant
                        </button>
                        <button
                          onClick={() => setRole('owner')}
                          className={cn(
                            "relative z-10 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-300",
                            role === 'owner' ? "text-primary" : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          <Briefcase className="w-4 h-4" /> Owner
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleSendOtp} className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between ml-1 px-1">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Contact Method</label>
                          <span className="text-[10px] text-slate-300 font-medium lowercase">phone or email</span>
                        </div>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors duration-300">
                            {identifier.includes('@') ? <Mail className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                          </div>
                          <Input
                            type="text"
                            placeholder="hello@zerobroker.com"
                            value={identifier}
                            onChange={(e) => {
                              setIdentifier(e.target.value);
                              if (error) setError("");
                            }}
                            className={cn(
                              "h-14 pl-12 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-primary/40 focus:ring-primary/5 transition-all duration-300 rounded-2xl shadow-sm",
                              error && "border-destructive/30 bg-destructive/[0.02]"
                            )}
                          />
                        </div>
                        {error && (
                          <motion.p 
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-[11px] font-semibold text-destructive flex items-center gap-1.5 ml-1"
                          >
                            <AlertCircle className="w-3 h-3" /> {error}
                          </motion.p>
                        )}
                      </div>

                      <Button 
                        type="submit" 
                        size="lg" 
                        className="group w-full h-14 text-base font-bold rounded-2xl bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 transition-all duration-300 active:scale-[0.98]" 
                        disabled={!identifier || isSendingOtp}
                      >
                        {isSendingOtp ? (
                          <span className="flex items-center gap-2">
                            <Clock className="w-5 h-5 animate-spin opacity-50" /> Sending OTP...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Request Access <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                          </span>
                        )}
                      </Button>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="otp-verification"
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.02, y: -10 }}
                    transition={{ duration: 0.5, ease: "circOut" }}
                    className="space-y-8"
                  >
                    <div className="flex flex-col items-center justify-center space-y-10 py-2">
                      <div className="bg-slate-50/80 p-6 rounded-[2rem] border border-slate-100 shadow-inner ring-1 ring-slate-100/50">
                        <InputOTP
                          maxLength={8}
                          value={otp}
                          onChange={(value) => setOtp(value)}
                          disabled={isVerifyingOtp}
                        >
                          <InputOTPGroup className="gap-2 sm:gap-2.5">
                            {[...Array(8)].map((_, i) => (
                              <InputOTPSlot 
                                key={i}
                                index={i} 
                                className="w-9 h-14 sm:w-10 sm:h-16 text-xl sm:text-2xl font-bold rounded-xl border-slate-200 bg-white text-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/5 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.05)] transition-all duration-300" 
                              />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      
                      <div className="flex flex-col items-center gap-4">
                        <Badge variant="outline" className="px-4 py-1.5 rounded-full bg-orange-50/50 text-orange-600 border-orange-100/50 font-bold tracking-tight">
                          <span className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                            <ShieldCheck className="w-3.5 h-3.5" /> End-to-end Encrypted
                          </span>
                        </Badge>
                        <p className="text-xs text-slate-400 font-medium">
                          Detecting OTP automatically...
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Button 
                        onClick={handleVerifyOtp}
                        size="lg" 
                        className="w-full h-16 text-lg font-bold rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/20 transition-all duration-300 active:scale-[0.98]" 
                        disabled={otp.length !== 8 || isVerifyingOtp}
                      >
                        {isVerifyingOtp ? (
                          <span className="flex items-center gap-2">
                            <Clock className="w-6 h-6 animate-spin opacity-50" /> Authorizing...
                          </span>
                        ) : 'Log In Now'}
                      </Button>
                      
                      <div className="flex flex-col gap-6 pt-2">
                        <div className="flex items-center justify-center gap-2 text-sm">
                           <span className="text-slate-400 font-medium">Reset in</span>
                           <span className="font-mono font-bold text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded-md min-w-[32px] text-center border border-slate-200/50">
                            {timer.toString().padStart(2, '0')}s
                           </span>
                        </div>
                        
                        <div className="h-px bg-slate-100 w-full" />
                        
                        <div className="flex items-center justify-between px-2">
                          <button 
                            onClick={() => {
                              setStep('method');
                              setOtp('');
                              setError('');
                            }}
                            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-wider"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" /> Edit Info
                          </button>

                          <button 
                            onClick={handleResendOtp}
                            disabled={timer > 0 || isResendingOtp || isVerifyingOtp}
                            className="text-xs font-bold text-primary hover:text-primary/80 disabled:opacity-30 transition-colors uppercase tracking-wider"
                          >
                            {isResendingOtp ? 'Sending...' : 'Need New Code?'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Trusted Footer Info */}
            <div className="mt-8 text-center sm:hidden">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">ZeroBroker Security Infrastructure</p>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
