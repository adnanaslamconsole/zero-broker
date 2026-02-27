import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { listRentSchedule } from '@/lib/mockApi';
import { Button } from '@/components/ui/button';

export default function Payments() {
  const { data } = useQuery({
    queryKey: ['rent-schedule'],
    queryFn: listRentSchedule,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-10">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-display font-bold text-foreground mb-4">Rent payments</h1>
          <div className="space-y-3">
            {data?.map((item) => (
              <div
                key={item.id}
                className="bg-card rounded-xl border border-border p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm text-foreground">
                    Due on {item.dueDate} • ₹{item.amount}
                  </p>
                  <p className="text-xs text-muted-foreground">Status: {item.status}</p>
                </div>
                {item.status === 'due' && <Button size="sm">Pay now</Button>}
              </div>
            ))}
            {!data?.length && (
              <p className="text-sm text-muted-foreground">No upcoming rent payments.</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

