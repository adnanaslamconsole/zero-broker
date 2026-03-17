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
        <div className="max-w-md mx-auto p-8 bg-card rounded-3xl border border-border/60 shadow-xl">
            <AnimatePresence mode="wait">
                {step === 'phone' ? (
                    <motion.div
                        key="phone-step"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                    >
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold">Phone Verification</h2>
                            <p className="text-muted-foreground text-sm">Enter your phone number to receive a verification code.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold ml-1">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="tel"
                                    placeholder="+1 (555) 000-0000"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="pl-10 h-12 rounded-xl"
                                />
                            </div>
                        </div>

                        <Button
                            className="w-full h-12 rounded-xl font-bold"
                            onClick={handleSendOtp}
                            disabled={isLoading || !phoneNumber}
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Send OTP
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="otp-step"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold">Verify Code</h2>
                            <p className="text-muted-foreground text-sm">We've sent an 8-digit code to {phoneNumber}</p>
                        </div>

                        <div className="flex justify-center py-4">
                            <InputOTP
                                maxLength={8}
                                value={otp}
                                onChange={setOtp}
                                disabled={isLoading}
                            >
                                <InputOTPGroup className="gap-2">
                                    {[...Array(8)].map((_, i) => (
                                        <InputOTPSlot
                                            key={i}
                                            index={i}
                                            className="w-10 h-12 text-xl font-bold rounded-lg border-2"
                                        />
                                    ))}
                                </InputOTPGroup>
                            </InputOTP>
                        </div>

                        <Button
                            className="w-full h-12 rounded-xl font-bold"
                            onClick={handleVerifyOtp}
                            disabled={isLoading || otp.length !== 8}
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Verify OTP
                        </Button>

                        <div className="text-center space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Didn't receive the code?{' '}
                                <button
                                    onClick={handleSendOtp}
                                    disabled={timer > 0 || isLoading}
                                    className="font-bold text-primary hover:underline disabled:opacity-50"
                                >
                                    {timer > 0 ? `Resend in ${timer}s` : 'Resend OTP'}
                                </button>
                            </p>

                            <button
                                onClick={() => setStep('phone')}
                                className="flex items-center gap-2 mx-auto text-sm font-semibold text-muted-foreground hover:text-foreground"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Change Phone Number
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
