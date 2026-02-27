import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";

export default function Press() {
  const news = [
    {
      source: "TechCrunch",
      date: "Dec 2023",
      title: "ZeroBroker Raises Series A to Revolutionize Indian Real Estate",
      snippet: "The zero-brokerage platform aims to expand to 20 more cities by next year...",
      logo: "TC"
    },
    {
      source: "The Economic Times",
      date: "Nov 2023",
      title: "How PropTech Startups are Changing the Game",
      snippet: "ZeroBroker's innovative approach to direct owner-tenant connection is gaining traction...",
      logo: "ET"
    },
    {
      source: "YourStory",
      date: "Oct 2023",
      title: "Top 10 Startups to Watch in 2024",
      snippet: "ZeroBroker makes the list for its disruptive business model and rapid growth...",
      logo: "YS"
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Header */}
        <section className="bg-primary/5 py-20 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">Newsroom</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Latest news, updates, and media resources from ZeroBroker.
            </p>
          </div>
        </section>

        {/* Media Mentions */}
        <section className="py-20">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl font-bold mb-10">In the News</h2>
            <div className="space-y-6">
              {news.map((item, idx) => (
                <div key={idx} className="bg-card p-8 rounded-xl border border-border hover:border-primary/50 transition-colors flex flex-col md:flex-row gap-6 items-start md:items-center">
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center font-bold text-xl shrink-0">
                    {item.logo}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                      <span className="font-semibold text-foreground">{item.source}</span>
                      <span>•</span>
                      <span>{item.date}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 hover:text-primary cursor-pointer flex items-center gap-2 group">
                      {item.title} <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                    <p className="text-muted-foreground">{item.snippet}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Media Kit */}
        <section className="py-20 bg-secondary/20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-display font-bold mb-6">Media Kit</h2>
            <p className="text-muted-foreground mb-10 max-w-2xl mx-auto">
              Download our brand assets, including logos, screenshots, and executive headshots for media use.
            </p>
            <div className="flex justify-center gap-4">
              <Button size="lg" variant="outline" className="gap-2">
                <Download className="w-4 h-4" /> Download Brand Assets
              </Button>
              <Button size="lg" className="gap-2">
                Contact Press Team
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
