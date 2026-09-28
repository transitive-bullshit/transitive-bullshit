import type { CardVariant } from './projects'

export interface Activity {
  firstCommit: { date: string; url: string }
  latestCommit: { date: string; url: string }
}

export interface RecentTotals {
  commits: number
  issues: number
  mergedPullRequests: number
  latestCommit: { date: string; url: string }
  fetchedAt: string
}

export interface RepoStats {
  stars: number
  forks: number
  contributors: number
  issues: number
  pullRequests: number
  language: string | null
  languages?: Record<string, number>
  activity: Activity
  totals?: RecentTotals
}

export interface Snapshot {
  fetchedAt: string
  repos: Record<string, RepoStats>
}

interface Repository {
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  language: string | null
}

interface Commit {
  html_url: string
  commit: { author: { date: string }; committer: { date: string } }
}

export async function github(path: string): Promise<Response> {
  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN
  const headers = new Headers({
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2026-03-10',
    'User-Agent': 'transitive-bullshit-profile'
  })
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`https://api.github.com${path}`, {
    headers,
    signal: AbortSignal.timeout(30_000)
  })
  if (!response.ok) {
    throw new Error(
      `GitHub ${response.status} for ${path}. Set GH_TOKEN if rate limited; use --offline to render the saved snapshot.`
    )
  }
  return response
}

// With per_page=1, the last page number is the total, without downloading every item.
export function countFromPage(items: unknown, link: string | null): number {
  if (!Array.isArray(items)) throw new Error('Expected a GitHub list response')
  const last = link?.split(',').find((part) => part.includes('rel="last"'))
  if (last) {
    const url = last.match(/<([^>]+)>/)?.[1]
    const count = url ? Number(new URL(url).searchParams.get('page')) : NaN
    if (!Number.isSafeInteger(count) || count < 1)
      throw new Error('Invalid GitHub pagination')
    return count
  }
  if (link?.includes('rel="next"'))
    throw new Error('GitHub did not provide a total page count')
  return items.length
}

async function listCount(path: string): Promise<number> {
  const response = await github(path)
  if (response.status === 204) return 0
  return countFromPage(await response.json(), response.headers.get('link'))
}

export function splitIssues(total: number, pullRequests: number): number {
  const issues = total - pullRequests
  if (!Number.isSafeInteger(issues) || issues < 0) {
    throw new Error(
      'Inconsistent issue/PR counts from GitHub; retry the refresh'
    )
  }
  return issues
}

export async function fetchActivity(repo: string): Promise<Activity> {
  const path = `/repos/${repo}/commits?author=transitive-bullshit&per_page=1`
  const response = await github(path)
  const commits = (await response.json()) as Commit[]
  const pages = countFromPage(commits, response.headers.get('link'))
  const latest = commits[0]
  if (!latest) throw new Error(`No authored commits found for ${repo}`)
  const first =
    pages > 1
      ? ((await (await github(`${path}&page=${pages}`)).json()) as Commit[])[0]
      : latest
  if (!first) throw new Error(`Missing first authored commit for ${repo}`)
  return {
    firstCommit: { date: first.commit.author.date, url: first.html_url },
    latestCommit: { date: latest.commit.author.date, url: latest.html_url }
  }
}

export async function fetchRecentTotals(repo: string): Promise<RecentTotals> {
  const [response, issues, mergedPullRequests] = await Promise.all([
    github(`/repos/${repo}/commits?per_page=1`),
    countMatching<{ pull_request?: unknown }>(
      `/repos/${repo}/issues?state=all&per_page=100`,
      (item) => !item.pull_request
    ),
    countMatching<{ merged_at: string | null }>(
      `/repos/${repo}/pulls?state=closed&per_page=100`,
      (item) => item.merged_at != null
    )
  ])
  const commits = (await response.json()) as Commit[]
  const latest = commits[0]
  if (!latest) throw new Error(`No commits found for ${repo}`)
  return {
    commits: countFromPage(commits, response.headers.get('link')),
    issues,
    mergedPullRequests,
    latestCommit: { date: latest.commit.committer.date, url: latest.html_url },
    fetchedAt: new Date().toISOString()
  }
}

// Walk every page when filtering records (issues exclude PRs; closed PRs exclude unmerged PRs).
async function countMatching<T>(
  initialPath: string,
  matches: (item: T) => boolean
): Promise<number> {
  let path: string | undefined = initialPath
  let count = 0
  while (path) {
    const response = await github(path)
    const items = (await response.json()) as T[]
    count += items.filter(matches).length
    const next = response.headers
      .get('link')
      ?.split(',')
      .find((part) => part.includes('rel="next"'))
      ?.match(/<([^>]+)>/)?.[1]
    if (next) {
      const url = new URL(next)
      path = url.pathname + url.search
    } else {
      path = undefined
    }
  }
  return count
}

export async function fetchStats(
  repo: string,
  variant: CardVariant
): Promise<RepoStats> {
  const [response, contributors, pullRequests, activity, languagesResponse] =
    await Promise.all([
      github(`/repos/${repo}`),
      listCount(`/repos/${repo}/contributors?anon=1&per_page=1`),
      listCount(`/repos/${repo}/pulls?state=open&per_page=1`),
      fetchActivity(repo),
      github(`/repos/${repo}/languages`)
    ])
  const data = (await response.json()) as Repository
  const stats: RepoStats = {
    stars: data.stargazers_count,
    forks: data.forks_count,
    contributors,
    // The repository's open_issues_count includes open pull requests.
    issues: splitIssues(data.open_issues_count, pullRequests),
    pullRequests,
    language: data.language,
    languages: (await languagesResponse.json()) as Record<string, number>,
    activity
  }
  if (variant === 'recent') stats.totals = await fetchRecentTotals(repo)
  return stats
}
