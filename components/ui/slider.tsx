
'use client'
import * as React from 'react'
export function Slider({ value, onChange, min=0, max=100, step=1, className='' }:
  { value: number, onChange: (v:number)=>void, min?:number, max?:number, step?:number, className?:string }) {
  return (
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e)=>onChange(parseFloat(e.target.value))}
      className={`w-full accent-violet-400 ${className}`} />
  )
}
