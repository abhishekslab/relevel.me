
'use client'
import * as React from 'react'
export function Tabs({ defaultValue, children }: { defaultValue: string; children: React.ReactNode }) { return <div>{children}</div> }
export function TabsList({ className='', ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={`flex gap-2 ${className}`} {...props} /> }
export function TabsTrigger({ className='', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={`px-3 py-1 rounded-xl bg-white/10 text-sm ${className}`} {...props} /> }
export function TabsContent({ className='', ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={`mt-2 ${className}`} {...props} /> }
