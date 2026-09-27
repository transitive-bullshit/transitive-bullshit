# Profile cards

Run with Node.js 24+ and pnpm:

```sh
pnpm install
pnpm generate
```

`pnpm generate` fetches current public GitHub statistics, renders eight 1200 × 946 WebP cards, and updates the root README. Popular projects are sorted by stars; Recent follows the order in [projects.ts](projects.ts). Edit that file to change projects, descriptions, or image sources. Edit [render.ts](render.ts) to change the shared design.

Cards use **Takumi** (`takumi-js`) to render HTML/CSS at 1200 × 946, with its bundled Geist font for consistent offline output. Takumi renders an intermediate PNG in memory, then Sharp encodes WebP at quality 90, effort 6 for smaller files. Sharp also normalizes downloaded source artwork. Source artwork stays at its original cached resolution. Descriptions use `text-wrap: pretty`; the star pills size to their content with fixed padding. The activity date sits opposite the language in the footer.

Encoder comparison measured across all eight cards on September 26, 2026, before the “Last updated” label change (decimal units; all outputs 1200 × 1072):

| Output | Total size | Reduction vs. original |
| --- | --- | --- |
| Original PNG | 4.21 MB | — |
| **PNG → Sharp WebP, quality 90 / effort 6 (selected)** | **702 KB** | **83.3%** |
| Direct Takumi WebP, quality 90 | 924 KB | 78.1% |

Direct rendering produces 31.7% more bytes than the Sharp conversion at these settings, while removing the PNG encode/decode and conversion step. The same quality number does not guarantee identical output across encoders. Against the original PNG pixels, the average absolute RGB channel error (0–255 scale, excluding alpha) was 0.873 for Sharp and 0.935 for direct Takumi. Per-card PSNR was 0.04–0.30 dB lower for direct Takumi; these numerical measurements are not perceptual quality scores. Representative text and artwork inspection showed very similar appearance, with no obvious readability regression. The larger native files do not imply higher fidelity. Full resolution is retained in both approaches.

Takumi's [output format options](https://takumi.kane.tw/docs/output-formats) support native WebP with a quality setting. The PNG → Sharp path is selected for its smaller output and slightly closer pixel fidelity at these settings.

One shared template takes a `recent` or `popular` variant. Both show the star count, language, and activity date, without a details grid. Popular uses a gold star pill; Recent uses a neutral pill. The README uses “Recent projects” and “Popular projects” headings with 47%-width previews and nonbreaking spaces between columns.

```sh
pnpm generate --offline         # Render using committed artwork and statistics
pnpm generate --refresh-images  # Refresh artwork as well as GitHub statistics
pnpm test                      # Types, lint, formatting, and focused logic tests
```

Artwork is cached in `assets/sources/`; the last successful GitHub snapshot is in `assets/projects/stats.json`. Doom or Bloom resolves its webapp's current `og:image` when artwork is refreshed. The remaining images come from transitivebullsh.it or the pinned sources below. WebP output can also be reused outside the README.

Next.js Notion Starter Kit instead uses a pinned screenshot of its [hosted example article](https://nextjs-notion-starter-kit.transitivebullsh.it/example-article), captured in light mode at 1440 × 900 and cropped from the top to the shared 1200 × 630 artwork size. Its `image.file` entry preserves the screenshot even with `--refresh-images`; replace that local file to update the capture.

React Notion X also uses a pinned screenshot of its [hosted demo](https://react-notion-x-demo.transitivebullsh.it/), captured and cropped with the same settings.

Agentic uses a pinned technical cover generated with built-in imagegen, with monospace typography and a TypeScript function-library diagram. Its [generation prompt](../assets/sources/agentic.prompt.md) is saved alongside the artwork. Replace `assets/sources/agentic.webp` to update it; `--refresh-images` preserves this local source.

GitHub requests work without authentication for public repositories. Set `GH_TOKEN` or `GITHUB_TOKEN` for a higher rate limit. Tokens are only sent to api.github.com, never to image hosts, and are never saved.

Stars are repository totals. The footer uses GitHub's dominant language and its language color, with a gray fallback for languages outside the small palette in `render.ts`. Counts stay fixed until regeneration; the snapshot records their fetch date. The snapshot also retains additional repository statistics that are not displayed on the cards.

Dates use commits attributed by GitHub to `transitive-bullshit` on the repository's default branch. Recent shows the first authored commit as `SEP 5, 2026` in Asia/Bangkok time. Popular shows the years of the first and latest authored commits, collapsing to one year when both match. These are contribution ranges in the linked repo, rather than claims about work in related repos or when a project stopped being maintained. Both source commit URLs and timestamps are saved under `activity` in the snapshot.

Set `activeYears` in `projects.ts` to preserve a broader activity range for an older project. WebTorrent uses Travis's confirmed **2013–2015** range; its core-repo commits alone only cover 2014. Overrides survive every statistics refresh.

References: [repository metadata and contributors](https://docs.github.com/en/rest/repos/repos), [pull requests](https://docs.github.com/en/rest/pulls/pulls#list-pull-requests), [pagination](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api). Icons use [GitHub Octicons](https://github.com/primer/octicons).

Rendering references: [Takumi CSS support](https://takumi.kane.tw/docs/reference/) and [typography](https://takumi.kane.tw/docs/typography-and-fonts). Activity dates use GitHub's [list commits](https://docs.github.com/en/rest/commits/commits#list-commits) endpoint with an author filter.
