import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

interface PropertySkeletonProps {
  variant?: 'grid' | 'list';
}

export function PropertySkeleton({ variant = 'grid' }: PropertySkeletonProps) {
  if (variant === 'list') {
    return (
      <div className="bg-background rounded-[2rem] border border-border/40 overflow-hidden h-full flex flex-col md:flex-row shadow-[0_15px_40px_-15px_rgba(0,0,0,0.05)]">
        {/* Image Skeleton */}
        <Skeleton className="w-full md:w-[380px] lg:w-[440px] h-[280px] md:h-auto shrink-0" />
        
        {/* Content Skeleton */}
        <div className="flex-1 p-8 md:p-10 lg:p-12 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Skeleton className="w-24 h-6 rounded-2xl" />
            </div>
            <div className="space-y-3">
              <Skeleton className="w-3/4 h-10 rounded-xl" />
              <Skeleton className="w-1/2 h-6 rounded-lg" />
            </div>
            {/* Features Row */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-2xl" />
                  <div className="space-y-1">
                    <Skeleton className="w-8 h-6" />
                    <Skeleton className="w-12 h-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Actions Row */}
          <div className="flex items-center gap-4 mt-8 pt-8 border-t border-border/40">
            <Skeleton className="flex-1 h-14 sm:h-16 rounded-[1.25rem]" />
            <Skeleton className="h-14 w-14 sm:h-16 sm:w-16 rounded-[1.25rem]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="rounded-2xl border border-border/50 overflow-hidden flex flex-col h-full shadow-sm">
      {/* Image Section */}
      <Skeleton className="h-48 sm:h-52 w-full" />
      
      {/* Content Section */}
      <CardContent className="p-4 sm:p-5 flex-1 flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="w-20 h-5 rounded-lg" />
          <Skeleton className="w-16 h-4 rounded-md" />
        </div>
        <div className="space-y-2">
          <Skeleton className="w-full h-7 rounded-lg" />
          <Skeleton className="w-2/3 h-5 rounded-md" />
        </div>
        {/* Features Row */}
        <div className="flex items-center gap-3 pt-2">
          <Skeleton className="w-12 h-5 rounded-md" />
          <Skeleton className="w-12 h-5 rounded-md" />
          <Skeleton className="w-12 h-5 rounded-md" />
        </div>
      </CardContent>
      
      <CardFooter className="p-4 sm:p-5 pt-0">
        <div className="grid grid-cols-4 gap-2 w-full">
          <Skeleton className="col-span-3 h-10 rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </CardFooter>
    </Card>
  );
}
