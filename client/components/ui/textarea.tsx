import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-foreground shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-all duration-300 border border-white/5 placeholder:text-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60 focus-visible:border-primary/50 focus-visible:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 resize-y",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
