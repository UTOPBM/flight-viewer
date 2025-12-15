import type { Metadata } from 'next'
import HomeClient from './HomeClient'

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
  props: Props
): Promise<Metadata> {
  const searchParams = await props.searchParams
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
    // Random for root page
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
