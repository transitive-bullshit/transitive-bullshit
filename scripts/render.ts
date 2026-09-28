import octicons from '@primer/octicons'

import type { RepoStats } from './github'
import type { CardVariant, Project } from './projects'

// GitHub Linguist languages.yml, verified September 28, 2026.
// https://github.com/github-linguist/linguist/blob/main/lib/linguist/languages.yml
const colors: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572a5',
  Rust: '#dea584',
  Go: '#00add8',
  HTML: '#e34c26',
  CSS: '#663399',
  Shell: '#89e051',
  PLpgSQL: '#336790',
  MDX: '#fcb32c',
  Starlark: '#76d275'
}

export function languageBreakdown(stats: Pick<RepoStats, 'languages'>) {
  const entries = Object.entries(stats.languages ?? {})
    .filter(([, bytes]) => Number.isFinite(bytes) && bytes > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0)
  return entries.map(([name, bytes]) => ({
    name,
    percent: (bytes / total) * 100,
    color: colors[name] ?? '#8b949e'
  }))
}

export function languageLegend(stats: Pick<RepoStats, 'languages'>) {
  const languages = languageBreakdown(stats)
  if (languages.length <= 4) return languages
  return [
    ...languages.slice(0, 3),
    {
      name: 'Other',
      percent: languages
        .slice(3)
        .reduce((sum, language) => sum + language.percent, 0),
      color: '#8b949e'
    }
  ]
}

function percentage(value: number): string {
  return value < 0.1 ? '<0.1%' : `${value.toFixed(1)}%`
}

export function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;'
      })[char]!
  )
}

export function compact(value: number): string {
  return Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value)
}

export function shortDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Bangkok'
  })
    .format(new Date(value))
    .toUpperCase()
}

export function formatDate(project: Project, stats: RepoStats): string {
  const start = new Date(stats.activity.firstCommit.date)
  const end = new Date(stats.activity.latestCommit.date)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    throw new Error(`Invalid activity dates for ${project.repo}`)
  }
  if (project.section === 'Recent') {
    return shortDate(stats.activity.firstCommit.date)
  }
  const firstYear = project.activeYears?.start ?? start.getUTCFullYear()
  const lastYear = project.activeYears?.end ?? end.getUTCFullYear()
  if (
    !Number.isInteger(firstYear) ||
    !Number.isInteger(lastYear) ||
    lastYear < firstYear
  ) {
    throw new Error(`Invalid activity range for ${project.repo}`)
  }
  return firstYear === lastYear ? String(firstYear) : `${firstYear}–${lastYear}`
}

function icon(name: keyof typeof octicons, color = '#919ba8'): string {
  const size = octicons[name].heights[16]
  if (!size) throw new Error(`Missing 16px Octicon: ${name}`)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 16 16" fill="${color}">${size.path}</svg>`
  return `<img class="icon" width="32" height="32" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" />`
}

function cardDescription(project: Project, stats: RepoStats): string {
  const languages = languageBreakdown(stats)
    .map((language) => `${language.name} ${percentage(language.percent)}`)
    .join(', ')
  return `${project.videoUrl ? 'Watch video. ' : ''}${project.description} ${stats.stars} stars. Languages: ${languages || 'Not specified'}. ${formatDate(project, stats)}.`
}

function videoPlayOverlay(): string {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="156" height="110" viewBox="0 0 156 110"><defs><linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#30343b" stop-opacity="0.68"/><stop offset="1" stop-color="#141820" stop-opacity="0.78"/></linearGradient></defs><rect x="0.75" y="0.75" width="154.5" height="108.5" rx="22" fill="url(#glass)" stroke="#fff" stroke-opacity="0.24" stroke-width="1.5"/><path d="M66 34 L102 55 L66 76 Z" fill="#fff" fill-opacity="0.94" stroke="#fff" stroke-opacity="0.94" stroke-width="3" stroke-linejoin="round"/></svg>'
  return `<img class="video-play" width="234" height="165" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" />`
}

