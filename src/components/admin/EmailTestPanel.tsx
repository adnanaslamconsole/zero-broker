import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { sendEmail } from '@/lib/emailService';

export function EmailTestPanel() {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('ZeroBroker Test Email');
  const [text, setText] = useState('This is a test email sent via Supabase Edge Function + Resend.');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const result = await sendEmail({ to, subject, text });
      toast.success('Test email sent', { description: result.id ? `Message ID: ${result.id}` : undefined });
    } catch (error) {
      toast.error((error as Error).message || 'Failed to send test email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Email</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email-to">Recipient</Label>
          <Input id="email-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email-subject">Subject</Label>
          <Input id="email-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email-text">Message</Label>
          <Textarea id="email-text" value={text} onChange={(e) => setText(e.target.value)} rows={6} />
        </div>
        <Button onClick={handleSend} disabled={isSending} className="min-h-[44px]">
          {isSending ? 'Sending…' : 'Send Test Email'}
        </Button>
      </CardContent>
    </Card>
  );
}

