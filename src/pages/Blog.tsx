import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  cover_image_url: string | null;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
}

export default function Blog() {
  const { data: posts, isLoading } = useQuery({
    queryKey: ["public-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Header */}
        <section className="bg-primary/5 py-20 text-center">
          <div className="container mx-auto px-4">
            <Badge className="mb-4">Our Blog</Badge>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">Real Estate Insights</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Expert advice, market trends, and tips to help you make smarter property decisions.
            </p>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : !posts || posts.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                No articles published yet. Check back soon for the latest insights from ZeroBroker.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map((post) => {
                  const dateSource = post.published_at || post.created_at;
                  const formattedDate = new Date(dateSource).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  return (
                    <article
                      key={post.id}
                      className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all group cursor-pointer"
                    >
                      {post.cover_image_url && (
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={post.cover_image_url}
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          {post.category && (
                            <span className="text-primary font-medium">{post.category}</span>
                          )}
                          {post.category && <span>•</span>}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {formattedDate}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="text-muted-foreground mb-4 line-clamp-3">{post.excerpt}</p>
                        )}
                        <div className="flex items-center justify-between pt-4 border-t border-border">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <User className="w-4 h-4" /> {post.author_name || "ZeroBroker Team"}
                          </div>
                          <ArrowRight className="w-4 h-4 text-primary -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
