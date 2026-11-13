import type { Presign } from './types'

const put = (url: string, file: Blob, onProgress: (fraction: number) => void) =>
  new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Error ${xhr.status}`)))
    xhr.onerror = () => reject(new Error('Fallo de red'))
    xhr.send(file)
  })

/** Sube directo al bucket; si el navegador no puede (CORS), usa el backend como respaldo. */
export async function uploadFile(presign: Presign, file: Blob, onProgress: (fraction: number) => void) {
  try {
    await put(presign.uploadUrl, file, onProgress)
  } catch {
    onProgress(0)
    await put(presign.fallbackUrl, file, onProgress)
  }
}

export function imageSize(file: Blob): Promise<{ width: number; height: number } | null> {
  return createImageBitmap(file)
    .then((bmp) => {
      const size = { width: bmp.width, height: bmp.height }
      bmp.close()
      return size
    })
    .catch(() => null)
}

/** Lee las dimensiones de un video y captura un fotograma como póster JPEG. */
export function videoPoster(file: Blob): Promise<{ width: number; height: number; poster: Blob | null } | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    const done = (value: { width: number; height: number; poster: Blob | null } | null) => {
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve(value)
    }
    const timer = setTimeout(
      () => done(video.videoWidth ? { width: video.videoWidth, height: video.videoHeight, poster: null } : null),
      8000,
    )
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.onerror = () => done(null)
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, (video.duration || 2) / 2)
    }
    video.onseeked = () => {
      const { videoWidth: width, videoHeight: height } = video
      const scale = Math.min(1, 1600 / width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(width * scale)
      canvas.height = Math.round(height * scale)
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((poster) => done({ width, height, poster }), 'image/jpeg', 0.82)
    }
    video.src = url
  })
}
