/** Convierte un enlace de YouTube o Vimeo en su URL de reproductor. Devuelve null si no es válido. */
export function toEmbedUrl(input: string): string | null {
  let u: URL
  try {
    u = new URL(input.trim())
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  const host = u.hostname.replace(/^(www|m)\./, '')
  const idOk = (id: string | null | undefined): id is string => !!id && /^[\w-]{6,20}$/.test(id)

  if (host === 'youtu.be') {
    const id = u.pathname.split('/')[1]
    return idOk(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const parts = u.pathname.split('/').filter(Boolean)
    const id = parts[0] === 'watch' ? u.searchParams.get('v') : ['embed', 'shorts', 'live'].includes(parts[0]) ? parts[1] : null
    return idOk(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = u.pathname.split('/').filter(Boolean).find((p) => /^\d+$/.test(p))
    return id ? `https://player.vimeo.com/video/${id}` : null
  }
  return null
}
