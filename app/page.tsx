import type { Metadata } from 'next'
import HomeClient from './HomeClient'

export const metadata: Metadata = {
    openGraph: {
        images: ['/images/og/og-1.jpg'],
    },
    twitter: {
        card: 'summary_large_image',
        images: ['/images/og/og-1.jpg'],
    }
}

export default function Page() {
    return <HomeClient />
}
