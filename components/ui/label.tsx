"use client"

import * as React from "react"
import { Label as LabelPrimitive } from "radix-ui"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { cn } from "@/lib/utils"

function Label({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & { required?: boolean }) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-destructive font-bold cursor-help -ml-1.5 select-none" aria-hidden="true">
              *
            </span>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-[10px] px-2 py-1">
            Обязательное поле
          </TooltipContent>
        </Tooltip>
      )}
    </LabelPrimitive.Root>
  )
}

export { Label }
