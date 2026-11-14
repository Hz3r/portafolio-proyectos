export type ContributionDay = { date: string; count: number; level: number }
export type Contributions = { total: number; days: ContributionDay[] }
export type GithubSource = (user: string) => Promise<Contributions | null>

/** Usuario de un enlace a un perfil de GitHub, o null si el enlace no es un perfil. */
export function githubUser(url: string | null | undefined): string | null {
  return url?.match(/^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9-]{1,39})\/?$/)?.[1] ?? null
}

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? null

/**
 * Lee el calendario de contribuciones de la página pública github.com/users/<usuario>/contributions.
 * Cada día es una celda con data-date y data-level; la cantidad exacta viene en su tooltip.
 */
export function parseContributions(html: string): Contributions | null {
  const counts = new Map<string, number>()
  for (const [, target, text] of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([^<]*)</g)) {
    counts.set(target, Number(text.trim().match(/^([\d,]+)\s/)?.[1].replace(/,/g, '') ?? 0))
  }
  const days: ContributionDay[] = []
  for (const [tag] of html.matchAll(/<td[^>]*\bdata-date="[^"]*"[^>]*>/g)) {
    const date = attr(tag, 'data-date')
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    const level = Math.min(4, Math.max(0, Number(attr(tag, 'data-level') ?? 0) || 0))
    // Sin tooltip, el nivel al menos dice si hubo actividad.
    days.push({ date, level, count: counts.get(attr(tag, 'id') ?? '') ?? (level > 0 ? 1 : 0) })
  }
  if (days.length === 0) return null
  days.sort((a, b) => a.date.localeCompare(b.date))
  const stated = html.match(/([\d,]+)\s+contributions?\s+in\s+/)?.[1]
  return { total: stated ? Number(stated.replace(/,/g, '')) : days.reduce((n, d) => n + d.count, 0), days }
}

const LEVELS: Record<string, number> = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 }

/** Con GITHUB_TOKEN se usa la API oficial (GraphQL); sin él, la página pública. */
async function load(user: string, token?: string): Promise<Contributions | null> {
  const signal = AbortSignal.timeout(8000)
  if (token) {
    const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}`
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'user-agent': 'portafolio' },
      body: JSON.stringify({ query, variables: { login: user } }),
      signal,
    })
    if (!res.ok) return null
    const calendar = (await res.json())?.data?.user?.contributionsCollection?.contributionCalendar
    if (!calendar) return null
    const days = (calendar.weeks as { contributionDays: { date: string; contributionCount: number; contributionLevel: string }[] }[]).flatMap((w) =>
      w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount, level: LEVELS[d.contributionLevel] ?? 0 })),
    )
    return days.length ? { total: calendar.totalContributions, days } : null
  }
  const res = await fetch(`https://github.com/users/${user}/contributions`, { headers: { 'user-agent': 'portafolio', 'x-requested-with': 'XMLHttpRequest' }, signal })
  return res.ok ? parseContributions(await res.text()) : null
}

/** Contribuciones con caché en memoria: GitHub se consulta como mucho una vez cada 3 horas por usuario. */
export function createGithubSource(token?: string): GithubSource {
  const cache = new Map<string, { at: number; data: Contributions | null }>()
  const TTL = 3 * 60 * 60 * 1000
  const RETRY = 10 * 60 * 1000
  return async (user) => {
    const hit = cache.get(user)
    if (hit && Date.now() - hit.at < (hit.data ? TTL : RETRY)) return hit.data
    const fresh = await load(user, token).catch((e) => (console.error('No se pudo leer GitHub:', e instanceof Error ? e.message : e), null))
    // Si GitHub falla, se sigue mostrando lo último que se obtuvo.
    const data = fresh ?? hit?.data ?? null
    cache.set(user, { at: Date.now(), data })
    return data
  }
}
