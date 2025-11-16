// TypeScript declarations for Document Picture-in-Picture API
// https://developer.chrome.com/docs/web-platform/document-picture-in-picture/

interface DocumentPictureInPictureOptions {
  width?: number
  height?: number
  disallowReturnToOpener?: boolean
}

interface DocumentPictureInPicture extends EventTarget {
  requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>
  window: Window | null
  onenter: ((this: DocumentPictureInPicture, ev: Event) => any) | null
}

interface Window {
  documentPictureInPicture?: DocumentPictureInPicture
}
