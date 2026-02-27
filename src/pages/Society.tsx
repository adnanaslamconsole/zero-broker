import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { EnrollSociety, JoinSociety } from '@/components/society/Enrollment';
import { VisitorLog } from '@/components/society/VisitorLog';
import { NoticeBoard } from '@/components/society/NoticeBoard';
import { MaintenanceList } from '@/components/society/MaintenanceList';
import { ComplaintSystem } from '@/components/society/ComplaintSystem';
import { ShieldCheck, Building2, Users, Receipt, Bell, Key } from 'lucide-react';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function Society() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Fetch user's society membership
  const { data: membership, isLoading: membershipLoading, refetch } = useQuery({
    queryKey: ['society-membership', user?.profile?.id],
    queryFn: async () => {
      if (!user) return null;
      // Step 1: Fetch membership row only (no joins to avoid recursion risks if any)
      const { data: member, error } = await supabase
        .from('society_members')
        .select('*')
        .eq('user_id', user.profile.id)
        .single();
      
      // PGRST116 is "no rows found", which is fine - just means not enrolled
      if (error && error.code !== 'PGRST116') throw error;
      if (!member) return null;

      // Step 2: Fetch society details separately
      const { data: society, error: societyError } = await supabase
        .from('societies')
        .select('*')
        .eq('id', member.society_id)
        .single();

      if (societyError) throw societyError;

      // Combine them
      return { ...member, societies: society };
    },
    enabled: !!user,
  });

  if (authLoading || membershipLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Case 1: Not logged in or not enrolled -> Show Landing/Enrollment
  if (!membership) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main>
          {/* Hero Section */}
          <section className="py-20 bg-gradient-to-b from-primary/5 to-background text-center px-4">
            <Badge variant="outline" className="mb-4 bg-background/50 backdrop-blur border-primary/20 text-primary">
              <ShieldCheck className="w-3 h-3 mr-1" />
              ZeroBrokerHood
            </Badge>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-6">
              Smart Living for<br /><span className="text-primary">Modern Societies</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              Simplify society management with our all-in-one platform. 
              Visitor tracking, maintenance payments, complaints, and community engagement.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
              <EnrollSociety onSuccess={refetch} />
              <JoinSociety onSuccess={refetch} />
            </div>
          </section>

          {/* Features Grid */}
          <section className="py-20 container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Everything your society needs</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: Key, title: 'Visitor Management', desc: 'Pre-approve guests and track entry/exit logs digitally.' },
                { icon: Receipt, title: 'Maintenance Billing', desc: 'Automated invoicing and online payments with receipts.' },
                { icon: Bell, title: 'Digital Notice Board', desc: 'Instant announcements and alerts for all residents.' },
                { icon: Users, title: 'Community Connect', desc: 'Resident directory and polls for decision making.' },
                { icon: ShieldCheck, title: 'Security Gate App', desc: 'Dedicated interface for security guards.' },
                { icon: Building2, title: 'Facility Booking', desc: 'Book clubhouse, tennis court, and other amenities.' },
              ].map((f, i) => (
                <div key={i} className="p-6 bg-card rounded-xl border hover:shadow-lg transition-shadow">
                  <f.icon className="w-10 h-10 text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                  <p className="text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  // Case 2: Enrolled -> Show Dashboard
  const society = membership.societies;
  const isAdmin = membership.role === 'admin';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-8 bg-secondary/20 min-h-[calc(100vh-80px)]">
        <div className="container mx-auto px-4">
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-foreground">{society.name}</h1>
                <Badge variant={membership.status === 'approved' ? 'default' : 'secondary'}>
                  {membership.status}
                </Badge>
                {isAdmin && <Badge variant="outline" className="border-primary text-primary">Admin</Badge>}
              </div>
              <p className="text-muted-foreground">{society.locality}, {society.city} • Flat {membership.flat_no}</p>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline">Emergency</Button>
              <Button>Help Desk</Button>
            </div>
          </div>

          {membership.status === 'pending' ? (
             <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-center">
               Your membership request is pending approval from the society admin. 
               You will get full access once approved.
             </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Quick Actions & Main Feeds */}
              <div className="lg:col-span-2 space-y-8">
                <Tabs defaultValue="dashboard" className="w-full">
                  <TabsList className="w-full justify-start overflow-x-auto">
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="visitors">Visitors</TabsTrigger>
                    <TabsTrigger value="complaints">Complaints</TabsTrigger>
                    <TabsTrigger value="payments">Payments</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="dashboard" className="space-y-6 mt-6">
                     <div className="grid sm:grid-cols-2 gap-6">
                        <VisitorLog societyId={society.id} flatNo={membership.flat_no} />
                        <NoticeBoard societyId={society.id} isAdmin={isAdmin} />
                     </div>
                     {/* Add Polls or Events here later */}
                  </TabsContent>

                  <TabsContent value="visitors" className="mt-6">
                    <VisitorLog societyId={society.id} flatNo={membership.flat_no} />
                  </TabsContent>

                  <TabsContent value="payments" className="mt-6">
                    <MaintenanceList societyId={society.id} userId={user!.profile.id} />
                  </TabsContent>

                  <TabsContent value="complaints" className="mt-6">
                    <ComplaintSystem societyId={society.id} isAdmin={isAdmin} />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right Column: Sidebar */}
              <div className="space-y-6">
                <MaintenanceList societyId={society.id} userId={user!.profile.id} />
                
                <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    Security Alert
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Instantly notify security guards in case of emergency.
                  </p>
                  <Button variant="destructive" className="w-full">Trigger Alarm</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Badge({ children, variant = 'default', className }: { children: React.ReactNode, variant?: 'default' | 'secondary' | 'outline' | 'destructive', className?: string }) {
  const styles = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  };
  return (
    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${styles[variant]} ${className}`}>
      {children}
    </div>
  );
}
