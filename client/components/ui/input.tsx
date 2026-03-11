import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        className={cn(
          "flex h-12 w-full rounded-xl bg-white/5 px-4 py-2 text-sm text-foreground shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-all duration-300 border border-white/5 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60 focus-visible:border-primary/50 focus-visible:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
