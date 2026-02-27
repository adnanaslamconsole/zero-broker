import { FormEvent, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Mail, Clock } from 'lucide-react';

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
    const identifier = loginMethod === 'email' ? email : phone;
    if (!identifier) return;

    await loginWithOtp(identifier, loginMethod, undefined, role);
    setStep('otp');
    setTimer(60); // Start 60s cooldown
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;
    const identifier = loginMethod === 'email' ? email : phone;
    await loginWithOtp(identifier, loginMethod, undefined, role);
    setTimer(60);
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    const identifier = loginMethod === 'email' ? email : phone;
    if (!identifier || !otp) return;
    await verifyOtp(identifier, otp, loginMethod);
    navigate('/profile');
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
              <p className="text-muted-foreground text-sm">
                {step === 'email' 
                  ? 'Sign up or login to continue' 
                  : `Enter the OTP sent to ${loginMethod === 'email' ? email : phone}`
                }
              </p>
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
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Enter OTP</label>
                  <Input
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    className="h-12 text-center text-2xl tracking-widest bg-secondary/30 border-border/50 focus:border-primary transition-all font-mono"
                    maxLength={6}
                  />
                </div>
                <Button type="submit" size="lg" className="w-full text-base font-semibold" disabled={otp.length !== 6 || isLoading}>
                  {isLoading ? 'Verifying...' : 'Verify & Login'}
                </Button>
                
                <div className="flex flex-col gap-3 mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={handleResendOtp}
                    disabled={timer > 0 || isLoading}
                  >
                    {timer > 0 ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" /> Resend in {timer}s
                      </span>
                    ) : (
                      'Resend OTP'
                    )}
                  </Button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setOtp('');
                      setTimer(0);
                    }}
                    className="w-full text-sm font-medium text-primary hover:text-primary/80 transition-colors py-2"
                  >
                    Change {loginMethod === 'email' ? 'email' : 'number'}
                  </button>
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
