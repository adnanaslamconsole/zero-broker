import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { otpApi } from '@/services/api/otpApi';
import { toast } from 'sonner';
import { ShieldCheck, Phone, Loader2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CustomOTPVerification: React.FC = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [isLoading, setIsLoading] = useState(false);
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleSendOtp = async () => {
        if (!phoneNumber) {
            toast.error('Please enter a phone number');
            return;
        }

        setIsLoading(true);
        try {
            await otpApi.sendOtp(phoneNumber);
            setStep('otp');
            setTimer(60);
            toast.success('OTP sent successfully!');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (otp.length !== 8) {
            toast.error('Please enter a valid 8-digit OTP');
            return;
        }

        setIsLoading(true);
        try {
            const result = await otpApi.verifyOtp(phoneNumber, otp);
            if (result.verified) {
                toast.success('OTP Verified Successfully!');
                // Here you would typically proceed with auth or registration
            }
        } catch (error: any) {
            toast.error(error.message);
            setOtp('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-8 sm:p-10 bg-white/80 backdrop-blur-2xl rounded-[2.5rem] border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden relative group">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-700" />
            
            <AnimatePresence mode="wait">
                {step === 'phone' ? (
                    <motion.div
                        key="phone-step"
                        initial={{ opacity: 0, scale: 0.98, x: -10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 1.02, x: 10 }}
                        className="space-y-8 relative z-10"
                    >
                        <div className="text-center space-y-3">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 mb-2 border border-slate-100 shadow-sm">
                                <Phone className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Verify Identity</h2>
                            <p className="text-slate-500 text-sm leading-relaxed px-4">Enter your mobile number to receive a secure access code.</p>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">Mobile Number</label>
                            <div className="relative group/input">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/input:text-primary transition-colors" />
                                <Input
                                    type="tel"
                                    placeholder="+91 00000 00000"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="pl-11 h-14 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-primary/40 focus:ring-primary/5 rounded-2xl transition-all duration-300 shadow-sm"
                                />
                            </div>
                        </div>

                        <Button
                            className="w-full h-14 rounded-2xl font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 transition-all duration-300 active:scale-[0.98]"
                            onClick={handleSendOtp}
                            disabled={isLoading || !phoneNumber}
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2 opacity-50" /> : null}
                            Send Secure Code
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="otp-step"
                        initial={{ opacity: 0, scale: 0.98, x: 10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 1.02, x: -10 }}
                        className="space-y-8 relative z-10"
                    >
                        <div className="text-center space-y-3">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-50 text-primary mb-2 border border-orange-100 shadow-sm">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Verification</h2>
                            <p className="text-slate-500 text-sm leading-relaxed px-4">We've sent an 8-digit code to <span className="text-slate-900 font-bold">{phoneNumber}</span></p>
                        </div>

                        <div className="flex flex-col items-center py-2 space-y-6">
                            <div className="bg-slate-50 p-4 sm:p-5 rounded-[2rem] border border-slate-100 shadow-inner">
                                <InputOTP
                                    maxLength={8}
                                    value={otp}
                                    onChange={setOtp}
                                    disabled={isLoading}
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
                            
                            <p className="text-[11px] text-slate-400 font-medium">Detecting code automatically...</p>
                        </div>

                        <Button
                            className="w-full h-16 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/20 transition-all duration-300 active:scale-[0.98]"
                            onClick={handleVerifyOtp}
                            disabled={isLoading || otp.length !== 8}
                        >
                            {isLoading ? <Loader2 className="w-6 h-6 animate-spin mr-2 opacity-50" /> : 'Confirm & Access'}
                        </Button>

                        <div className="text-center space-y-6">
                            <div className="flex items-center justify-center gap-2 text-sm">
                                <span className="text-slate-400 font-medium">Request again in</span>
                                <span className="font-mono font-bold text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded-md min-w-[32px] text-center border border-slate-200/50">
                                    {timer.toString().padStart(2, '0')}s
                                </span>
                            </div>

                            <div className="h-px bg-slate-100 w-full" />

                            <div className="flex items-center justify-between px-2">
                                <button
                                    onClick={() => setStep('phone')}
                                    className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-wider"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Change Info
                                </button>
                                
                                <button
                                    onClick={handleSendOtp}
                                    disabled={timer > 0 || isLoading}
                                    className="text-xs font-bold text-primary hover:text-primary/80 disabled:opacity-30 transition-colors uppercase tracking-wider"
                                >
                                    {timer > 0 ? 'Wait a moment' : 'Resend Code'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
