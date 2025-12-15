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
            className="text-sm sm:text-2xl md:text-3xl font-extrabold whitespace-nowrap relative cursor-pointer group select-none"
            onMouseEnter={handleMouseEnter}
        >
            <a href="/" className="block relative flex items-center gap-2">
                {/* Static State */}
                <span
                    className={`text-2xl sm:text-3xl lg:text-4xl transition-opacity duration-300 ${isFlying ? 'opacity-0' : 'opacity-100'}`}
                >
                    ✈️
                </span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 drop-shadow-sm">
                    콘센트온
                </span>

                {/* Flying Plane State - Positioned absolute to the screen or container to allow long travel */}
                {isFlying && (
                    <span
                        className="absolute left-0 bottom-0 text-2xl sm:text-3xl lg:text-4xl animate-runway-takeoff z-50 pointer-events-none"
                        aria-hidden="true"
                    >
                        🛫
                    </span>
                )}
            </a>
        </h1>
    )
}
