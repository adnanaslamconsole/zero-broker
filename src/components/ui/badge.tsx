import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Verified badge - green trust indicator
        verified: "border-transparent bg-success text-success-foreground",
        // Premium badge - gold
        premium: "border-transparent bg-gradient-to-r from-premium to-warning text-premium-foreground",
        // New listing badge
        new: "border-transparent bg-accent text-accent-foreground",
        // Featured badge
        featured: "border-transparent bg-primary text-primary-foreground",
        // Zero brokerage badge
        zeroBrokerage: "border-transparent bg-success/10 text-success border-success/20",
        // Property type badges
        rent: "border-transparent bg-blue-100 text-blue-700",
        sale: "border-transparent bg-green-100 text-green-700",
        pg: "border-transparent bg-purple-100 text-purple-700",
        commercial: "border-transparent bg-orange-100 text-orange-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