// HTML/CSS is rendered by Takumi; no browser or manual line-breaking is needed.
export function renderCard(
  project: Project,
  stats: RepoStats,
  image: Buffer,
  variant: CardVariant,
  height?: number
): string {
  const gold = variant === 'popular'
  const starColor = gold ? '#e8bb60' : '#c9d1d9'
  const languages = languageBreakdown(stats)
  const legend = languageLegend(stats)
  return `<html lang="en"><head><style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Geist, sans-serif; }
    .card { position: relative; width: 1200px; ${height ? `height: ${height}px;` : ''} display: flex; flex-direction: column; overflow: hidden; border-radius: 24px; background: #161b22; color: #f0f6fc; }
    .artwork { width: 1200px; height: 630px; flex-shrink: 0; object-fit: cover; }
    .video-play { position: absolute; left: 483px; top: 232.5px; width: 234px; height: 165px; border-radius: 33px; box-shadow: 0 10px 32px #00000040; }
    .content { flex-grow: 1; padding: 32px 40px 28px; display: flex; flex-direction: column; border-top: 2px solid #30363d; }
    .heading { display: flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 66px; }
    .name { font-size: 46px; line-height: 60px; font-weight: 700; white-space: nowrap; }
    .stars { display: inline-flex; align-items: center; flex-shrink: 0; gap: 16px; padding: 12px 22px; border: 2px solid ${gold ? '#665231' : '#30363d'}; border-radius: 999px; background: ${gold ? '#30291d' : '#212830'}; color: ${starColor}; font-size: 36px; line-height: 36px; font-weight: 700; white-space: nowrap; }
    .icon { width: 32px; height: 32px; flex-shrink: 0; }
    .description { flex-shrink: 0; margin-top: 16px; font-size: 36px; line-height: 44px; color: #b1bac4; text-wrap: pretty; }
    .footer { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-top: auto; padding-top: 32px; font-size: 26px; line-height: 34px; color: #919ba8; }
    .languages { display: flex; flex-wrap: wrap; width: 760px; gap: 8px 24px; }
    .language { display: flex; align-items: center; gap: 10px; width: 360px; white-space: nowrap; }
    .language-name { color: #c9d1d9; }
    .dot { width: 18px; height: 18px; border-radius: 50%; }
    .date { letter-spacing: 1px; white-space: nowrap; flex-shrink: 0; }
    .language-bar { display: flex; height: 12px; flex-shrink: 0; background: #8b949e; }
    .segment { height: 12px; flex-shrink: 0; }
    .outline { position: absolute; inset: 0; border: 2px solid #30363d; border-radius: 24px; }
  </style></head><body>
    <div class="card">
      <img class="artwork" src="data:image/webp;base64,${image.toString('base64')}" />
      ${project.videoUrl ? videoPlayOverlay() : ''}
      <div class="content">
        <div class="heading">
          <div class="name">${escapeXml(project.name)}</div>
          <div class="stars">${icon('star', starColor)}<span>${compact(stats.stars)}</span></div>
        </div>
        <div class="description">${escapeXml(project.description)}</div>
        <div class="footer">
          <div class="languages">${legend.length ? legend.map((language) => `<div class="language"><div class="dot" style="background: ${language.color}"></div><span class="language-name">${escapeXml(language.name)}</span><span>${escapeXml(percentage(language.percent))}</span></div>`).join('') : '<span>No language data</span>'}</div>
          <div class="date">${formatDate(project, stats)}</div>
        </div>
      </div>
      <div class="language-bar">${languages.map((language) => `<div class="segment" style="width: ${language.percent}%; background: ${language.color}"></div>`).join('')}</div>
      <div class="outline"></div>
    </div>
  </body></html>`
}

// Both image sizing and README markup must use these exact adjacent pairs.
export function projectRows(
  projects: Project[],
  stats: Record<string, RepoStats>
) {
  return (['Recent', 'Popular'] as const).map((section) => {
    const items = projects.filter((project) => project.section === section)
    if (section === 'Popular')
      items.sort((a, b) => stats[b.repo]!.stars - stats[a.repo]!.stars)
    const rows: Project[][] = []
    for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2))
    return { section, rows }
  })
}

export function renderReadme(
  projects: Project[],
  stats: Record<string, RepoStats>
): string {
  const lines = [
    "Building at the edge of AGI. Don't take anything I say too seriously.",
    ''
  ]
  for (const { section, rows } of projectRows(projects, stats)) {
    lines.push(`## ${section} projects`, '')
    for (const row of rows) {
      lines.push('<p>')
      const links = row.map(
        (project) =>
          `<a href="${escapeXml(project.videoUrl ?? `https://github.com/${project.repo}`)}"><img src="assets/projects/${project.slug}.webp" alt="${escapeXml(`${project.name}: ${cardDescription(project, stats[project.repo]!)}`)}" width="47%" /></a>`
      )
      lines.push(`  ${links.join('&nbsp;&nbsp;&nbsp;')}`)
      lines.push('</p>', '')
    }
  }
  return lines.join('\n')
}
