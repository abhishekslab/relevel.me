'use client'

import { useState, useRef } from 'react'
import { Button } from './ui/button'
import { Upload, Loader2, X } from 'lucide-react'

interface FileUploadProps {
  accept: string
  maxSize: number
  onUploadComplete: (url: string) => void
  uploadEndpoint: string
  label: string
  currentPreview?: string | null
}

export function FileUpload({
  accept,
  maxSize,
  onUploadComplete,
  uploadEndpoint,
  label,
  currentPreview
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(currentPreview || null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size
    if (file.size > maxSize) {
      setError(`File too large (max ${Math.round(maxSize / 1024 / 1024)}MB)`)
      return
    }

    setError('')
    setUploading(true)

    // Show preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => setPreview(reader.result as string)
      reader.readAsDataURL(file)
    }

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      onUploadComplete(data.url)

      // Reset input
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Upload failed')
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const clearPreview = () => {
    setPreview(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
      />

      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            {label}
          </>
        )}
      </Button>

      {preview && (
        <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/10 bg-black/20">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={clearPreview}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 transition border border-white/10"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-400 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          {error}
        </div>
      )}
    </div>
  )
}
