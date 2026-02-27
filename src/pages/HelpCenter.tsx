import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronRight, HelpCircle, MessageCircle, FileText, Phone } from "lucide-react";

export default function HelpCenter() {
  const faqs = [
    {
      question: "How do I list my property?",
      answer: "You can list your property for free by clicking on the 'Post Property' button in the top navigation bar. Fill in the details, upload photos, and your listing will be live instantly."
    },
    {
      question: "Is there a brokerage fee?",
      answer: "No, ZeroBroker is a zero-brokerage platform. We connect owners and tenants directly, eliminating the middleman and saving you money."
    },
    {
      question: "How do I verify my account?",
      answer: "To verify your account, go to your Profile settings and complete the KYC process by uploading your government-issued ID proof."
    },
    {
      question: "Can I schedule a property visit online?",
      answer: "Yes, you can request a visit directly from the property details page. The owner will receive your request and confirm a suitable time."
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-primary/5 py-16 md:py-24">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">How can we help you?</h1>
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                placeholder="Search for answers..." 
                className="h-14 pl-12 rounded-full bg-background shadow-lg border-transparent focus:border-primary text-lg"
              />
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: HelpCircle, label: "Getting Started" },
                { icon: MessageCircle, label: "Account & Login" },
                { icon: FileText, label: "Listing Property" },
                { icon: Phone, label: "Safety & Privacy" }
              ].map((item, idx) => (
                <div key={idx} className="bg-card p-6 rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer text-center group">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold">{item.label}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-16 bg-secondary/20">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-display font-bold mb-10 text-center">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="bg-card p-6 rounded-xl border border-border">
                  <h3 className="text-lg font-semibold mb-2 flex items-center justify-between">
                    {faq.question}
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </h3>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Button size="lg">View All FAQs</Button>
            </div>
          </div>
        </section>

        {/* Contact Support */}
        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-4">Still need help?</h2>
            <p className="text-muted-foreground mb-8">Our support team is available 24/7 to assist you.</p>
            <div className="flex justify-center gap-4">
              <Button variant="outline" size="lg">Chat with Us</Button>
              <Button size="lg">Email Support</Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
