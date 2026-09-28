import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

import { countFromPage, fetchRecentTotals, splitIssues } from './github'
import type { RepoStats } from './github'
import { projects } from './projects'
import {
  compact,
  escapeXml,
  formatDate,
  languageBreakdown,
  languageLegend
} from './render'

await test('language breakdowns preserve byte proportions, official colors, and small languages', () => {
  const stats = {
    languages: { Python: 850, HTML: 144, Shell: 6, Empty: 0 }
  }
  const languages = languageBreakdown(stats)
  assert.deepEqual(
    languages.map(({ name, percent }) => ({
      name,
      percent: Number(percent.toFixed(1))
    })),
    [
      { name: 'Python', percent: 85 },
      { name: 'HTML', percent: 14.4 },
      { name: 'Shell', percent: 0.6 }
    ]
  )
  assert.equal(languages[0]!.color, '#3572a5')
  assert.equal(
    languageBreakdown({ languages: { TypeScript: 1 } })[0]!.color,
    '#3178c6'
  )
  assert.deepEqual(languageBreakdown({ languages: {} }), [])
  assert.deepEqual(languageBreakdown({}), [])
  const many = {
    languages: {
      TypeScript: 900,
      CSS: 50,
      JavaScript: 30,
      HTML: 15,
      Unknown: 5
    }
  }
  assert.equal(languageBreakdown(many).length, 5)
  assert.equal(languageBreakdown(many)[4]!.color, '#8b949e')
  assert.deepEqual(languageLegend(many)[3], {
    name: 'Other',
    percent: 2,
    color: '#8b949e'
  })
})

await test('counts every contributor/PR using one-item pagination, including empty repos', () => {
  assert.equal(countFromPage([], null), 0)
  assert.equal(countFromPage([{}], null), 1)
  assert.equal(
    countFromPage(
      [{}],
      '<https://api.github.com/repos/a/b/contributors?per_page=1&page=2>; rel="next", <https://api.github.com/repos/a/b/contributors?per_page=1&page=352>; rel="last"'
    ),
    352
  )
  assert.throws(() =>
    countFromPage([{}], '<https://api.github.com/?page=2>; rel="next"')
  )
  assert.throws(() => countFromPage({ message: 'API error' }, null))
})

await test('open issues exclude pull requests and reject inconsistent snapshots', () => {
  assert.equal(splitIssues(81, 12), 69)
  assert.equal(splitIssues(0, 0), 0)
  assert.throws(() => splitIssues(4, 5))
})

await test('recent totals count all authors and issues, but only merged PRs across all pages', async () => {
  const fetchMock = mock.method(
    globalThis,
    'fetch',
    async (input: string | URL | Request) => {
      const url = new URL(input instanceof Request ? input.url : input)
      assert.equal(url.searchParams.has('author'), false)
      if (url.pathname.endsWith('/commits')) {
        return Response.json(
          [
            {
              html_url: 'https://github.com/a/b/commit/latest',
              commit: {
                author: { date: '2026-09-20T10:00:00Z' },
                committer: { date: '2026-09-25T20:30:00Z' }
              }
            }
          ],
          {
            headers: {
              link: '<https://api.github.com/repos/a/b/commits?per_page=1&page=153>; rel="last"'
            }
          }
        )
      }
      if (url.pathname.endsWith('/pulls')) {
        assert.equal(url.searchParams.get('state'), 'closed')
        if (url.searchParams.has('page'))
          return Response.json([
            { merged_at: '2026-09-01T00:00:00Z' },
            { merged_at: null }
          ])
        return Response.json(
          [{ merged_at: null }, { merged_at: '2026-09-02T00:00:00Z' }],
          {
            headers: {
              link: '<https://api.github.com/repos/a/b/pulls?state=closed&per_page=100&page=2>; rel="next"'
            }
          }
        )
      }
      assert.equal(url.searchParams.get('state'), 'all')
      if (url.searchParams.has('after'))
        return Response.json([{}, { pull_request: {} }])
      return Response.json([{}, {}, { pull_request: {} }], {
        headers: {
          link: '<https://api.github.com/repos/a/b/issues?state=all&per_page=100&after=cursor>; rel="next"'
        }
      })
    }
  )
  try {
    const totals = await fetchRecentTotals('a/b')
    assert.equal(totals.commits, 153)
    assert.equal(totals.issues, 3)
    assert.equal(totals.mergedPullRequests, 2)
    assert.equal(totals.latestCommit.date, '2026-09-25T20:30:00Z')
  } finally {
    fetchMock.mock.restore()
  }
})

await test('card text is escaped and counts use compact notation', () => {
  assert.equal(escapeXml('A & B <C> "D"'), 'A &amp; B &lt;C&gt; &quot;D&quot;')
  assert.equal(compact(31420), '31.4K')
})

await test('recent dates respect Bangkok midnight; older projects show contribution years', () => {
  const stats: RepoStats = {
    stars: 1,
    forks: 0,
    contributors: 1,
    issues: 0,
    pullRequests: 0,
    language: 'TypeScript',
    activity: {
      firstCommit: {
        date: '2026-09-04T23:28:57Z',
        url: 'https://github.com/a/b/commit/first'
      },
      latestCommit: {
        date: '2026-09-19T07:44:37Z',
        url: 'https://github.com/a/b/commit/last'
      }
    }
  }
  const project = projects[0]!
  assert.equal(formatDate(project, stats), 'SEP 5, 2026')
  assert.equal(formatDate({ ...project, section: 'Popular' }, stats), '2026')
  stats.activity.firstCommit.date = '2013-06-01T00:00:00Z'
  assert.equal(
    formatDate({ ...project, section: 'Popular' }, stats),
    '2013–2026'
  )
  assert.equal(
    formatDate(
      {
        ...project,
        section: 'Popular',
        activeYears: { start: 2013, end: 2015 }
      },
      stats
    ),
    '2013–2015'
  )
  assert.throws(() =>
    formatDate(
      {
        ...project,
        section: 'Popular',
        activeYears: { start: 2015, end: 2013 }
      },
      stats
    )
  )
  stats.activity.firstCommit.date = 'invalid'
  assert.throws(() => formatDate(project, stats))
})
