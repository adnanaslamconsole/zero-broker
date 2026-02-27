import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Briefcase } from "lucide-react";

export default function Careers() {
  const openings = [
    {
      role: "Senior Frontend Engineer",
      department: "Engineering",
      location: "Bangalore, India",
      type: "Full-time",
      tags: ["React", "TypeScript", "Tailwind"]
    },
    {
      role: "Product Manager",
      department: "Product",
      location: "Remote",
      type: "Full-time",
      tags: ["Strategy", "UX", "Agile"]
    },
    {
      role: "Customer Success Executive",
      department: "Operations",
      location: "Mumbai, India",
      type: "Full-time",
      tags: ["Support", "Communication"]
    },
    {
      role: "Digital Marketing Specialist",
      department: "Marketing",
      location: "Bangalore, India",
      type: "Full-time",
      tags: ["SEO", "SEM", "Content"]
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-primary/5 py-20 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">Join Our Mission</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              We're looking for passionate individuals to help us revolutionize the real estate industry in India.
            </p>
            <Button size="lg">View Open Positions</Button>
          </div>
        </section>

        {/* Culture Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-display font-bold mb-4">Why Work With Us?</h2>
              <p className="text-muted-foreground">
                We believe in creating an environment where you can do your best work. We offer competitive compensation, flexible work hours, and a culture of continuous learning.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-20">
              {[
                { title: "Ownership", desc: "Take charge of your projects and make a real impact from day one." },
                { title: "Flexibility", desc: "Work from anywhere, anytime. We focus on output, not hours." },
                { title: "Growth", desc: "Dedicated budget for your learning and development." }
              ].map((perk, idx) => (
                <div key={idx} className="bg-card p-8 rounded-xl border border-border text-center hover:border-primary/50 transition-colors">
                  <h3 className="text-xl font-bold mb-3">{perk.title}</h3>
                  <p className="text-muted-foreground">{perk.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Open Positions */}
        <section className="py-20 bg-secondary/20">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-display font-bold mb-10">Open Positions</h2>
            <div className="space-y-4">
              {openings.map((job, idx) => (
                <div key={idx} className="bg-card p-6 rounded-xl border border-border hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">{job.role}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> {job.department}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {job.location}</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {job.type}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {job.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="font-normal">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline">Apply Now</Button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
