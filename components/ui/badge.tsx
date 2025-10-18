
'use client'
import * as React from 'react'
export function Badge({ className = '', ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs ${className}`} {...props} />
}
