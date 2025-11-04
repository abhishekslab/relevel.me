
'use client'
import * as React from 'react'
export function Progress({ className = '', value = 0 }: { className?: string; value?: number }) {
  return (
    <div className={`w-full h-2 rounded-full bg-white/10 overflow-hidden ${className}`}>
      <div className="h-full bg-violet-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}
