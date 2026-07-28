"use client";

import { forwardRef } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface IconBtnProps extends React.ComponentProps<typeof Button> {
  tooltip: string;
}

export const IconBtn = forwardRef<HTMLButtonElement, IconBtnProps>(
  ({ tooltip, className, children, ...props }, ref) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button ref={ref} size="icon-xs" variant="ghost" className={cn(className)} {...props}>
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
);
IconBtn.displayName = "IconBtn";
