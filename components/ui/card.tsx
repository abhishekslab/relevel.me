
'use client'
import * as React from 'react'
export function Card({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl border ${className}`} {...props} />
}
export function CardHeader({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-4 pt-4 ${className}`} {...props} />
}
export function CardTitle({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <h3 className={`text-sm font-semibold tracking-wide ${className}`} {...props} />
}
export function CardContent({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-4 pb-4 ${className}`} {...props} />
}
