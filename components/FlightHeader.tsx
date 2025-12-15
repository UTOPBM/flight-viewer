'use client'

import { useState } from 'react'

export default function FlightHeader() {
    const [isFlying, setIsFlying] = useState(false)

    const handleMouseEnter = () => {
        if (!isFlying) {
            setIsFlying(true)
            // Reset animation state after it completes (approx 2s)
            setTimeout(() => {
                setIsFlying(false)
            }, 2000)
        }
    }

    return (
        <h1
            className="text-sm sm:text-2xl md:text-3xl font-bold text-blue-700 dark:text-white whitespace-nowrap overflow-hidden relative cursor-pointer"
            onMouseEnter={handleMouseEnter}
        >
            <a href="/" className="block relative">
                {/* Static State */}
                <span
                    className={`inline-block transition-opacity duration-300 ${isFlying ? 'opacity-0' : 'opacity-100'}`}
                >
                    ✈️
                </span>
                <span>콘센트온</span>

                {/* Flying Plane State */}
                {isFlying && (
                    <span
                        className="absolute left-0 bottom-0 animate-runway-takeoff"
                        aria-hidden="true"
                    >
                        🛫
                    </span>
                )}
            </a>
        </h1>
    )
}
