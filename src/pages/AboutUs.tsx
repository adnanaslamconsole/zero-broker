import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Users, Target, Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AboutUs() {
  const stats = [
    { value: "50k+", label: "Properties Listed" },
    { value: "100k+", label: "Happy Customers" },
    { value: "10+", label: "Cities Covered" },
    { value: "₹0", label: "Brokerage Paid" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-primary/5 py-20 lg:py-32 overflow-hidden relative">
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl font-display font-bold mb-6">
                Revolutionizing Real Estate with <span className="text-primary">Zero Brokerage</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-10">
                We're on a mission to eliminate brokerage from the real estate ecosystem and connect owners directly with genuine tenants and buyers.
              </p>
            </div>
          </div>
          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute right-0 top-0 w-1/3 h-1/3 bg-primary rounded-full blur-[100px]" />
            <div className="absolute left-0 bottom-0 w-1/3 h-1/3 bg-blue-400 rounded-full blur-[100px]" />
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 bg-card border-y border-border">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-4xl font-bold text-primary mb-2">{stat.value}</div>
                  <div className="text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-10">
              <div className="bg-card p-8 rounded-2xl border border-border shadow-sm">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-4">Our Mission</h3>
                <p className="text-muted-foreground">
                  To create a transparent, efficient, and brokerage-free real estate platform that empowers individuals to make better property decisions.
                </p>
              </div>
              <div className="bg-card p-8 rounded-2xl border border-border shadow-sm">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-6">
                  <Heart className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-4">Our Values</h3>
                <p className="text-muted-foreground">
                  Trust, Transparency, and Technology are the pillars of our foundation. We believe in putting our customers first in everything we do.
                </p>
              </div>
              <div className="bg-card p-8 rounded-2xl border border-border shadow-sm">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-4">Our Community</h3>
                <p className="text-muted-foreground">
                  We're building a community of verified owners and tenants who trust each other and believe in a fair real estate marketplace.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Join Us CTA */}
        <section className="py-20 bg-secondary/30">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-display font-bold mb-6">Ready to find your dream home?</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of happy users who have found their perfect home without paying any brokerage.
            </p>
            <Button size="lg" className="gap-2">
              Get Started Now <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
