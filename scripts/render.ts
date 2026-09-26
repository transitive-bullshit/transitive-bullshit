import octicons from '@primer/octicons'

import type { RepoStats } from './github'
import { cardVariant, type CardVariant, type Project } from './projects'

const colors: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572a5',
  Rust: '#dea584',
  Go: '#00add8',
  HTML: '#e34c26',
  CSS: '#663399'
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

export function cardMetrics(stats: RepoStats, variant: CardVariant) {
  if (variant === 'recent') {
    if (!stats.totals)
      throw new Error(
        'Missing recent totals. Run pnpm generate to refresh the snapshot.'
      )
    return [
      { icon: 'git-commit', label: 'Commits', value: stats.totals.commits },
      {
        icon: 'calendar',
        label: 'Last updated',
        value: new Intl.DateTimeFormat('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'Asia/Bangkok'
        }).format(new Date(stats.totals.latestCommit.date))
      },
      { icon: 'issue-opened', label: 'Open issues', value: stats.issues },
      {
        icon: 'git-merge',
        label: 'PRs merged',
        value: stats.totals.mergedPullRequests
      }
    ] as const
  }
  return [
    { icon: 'repo-forked', label: 'Forks', value: stats.forks },
    { icon: 'people', label: 'Contributors', value: stats.contributors },
    { icon: 'issue-opened', label: 'Open issues', value: stats.issues },
    { icon: 'git-pull-request', label: 'Open PRs', value: stats.pullRequests }
  ] as const
}

function cardDescription(project: Project, stats: RepoStats): string {
  if (cardVariant(project) === 'popular') {
    return `${project.description} ${stats.stars} stars; ${stats.forks} forks; ${stats.contributors} contributors; ${stats.issues} open issues; ${stats.pullRequests} open pull requests. Main language: ${stats.language ?? 'Not specified'}. ${formatDate(project, stats)}.`
  }
  const metrics = cardMetrics(stats, 'recent')
    .map((metric) =>
      typeof metric.value === 'string'
        ? `${metric.label.toLowerCase()} ${metric.value}`
        : `${metric.value} ${metric.label.toLowerCase()}`
    )
    .join('; ')
  return `${project.description} ${stats.stars} stars; ${metrics}. Main language: ${stats.language ?? 'Not specified'}. ${formatDate(project, stats)}.`
}

// HTML/CSS is rendered by Takumi; no browser or manual line-breaking is needed.
export function renderCard(
  project: Project,
  stats: RepoStats,
  image: Buffer,
  variant: CardVariant
): string {
  const gold = variant === 'popular'
  const starColor = gold ? '#e8bb60' : '#c9d1d9'
  const languageColor = colors[stats.language ?? ''] ?? '#8b949e'
  const metrics = cardMetrics(stats, variant)
  return `<html lang="en"><head><style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Geist, sans-serif; }
    .card { position: relative; width: 1200px; height: 1072px; display: flex; flex-direction: column; overflow: hidden; border-radius: 24px; background: #161b22; color: #f0f6fc; }
    .artwork { width: 1200px; height: 630px; flex-shrink: 0; object-fit: cover; }
    .content { height: 432px; padding: 34px 40px 28px; display: flex; flex-direction: column; border-top: 2px solid #30363d; }
    .heading { display: flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 66px; }
    .name { font-size: 46px; line-height: 60px; font-weight: 700; white-space: nowrap; }
    .stars { display: inline-flex; align-items: center; flex-shrink: 0; gap: 16px; padding: 12px 22px; border: 2px solid ${gold ? '#665231' : '#30363d'}; border-radius: 999px; background: ${gold ? '#30291d' : '#212830'}; color: ${starColor}; font-size: 36px; line-height: 36px; font-weight: 700; white-space: nowrap; }
    .icon { width: 32px; height: 32px; flex-shrink: 0; }
    .description { height: 88px; flex-shrink: 0; margin-top: 12px; font-size: 36px; line-height: 44px; color: #b1bac4; text-wrap: pretty; }
    .metrics { display: flex; margin-top: 24px; border-top: 2px solid #30363d; padding-top: 24px; }
    .metric { width: 25%; display: flex; gap: 16px; align-items: flex-start; }
    .metric > .icon { margin-top: 8px; }
    .metric-text { display: flex; flex-direction: column; gap: 4px; }
    .value { font-size: 40px; line-height: 48px; font-variant-numeric: tabular-nums; color: #e6edf3; }
    .value-date { font-size: 30px; white-space: nowrap; }
    .label { font-size: 32px; line-height: 40px; color: #919ba8; white-space: nowrap; }
    .footer { display: flex; align-items: center; justify-content: space-between; margin-top: 28px; font-size: 28px; line-height: 34px; color: #919ba8; }
    .language { display: flex; align-items: center; gap: 14px; }
    .dot { width: 18px; height: 18px; border-radius: 50%; background: ${languageColor}; }
    .date { letter-spacing: 1px; }
    .language-bar { height: 10px; flex-shrink: 0; background: ${languageColor}; }
    .outline { position: absolute; inset: 0; border: 2px solid #30363d; border-radius: 24px; }
  </style></head><body>
    <div class="card">
      <img class="artwork" src="data:image/webp;base64,${image.toString('base64')}" />
      <div class="content">
        <div class="heading">
          <div class="name">${escapeXml(project.name)}</div>
          <div class="stars">${icon('star', starColor)}<span>${compact(stats.stars)}</span></div>
        </div>
        <div class="description">${escapeXml(project.description)}</div>
        <div class="metrics">${metrics
          .map(
            (metric) => `
          <div class="metric">${icon(metric.icon)}<div class="metric-text">
            <div class="value${typeof metric.value === 'string' ? ' value-date' : ''}">${typeof metric.value === 'number' ? compact(metric.value) : escapeXml(metric.value)}</div>
            <div class="label">${metric.label}</div>
          </div></div>`
          )
          .join('')}
        </div>
        <div class="footer">
          <div class="language"><div class="dot"></div><span>${escapeXml(stats.language ?? 'Not specified')}</span></div>
          <div class="date">${formatDate(project, stats)}</div>
        </div>
      </div>
      <div class="language-bar"></div>
      <div class="outline"></div>
    </div>
  </body></html>`
}

export function renderReadme(
  projects: Project[],
  stats: Record<string, RepoStats>
): string {
  const lines = [
    "Building at the edge of AGI. Don't take anything I say too seriously.",
    ''
  ]
  for (const section of ['Recent', 'Popular'] as const) {
    const items = projects.filter((p) => p.section === section)
    if (section === 'Popular')
      items.sort((a, b) => stats[b.repo]!.stars - stats[a.repo]!.stars)
    lines.push(`## ${section} projects`, '')
    for (let i = 0; i < items.length; i += 2) {
      lines.push('<p>')
      const links = items
        .slice(i, i + 2)
        .map(
          (project) =>
            `<a href="https://github.com/${project.repo}"><img src="assets/projects/${project.slug}.webp" alt="${escapeXml(`${project.name}: ${cardDescription(project, stats[project.repo]!)}`)}" width="47%" /></a>`
        )
      lines.push(`  ${links.join('&nbsp;&nbsp;&nbsp;')}`)
      lines.push('</p>', '')
    }
  }
  return lines.join('\n')
}
