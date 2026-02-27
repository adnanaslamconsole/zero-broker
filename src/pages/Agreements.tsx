import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { listAgreements } from '@/lib/mockApi';
import { Button } from '@/components/ui/button';

export default function Agreements() {
  const { data } = useQuery({
    queryKey: ['agreements'],
    queryFn: listAgreements,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-display font-bold text-foreground">
              Rental agreements
            </h1>
            <Button>Create agreement</Button>
          </div>
          <div className="space-y-3">
            {data?.map((agreement) => (
              <div
                key={agreement.id}
                className="bg-card rounded-xl border border-border p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm text-foreground">
                    Agreement #{agreement.id} • {agreement.state}
                  </p>
                  <p className="text-xs text-muted-foreground">Status: {agreement.status}</p>
                </div>
                {agreement.pdfUrl && (
                  <a
                    href={agreement.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-accent underline"
                  >
                    Download
                  </a>
                )}
              </div>
            ))}
            {!data?.length && (
              <p className="text-sm text-muted-foreground">No agreements generated yet.</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

