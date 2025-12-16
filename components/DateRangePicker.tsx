'use client'

import * as React from 'react'
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import { DayPicker, DateRange } from 'react-day-picker'
import 'react-day-picker/dist/style.css'

interface DateRangePickerProps {
    dateRange: DateRange | undefined
    onSelect: (range: DateRange | undefined) => void
    className?: string
}

export default function DateRangePicker({
    dateRange,
    onSelect,
    className,
}: DateRangePickerProps) {
    // Calculate base date: if today > 15th, start from next month
    const getBaseDate = React.useCallback(() => {
        const now = new Date()
        if (now.getDate() > 15) {
            return startOfMonth(addMonths(now, 1))
        }
        return startOfMonth(now)
    }, [])

    const [isOpen, setIsOpen] = React.useState(false)
    const [localDateRange, setLocalDateRange] = React.useState<DateRange | undefined>(dateRange)
    // Use baseDate for default display
    const [displayMonth, setDisplayMonth] = React.useState<Date>(dateRange?.from || getBaseDate())
    const containerRef = React.useRef<HTMLDivElement>(null)

    // Sync local state when prop changes or modal opens
    React.useEffect(() => {
        if (isOpen) {
            setLocalDateRange(dateRange)
            setDisplayMonth(dateRange?.from || getBaseDate())
        }
    }, [isOpen, dateRange, getBaseDate])

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const toggleOpen = () => setIsOpen(!isOpen)

    const handleSelect = (range: DateRange | undefined) => {
        setLocalDateRange(range)
    }

    const handleConfirm = () => {
        onSelect(localDateRange)
        setIsOpen(false)
    }

    const handleReset = () => {
        setLocalDateRange(undefined)
    }

    const formatDateRange = () => {
        if (!dateRange?.from) return '기간 선택'
        if (!dateRange.to) return `${format(dateRange.from, 'MM.dd')} - 선택 중...`
        return `${format(dateRange.from, 'MM.dd')} - ${format(dateRange.to, 'MM.dd')}`
    }

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        onSelect(undefined)
        setLocalDateRange(undefined)
    }

    const selectMonth = (monthOffset: number) => {
        // Use baseDate + offset
        const baseDate = getBaseDate()
        const targetDate = addMonths(baseDate, monthOffset)
        const from = startOfMonth(targetDate)
        const to = endOfMonth(targetDate)
        const newRange = { from, to }

        setLocalDateRange(newRange)
        setDisplayMonth(targetDate)

        // Auto-confirm for presets
        onSelect(newRange)
        setIsOpen(false)
    }

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                onClick={toggleOpen}
                className="flex items-center justify-between w-full min-w-[180px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-600"
            >
                <span className={!dateRange ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100 font-medium'}>
                    📅 {formatDateRange()}
                </span>
                {dateRange?.from && (
                    <div
                        role="button"
                        onClick={handleClear}
                        className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">


                    {/* 월 단위 빠른 선택 */}
                    <div className="mb-3 flex gap-2 flex-wrap">
                        {[0, 1, 2].map((offset) => {
                            const date = addMonths(getBaseDate(), offset)
                            return (
                                <button
                                    key={offset}
                                    onClick={() => selectMonth(offset)}
                                    className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                >
                                    {format(date, 'M월')}
                                </button>
                            )
                        })}
                    </div>
                    <DayPicker
                        mode="range"
                        selected={localDateRange}
                        onSelect={handleSelect}
                        numberOfMonths={1}
                        month={displayMonth}
                        onMonthChange={setDisplayMonth}
                        locale={ko}
                        styles={{
                            caption: { color: 'inherit' },
                            head_cell: { color: 'gray' },
                            day: { color: 'inherit' },
                            nav_button_previous: { color: 'inherit' },
                            nav_button_next: { color: 'inherit' },
                        }}
                        modifiersClassNames={{
                            selected: 'bg-blue-500 text-white hover:bg-blue-600',
                            today: 'font-bold text-blue-500',
                            range_start: 'bg-blue-500 text-white rounded-l-md',
                            range_end: 'bg-blue-500 text-white rounded-r-md',
                            range_middle: 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100',
                        }}
                        className="border-0"
                    />
                    <div className="mt-4 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                        <button
                            onClick={handleReset}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                            초기화
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded"
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
