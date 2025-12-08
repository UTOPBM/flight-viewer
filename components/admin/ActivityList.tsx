'use client'

interface Product {
    id: number
    city: string
    title: string
    image_url: string
    price: string
    rating: number
    review_count: number
    original_url: string
}

interface ActivityListProps {
    city: string | null
    products: Product[]
    selectedProductIds: Set<number>
    onToggleProduct: (id: number) => void
    loading: boolean
}

export default function ActivityList({
    city,
    products,
    selectedProductIds,
    onToggleProduct,
    loading
}: ActivityListProps) {

    if (!city) {
        return (
            <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-900/50">
                <p>좌측에서 항공권을 선택해주세요.</p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500">
                <p>액티비티 로딩중...</p>
            </div>
        )
    }

    if (products.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                <p className="font-medium text-lg">상품이 없습니다 😢</p>
                <p className="text-sm">'{city}'에 대한 제휴 상품을 찾지 못했습니다.</p>
            </div>
        )
    }

    return (
        <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4">
            <div className="mb-4 flex justify-between items-center">
                <h2 className="font-bold text-lg">🎡 {city} 액티비티 ({products.length})</h2>
                <span className="text-sm text-gray-500">{selectedProductIds.size}개 선택됨</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                {products.map((product) => {
                    const isSelected = selectedProductIds.has(product.id)
                    return (
                        <div
                            key={product.id}
                            onClick={() => onToggleProduct(product.id)}
                            className={`group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm cursor-pointer transition-all hover:shadow-md border-2 ${isSelected ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900' : 'border-transparent'
                                }`}
                        >
                            {/* Selection Checkbox Overlay */}
                            <div className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-black/30 border-white group-hover:bg-black/50'
                                }`}>
                                {isSelected && <span className="text-white text-xs">✓</span>}
                            </div>

                            <div className="aspect-video w-full overflow-hidden bg-gray-200 relative">
                                <img
                                    src={product.image_url}
                                    alt={product.title}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    loading="lazy"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8">
                                    <div className="flex items-center gap-1 text-white text-xs font-medium">
                                        <span>⭐ {product.rating}</span>
                                        <span className="opacity-80">({product.review_count})</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 mb-2 h-10">
                                    {product.title}
                                </h3>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                        {parseInt(product.price).toLocaleString()}원~
                                    </span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
