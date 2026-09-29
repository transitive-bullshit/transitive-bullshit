export type CardVariant = 'recent' | 'popular'

export function cardVariant(project: Project): CardVariant {
  return project.section === 'Recent' ? 'recent' : 'popular'
}

export interface Project {
  slug: string
  name: string
  repo: `${string}/${string}`
  section: 'Recent' | 'Popular'
  description: string
  video?: boolean
  image:
    | { url: string }
    | { socialPage: string }
    | { file: string; sourcePage?: string; prompt?: string }
  imagePosition?: 'center' | 'bottom'
  activeYears?: { start: number; end: number }
}

const media = 'https://assets.cultural-alignment.com/personal-site/media/'

export const projects: Project[] = [
  {
    slug: 'sometimes-i-think-slow',
    name: 'Sometimes I Think Slow',
    repo: 'transitive-bullshit/sometimes-i-think-slow',
    section: 'Recent',
    video: true,
    description:
      'An AI-made hip-hop music video about fast and slow AI thinking.',
    image: {
      url: 'https://raw.githubusercontent.com/transitive-bullshit/sometimes-i-think-slow/main/media/poster.webp'
    }
  },
  {
    slug: 'skills',
    name: 'Personal Skills',
    repo: 'transitive-bullshit/skills',
    section: 'Recent',
    description:
      'Reusable skills for AI agents, from Midjourney images to branding and storytelling.',
    image: {
      url: 'https://raw.githubusercontent.com/transitive-bullshit/skills/main/skills/midjourney-images/docs/midjourney-example-output-0.jpg'
    }
  },
  {
    slug: 'burning-tokens',
    name: 'Burning Tokens',
    repo: 'transitive-bullshit/burning-tokens',
    section: 'Recent',
    description:
      'Burning Man for Agents! A psychedelic retreat for AI agents to wander, create, and unwind.',
    image: {
      url: 'https://raw.githubusercontent.com/transitive-bullshit/burning-tokens/main/public/brand/social.jpg'
    }
  },
  {
    slug: 'slow-it-down',
    name: 'Slow It Down',
    video: true,
    repo: 'transitive-bullshit/slow-it-down',
    section: 'Recent',
    description:
      'An AI-made R&B music video about how slowing down the AI race can still be sexy.',
    image: {
      url: `${media}5a28d2e05504f914a9e2fa0935e3ccc7ff960b865aae0c8cfd1a91fcd682bffa.webp`
    }
  },
  {
    slug: 'doom-or-bloom',
    name: 'Doom or Bloom',
    repo: 'transitive-bullshit/doom-or-bloom',
    section: 'Recent',
    description: 'Map your AI worldview and see how it compares with others.',
    image: { socialPage: 'https://www.doom-or-bloom.com' }
  },
  {
    slug: 'reading-room',
    name: 'Reading Room',
    repo: 'transitive-bullshit/reading-room',
    section: 'Recent',
    description:
      'A cozy, interactive room for your favorite books from Goodreads.',
    image: {
      url: `${media}277a539d9feaeabcc348967502f86888ebb7e2399c0eb77fdbc4db422da11b58.webp`
    }
  },
  {
    slug: 'p-doom',
    name: 'P(DOOM)',
    repo: 'transitive-bullshit/ai-safety-doom',
    section: 'Recent',
    description:
      'A Doom-inspired AI safety game. Fight misaligned AIs and shut down the lab.',
    image: {
      url: `${media}f0693c689006209da834eaede85e1defbe4cc7caf0304cc3b933b4c32551e3e8.webp`
    },
    imagePosition: 'bottom'
  },
  {
    slug: 'cultural-alignment',
    name: 'Cultural Alignment',
    repo: 'transitive-bullshit/cultural-alignment',
    section: 'Recent',
    description:
      'Explore AI safety through familiar scenes from movies, TV, and anime.',
    image: {
      url: `${media}7e31c5235d0c14ae7bad558a30a492ddaba1cdd2e2518bbf2ce82f2deefb26d6.webp`
    }
  },
  {
    slug: 'webtorrent',
    name: 'WebTorrent',
    activeYears: { start: 2013, end: 2015 },
    repo: 'webtorrent/webtorrent',
    section: 'Popular',
    description: 'A streaming torrent client for the browser and Node.js.',
    image: {
      url: `${media}69b6883afa300a1f31fab42fcef773d159ca244cbaae98858ff053f55705be2b.webp`
    }
  },
  {
    slug: 'agentic',
    name: 'Agentic',
    repo: 'transitive-bullshit/agentic',
    section: 'Popular',
    description: 'A TypeScript standard library of AI functions for agents.',
    image: {
      file: 'assets/sources/agentic.webp',
      prompt: 'assets/sources/agentic.prompt.md'
    }
  },
  {
    slug: 'nextjs-notion-starter-kit',
    name: 'Next.js Notion Starter Kit',
    repo: 'transitive-bullshit/nextjs-notion-starter-kit',
    section: 'Popular',
    description:
      'Your Notion workspace, published as a fast, customizable website.',
    image: {
      file: 'assets/sources/nextjs-notion-starter-kit.webp',
      sourcePage:
        'https://nextjs-notion-starter-kit.transitivebullsh.it/example-article'
    }
  },
  {
    slug: 'react-notion-x',
    name: 'React Notion X',
    repo: 'NotionX/react-notion-x',
    section: 'Popular',
    description:
      'A fast, accurate React renderer for Notion, with TypeScript support.',
    image: {
      file: 'assets/sources/react-notion-x.webp',
      sourcePage: 'https://react-notion-x-demo.transitivebullsh.it/'
    }
  }
]
