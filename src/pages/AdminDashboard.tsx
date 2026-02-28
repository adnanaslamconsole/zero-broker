import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { UserManagement } from '@/components/admin/UserManagement';
import { ListingModeration } from '@/components/admin/ListingModeration';
import { RevenueAnalytics } from '@/components/admin/RevenueAnalytics';
import { KycVerification } from '@/components/admin/KycVerification';
import { BlogManager } from '@/components/admin/BlogManager';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user is admin
  // In production, this should be a strict check against the database role.
  // For now, we assume 'platform-admin'.
  const isAdmin = user?.profile?.roles?.includes('platform-admin');

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
          <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You do not have permission to view this page.</p>
          <Button onClick={() => navigate('/')}>Return Home</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-1">Manage users, listings, and monitor platform performance.</p>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger value="verification">Verification KYC</TabsTrigger>
              <TabsTrigger value="listings">Listing Moderation</TabsTrigger>
              <TabsTrigger value="revenue">Revenue & Analytics</TabsTrigger>
              <TabsTrigger value="blog">Blog & Content</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <AdminOverview />
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <UserManagement />
            </TabsContent>

            <TabsContent value="verification" className="space-y-4">
              <KycVerification />
            </TabsContent>

            <TabsContent value="listings" className="space-y-4">
              <ListingModeration />
            </TabsContent>

            <TabsContent value="revenue" className="space-y-4">
              <RevenueAnalytics />
            </TabsContent>

            <TabsContent value="blog" className="space-y-4">
              <BlogManager />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
