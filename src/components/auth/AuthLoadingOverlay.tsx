import { useAuth } from '@/context/AuthContext';

export function AuthLoadingOverlay() {
  const { isLoggingOut, user } = useAuth();

  if (!isLoggingOut || !user) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/60 backdrop-blur-sm pointer-events-auto">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-card border border-border rounded-2xl px-6 py-5 shadow-xl min-w-[260px]">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            <div className="text-sm font-semibold">Signing out…</div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">Please wait while we secure your session.</div>
        </div>
      </div>
    </div>
  );
}
