import { load } from 'cheerio'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import pMap from 'p-map'
import sharp from 'sharp'
import { render } from 'takumi-js'

import { fetchStats, type Snapshot } from './github'
import { cardVariant, projects, type Project } from './projects'
import { renderCard, renderReadme } from './render'

const { values } = parseArgs({
  options: {
    offline: { type: 'boolean', default: false },
    'refresh-images': { type: 'boolean', default: false }
  }
})
if (values.offline && values['refresh-images']) {
  throw new Error('--offline and --refresh-images cannot be used together')
}

const root = join(import.meta.dirname, '..')
const output = join(root, 'assets/projects')
const sources = join(root, 'assets/sources')
const snapshotPath = join(output, 'stats.json')
await mkdir(output, { recursive: true })
await mkdir(sources, { recursive: true })

async function download(url: string): Promise<Response> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok)
    throw new Error(`Download failed (${response.status}): ${url}`)
  return response
}

async function artwork(project: Project): Promise<Buffer> {
  if ('file' in project.image) return readFile(join(root, project.image.file))
  const path = join(sources, `${project.slug}.webp`)
  if (!values['refresh-images']) {
    try {
      return await readFile(path)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
      if (values.offline) throw new Error(`Missing cached artwork: ${path}`)
    }
  }
  let url: string
  if ('socialPage' in project.image) {
    const response = await download(project.image.socialPage)
    const $ = load(await response.text())
    const src = $('meta[property="og:image"]').attr('content')
    if (!src) throw new Error(`No og:image on ${project.image.socialPage}`)
    url = new URL(src, response.url).href
  } else {
    url = project.image.url
  }
  const response = await download(url)
  // Normalize once; store the artwork locally so offline rendering works in a fresh checkout.
  const bytes = await sharp(Buffer.from(await response.arrayBuffer()))
    .rotate()
    .resize(1200, 630, {
      fit: 'cover',
      position: project.imagePosition ?? 'center'
    })
    .webp({ quality: 95 })
    .toBuffer()
  await writeFile(path, bytes)
  return bytes
}

const snapshot: Snapshot = values.offline
  ? (JSON.parse(await readFile(snapshotPath, 'utf8')) as Snapshot)
  : { fetchedAt: new Date().toISOString(), repos: {} }

const cards = await pMap(
  projects,
  async (project) => {
    const variant = cardVariant(project)
    const stats = values.offline
      ? snapshot.repos[project.repo]
      : await fetchStats(project.repo, variant)
    if (!stats)
      throw new Error(
        `No saved stats for ${project.repo}. Run pnpm generate first.`
      )
    snapshot.repos[project.repo] = stats
    const image = await artwork(project)
    const rendered = Buffer.from(
      await render(renderCard(project, stats, image, variant), {
        width: 1200,
        height: 1072,
        format: 'png',
        emoji: 'from-font'
      })
    )
    const data = await sharp(rendered)
      .webp({ quality: 90, effort: 6 })
      .toBuffer()
    console.log(
      `${project.name}: ${stats.stars.toLocaleString('en-US')} stars · ${stats.language ?? 'No language'}`
    )
    return { path: join(output, `${project.slug}.webp`), data }
  },
  { concurrency: 8 }
)

// Finish fetching/rendering everything before replacing the public cards or README.
await pMap(cards, (card) => writeFile(card.path, card.data), { concurrency: 8 })
await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`)
await writeFile(join(root, 'readme.md'), renderReadme(projects, snapshot.repos))
console.log(
  `Generated ${cards.length} cards. Stats snapshot: ${snapshot.fetchedAt}`
)
