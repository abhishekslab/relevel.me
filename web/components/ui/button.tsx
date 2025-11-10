
'use client'
import * as React from 'react'
import { playClickSound } from '@/lib/sound'

export function Button({
  className = '',
  variant,
  size,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'secondary' | 'outline' | 'ghost'; size?: 'sm' | 'lg' | 'icon' }) {
  let base = 'inline-flex items-center justify-center rounded-xl px-3 py-2 transition focus:outline-none border border-white/10'
  let styles = 'bg-violet-600 hover:bg-violet-500'
  if (variant === 'secondary') styles = 'bg-white/10 hover:bg-white/20'
  if (variant === 'outline') styles = 'bg-transparent hover:bg-white/10'
  if (variant === 'ghost') styles = 'bg-transparent hover:bg-white/5 border-transparent'
  if (size === 'sm') base = base.replace('px-3 py-2', 'px-2 py-1 text-sm')
  if (size === 'lg') base = base.replace('px-3 py-2', 'px-4 py-3 text-lg')
  if (size === 'icon') base = base.replace('px-3 py-2', 'p-2')

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    playClickSound()
    onClick?.(e)
  }

  return <button className={`${base} ${styles} ${className}`} onClick={handleClick} {...props} />
}
