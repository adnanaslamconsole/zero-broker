import { FormEvent, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Mail, Clock, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function Login() {
  const { loginWithOtp, verifyOtp, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'tenant' | 'owner'>('tenant');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [timer, setTimer] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    const identifier = loginMethod === 'email' ? email.trim().toLowerCase() : phone.trim();
    if (!identifier) return;

    await loginWithOtp(identifier, loginMethod, undefined, role);
    setStep('otp');
    setTimer(60); // Start 60s cooldown
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;
    const identifier = loginMethod === 'email' ? email.trim().toLowerCase() : phone.trim();
    await loginWithOtp(identifier, loginMethod, undefined, role);
    setTimer(60);
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    const identifier = loginMethod === 'email' ? email.trim().toLowerCase() : phone.trim();
    if (!identifier || !otp) return;
    
    try {
      await verifyOtp(identifier, otp, loginMethod);
      navigate('/profile');
    } catch (error) {
      // Error is handled in AuthContext toast
      setOtp(''); // Clear OTP on failure
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-20 flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-md">
          <div className="bg-card rounded-2xl border border-border shadow-xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-display font-bold text-foreground">
                {step === 'email' ? 'Join ZeroBroker' : 'Verify & Login'}
              </h1>
              <div className="flex flex-col items-center gap-1">
                <p className="text-muted-foreground text-sm">
                  {step === 'email' 
                    ? 'Sign up or login to continue' 
                    : `Enter the 6-digit code sent to ${loginMethod === 'email' ? email : phone}`
                  }
                </p>
                {step === 'otp' && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                    <Clock className="w-3 h-3" /> Valid for 15 minutes
                  </div>
                )}
              </div>
            </div>

            {step === 'email' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                {/* Login Method Toggle */}
                <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as 'email' | 'phone')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="email" className="gap-2"><Mail className="w-4 h-4" /> Email</TabsTrigger>
                    <TabsTrigger value="phone" className="gap-2"><Phone className="w-4 h-4" /> Phone</TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Role Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">I am a</label>
                  <Tabs value={role} onValueChange={(v) => setRole(v as 'tenant' | 'owner')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="tenant">Tenant / Buyer</TabsTrigger>
                      <TabsTrigger value="owner">Owner / Seller</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {loginMethod === 'email' ? 'Email Address' : 'Phone Number'}
                  </label>
                  {loginMethod === 'email' ? (
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 bg-secondary/30 border-border/50 focus:border-primary transition-all"
                    />
                  ) : (
                    <div className="flex gap-2">
                      <div className="h-12 w-16 bg-secondary/30 border border-border/50 rounded-md flex items-center justify-center text-sm font-medium text-muted-foreground">
                        +91
                      </div>
                      <Input
                        type="tel"
                        placeholder="98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        required
                        className="h-12 bg-secondary/30 border-border/50 focus:border-primary transition-all flex-1"
                      />
                    </div>
                  )}
                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full text-base font-semibold" 
                  disabled={
                    (loginMethod === 'email' && !email) || 
                    (loginMethod === 'phone' && phone.length !== 10) || 
                    isLoading
                  }
                >
                  {isLoading ? 'Sending...' : 'Continue'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="flex flex-col items-center justify-center space-y-4 py-4">
                  <div className="bg-secondary/20 p-4 rounded-2xl border border-border/50">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(value) => setOtp(value)}
                      disabled={isLoading}
                    >
                      <InputOTPGroup className="gap-2 sm:gap-3">
                        <InputOTPSlot index={0} className="w-10 h-12 sm:w-12 sm:h-14 text-xl sm:text-2xl font-bold rounded-xl border-2 focus:border-primary shadow-sm" />
                        <InputOTPSlot index={1} className="w-10 h-12 sm:w-12 sm:h-14 text-xl sm:text-2xl font-bold rounded-xl border-2 focus:border-primary shadow-sm" />
                        <InputOTPSlot index={2} className="w-10 h-12 sm:w-12 sm:h-14 text-xl sm:text-2xl font-bold rounded-xl border-2 focus:border-primary shadow-sm" />
                        <InputOTPSlot index={3} className="w-10 h-12 sm:w-12 sm:h-14 text-xl sm:text-2xl font-bold rounded-xl border-2 focus:border-primary shadow-sm" />
                        <InputOTPSlot index={4} className="w-10 h-12 sm:w-12 sm:h-14 text-xl sm:text-2xl font-bold rounded-xl border-2 focus:border-primary shadow-sm" />
                        <InputOTPSlot index={5} className="w-10 h-12 sm:w-12 sm:h-14 text-xl sm:text-2xl font-bold rounded-xl border-2 focus:border-primary shadow-sm" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-secondary/30 px-3 py-1.5 rounded-lg border border-border/50">
                    <ShieldCheck className="w-3 h-3 text-green-500" /> Secure cryptographically generated code
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20" disabled={otp.length !== 6 || isLoading}>
                  {isLoading ? 'Verifying Code...' : 'Verify & Sign In'}
                </Button>
                
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex items-center justify-between gap-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs h-9 px-3 font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setStep('email');
                        setOtp('');
                        setTimer(0);
                      }}
                      disabled={isLoading}
                    >
                      <ArrowLeft className="w-3 h-3 mr-1.5" /> Back to {loginMethod === 'email' ? 'email' : 'phone'}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs h-9 px-3 font-semibold text-primary hover:text-primary hover:bg-primary/5"
                      onClick={handleResendOtp}
                      disabled={timer > 0 || isLoading}
                    >
                      {timer > 0 ? (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" /> Resend in {timer}s
                        </span>
                      ) : (
                        'Resend OTP'
                      )}
                    </Button>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-xl border border-border/40 mt-2">
                    <AlertCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      If you don't see the email, please check your spam folder or try resending. The code is only valid for 15 minutes.
                    </p>
                  </div>
                </div>
              </form>
            )}
            
            <p className="text-xs text-muted-foreground text-center leading-relaxed px-4">
              By continuing, you agree to our{' '}
              <Link to="/terms" className="underline hover:text-foreground">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy-policy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
