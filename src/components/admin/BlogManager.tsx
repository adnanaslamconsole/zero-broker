import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Edit3, CheckCircle2 } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  cover_image_url: string | null;
  status: string;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
}

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function BlogManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');

  const { data: posts, isLoading } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const slug = generateSlug(title);
      const now = new Date().toISOString();
      const isPublish = statusFilter === 'published';
      const { error } = await supabase.from('blog_posts').insert({
        title,
        slug,
        category: category || null,
        cover_image_url: coverImageUrl || null,
        excerpt: excerpt || null,
        content,
        status: isPublish ? 'published' : 'draft',
        author_id: user.profile.id,
        author_name: user.profile.name,
        published_at: isPublish ? now : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Blog post created');
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      setIsDialogOpen(false);
      setTitle('');
      setCategory('');
      setCoverImageUrl('');
      setExcerpt('');
      setContent('');
    },
    onError: () => {
      toast.error('Failed to create blog post');
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async (post: BlogPost) => {
      const nextStatus = post.status === 'published' ? 'draft' : 'published';
      const { error } = await supabase
        .from('blog_posts')
        .update({
          status: nextStatus,
          published_at: nextStatus === 'published' ? new Date().toISOString() : null,
        })
        .eq('id', post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      toast.success('Post status updated');
    },
    onError: () => {
      toast.error('Failed to update post status');
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      toast.success('Post deleted');
    },
    onError: () => {
      toast.error('Failed to delete post');
    },
  });

  const filteredPosts =
    posts?.filter((post) => (statusFilter === 'all' ? true : post.status === statusFilter)) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold">Blog Management</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage blog articles visible on the public Blog page.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1">
            <button
              className={`text-xs px-2 py-1 rounded-full ${statusFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              className={`text-xs px-2 py-1 rounded-full ${statusFilter === 'draft' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              onClick={() => setStatusFilter('draft')}
            >
              Drafts
            </button>
            <button
              className={`text-xs px-2 py-1 rounded-full ${statusFilter === 'published' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              onClick={() => setStatusFilter('published')}
            >
              Published
            </button>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Blog Post</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Example: 10 Tips for First-Time Home Buyers"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Buying Guide, Legal, Market Trends..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cover Image URL</label>
                    <Input
                      value={coverImageUrl}
                      onChange={(e) => setCoverImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Short Excerpt</label>
                  <Textarea
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="Short summary shown on the blog listing."
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Content</label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write the full article content..."
                    className="min-h-[180px]"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={createPostMutation.isPending || isPublishing}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsPublishing(false);
                      createPostMutation.mutate();
                    }}
                    disabled={!title || !content || createPostMutation.isPending}
                  >
                    {createPostMutation.isPending && !isPublishing && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Save as Draft
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setIsPublishing(true);
                      setStatusFilter('published');
                      createPostMutation.mutate();
                    }}
                    disabled={!title || !content || createPostMutation.isPending}
                    className="gap-2"
                  >
                    {createPostMutation.isPending && isPublishing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Publish
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Blog Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No blog posts found. Create your first article to see it here.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="max-w-xs">
                      <div className="font-medium truncate">{post.title}</div>
                      {post.excerpt && (
                        <div className="text-xs text-muted-foreground truncate">
                          {post.excerpt}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {post.category ? (
                        <Badge variant="outline">{post.category}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Uncategorized</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={post.status === 'published' ? 'default' : 'secondary'}
                        className={post.status === 'published' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                      >
                        {post.status === 'published' ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {post.author_name || 'Admin'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {post.published_at
                          ? new Date(post.published_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => togglePublishMutation.mutate(post)}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8"
                          onClick={() => deletePostMutation.mutate(post.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

