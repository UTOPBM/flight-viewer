
// ... (previous content)

import type { Metadata } from 'next'
import HomeClient from './HomeClient'

type Props = {
  searchParams: { [key: string]: string | string[] | undefined }
}

export async function generateMetadata(
  { searchParams }: Props
): Promise<Metadata> {
  const search = searchParams.search
  let imageIndex = 1

  if (typeof search === 'string' && search.length > 0) {
    // Simple hash: sum of char codes % 3 + 1
    let sum = 0
    for (let i = 0; i < search.length; i++) {
      sum += search.charCodeAt(i)
    }
    imageIndex = (sum % 3) + 1
  } else {
    // If no search, maybe random? Or fixed default (1).
    // Let's use random for root page if user wants variety, or fixed.
    // User asked for "Randomly appear of 3".
    // If we want random on every load for root, we can use Math.random().
    // But for stable link previews, usually it's better to be consistent or just pick one.
    // However, if the user just visits the site, maybe they want to see different ones.
    // To ensure hydration match? No, metadata is head.
    // Let's stick to Hash for search, and Random for root? 
    // Random in generateMetadata might be cached by Next.js if page is static.
    // But this page uses searchParams, so it is dynamic rendering.

    // Actually, for root page, random is fine.
    imageIndex = Math.floor(Math.random() * 3) + 1
  }

  return {
    openGraph: {
      images: [`/images/og/og-${imageIndex}.jpg`],
    },
    twitter: {
      card: 'summary_large_image',
      images: [`/images/og/og-${imageIndex}.jpg`],
    }
  }
}

export default function Page() {
  return <HomeClient />
}
