import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Settings, 
  Shield, 
  Zap, 
  AlertOctagon, 
  Globe, 
  Loader2,
  Lock,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { EmailTestPanel } from './EmailTestPanel';

export function SystemSettingsPanel() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await fetch('/api/admin/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const res = await fetch(`/api/admin/settings/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) throw new Error('Failed to update setting');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Setting updated successfully');
    },
  });

  const getSettingValue = (key: string, defaultValue: any) => {
    const setting = settings?.find((s: any) => s.key === key);
    return setting ? setting.value : defaultValue;
  };

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Platform Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertOctagon className="w-5 h-5 mr-2" />
            Platform Control
          </CardTitle>
          <CardDescription>Critical platform-wide switches</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">Disable all public traffic except for admins.</p>
            </div>
            <Switch 
              checked={getSettingValue('MAINTENANCE_MODE', false)}
              onCheckedChange={(checked) => updateMutation.mutate({ key: 'MAINTENANCE_MODE', value: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow New Signups</Label>
              <p className="text-sm text-muted-foreground">Temporarily disable new user registrations.</p>
            </div>
            <Switch 
              checked={getSettingValue('ALLOW_SIGNUPS', true)}
              onCheckedChange={(checked) => updateMutation.mutate({ key: 'ALLOW_SIGNUPS', value: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security & Auth */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lock className="w-5 h-5 mr-2" />
            Security & Auth
          </CardTitle>
          <CardDescription>Configure authentication behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enforce 2FA for Admins</Label>
              <p className="text-sm text-muted-foreground">Require two-factor auth for all administrative roles.</p>
            </div>
            <Switch 
              checked={getSettingValue('ENFORCE_ADMIN_2FA', false)}
              onCheckedChange={(checked) => updateMutation.mutate({ key: 'ENFORCE_ADMIN_2FA', value: checked })}
            />
          </div>
          <div className="space-y-2">
            <Label>OTP Expiry (seconds)</Label>
            <div className="flex gap-2">
              <Input 
                type="number" 
                defaultValue={getSettingValue('OTP_EXPIRY', 300)}
                className="max-w-[120px]"
                onBlur={(e) => updateMutation.mutate({ key: 'OTP_EXPIRY', value: parseInt(e.target.value) })}
              />
              <Button variant="secondary" size="sm">Update</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Infrastructure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-blue-600">
            <Zap className="w-5 h-5 mr-2" />
            API & Services
          </CardTitle>
          <CardDescription>Integrations and External APIs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Platform Commission (%)</Label>
            <Input 
              type="number" 
              defaultValue={getSettingValue('COMMISSION_PCT', 2)}
              className="max-w-[120px]"
              onBlur={(e) => updateMutation.mutate({ key: 'COMMISSION_PCT', value: parseFloat(e.target.value) })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Live Notifications</Label>
              <p className="text-sm text-muted-foreground">Toggle WebSocket-based real-time alerts.</p>
            </div>
            <Switch 
              checked={getSettingValue('ENABLE_NOTIFICATIONS', true)}
              onCheckedChange={(checked) => updateMutation.mutate({ key: 'ENABLE_NOTIFICATIONS', value: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Experimental / Flags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-purple-600">
            <Shield className="w-5 h-5 mr-2" />
            Feature Flags
          </CardTitle>
          <CardDescription>Control feature rollout (A/B testing)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>AI Search Beta</Label>
              <p className="text-sm text-muted-foreground">Enable experimental AI-powered property search.</p>
            </div>
            <Switch 
              checked={getSettingValue('FLAG_AI_SEARCH', false)}
              onCheckedChange={(checked) => updateMutation.mutate({ key: 'FLAG_AI_SEARCH', value: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Direct Owner Chat</Label>
              <p className="text-sm text-muted-foreground">Allow tenants to chat with owners directly.</p>
            </div>
            <Switch 
              checked={getSettingValue('FLAG_DIRECT_CHAT', true)}
              onCheckedChange={(checked) => updateMutation.mutate({ key: 'FLAG_DIRECT_CHAT', value: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Testing */}
      <div className="md:col-span-2">
        <EmailTestPanel />
      </div>
    </div>
  );
}
