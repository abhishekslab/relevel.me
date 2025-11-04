'use client'

import * as React from 'react'
import { Check } from 'lucide-react'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', onCheckedChange, ...props }, ref) => {
    return (
      <div className="relative inline-flex">
        <input
          type="checkbox"
          className="peer sr-only"
          ref={ref}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          {...props}
        />
        <div className={`h-4 w-4 rounded border border-white/20 bg-white/5 peer-checked:bg-violet-600 peer-checked:border-violet-600 peer-focus:ring-2 peer-focus:ring-violet-500 transition flex items-center justify-center ${className}`}>
          <Check className="h-3 w-3 text-white opacity-0 peer-checked:opacity-100" />
        </div>
      </div>
    )
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
