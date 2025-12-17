
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

interface FrequentCity {
    id: number
    city_name: string
    airport_code: string
    is_active: boolean
    created_at: string
}

export default function FrequentCitiesAdmin() {
    const [cities, setCities] = useState<FrequentCity[]>([])
    const [loading, setLoading] = useState(true)
    const [newCityName, setNewCityName] = useState('')
    const [newAirportCode, setNewAirportCode] = useState('')
    const supabase = createClient()

    useEffect(() => {
        fetchCities()
    }, [])

    const fetchCities = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('frequent_cities')
            .select('*')
            .order('id')

        if (error) {
            console.error('Error fetching cities:', error)
            alert('도시 목록을 불러오는데 실패했습니다.')
        } else {
            setCities(data || [])
        }
        setLoading(false)
    }

    const addCity = async () => {
        if (!newCityName || !newAirportCode) {
            alert('도시 이름과 공항 코드를 입력해주세요.')
            return
        }

        const { error } = await supabase
            .from('frequent_cities')
            .insert([{
                city_name: newCityName,
                airport_code: newAirportCode.toUpperCase(),
                is_active: true
            }])

        if (error) {
            console.error('Error adding city:', error)
            alert('도시 추가 실패: ' + error.message)
        } else {
            setNewCityName('')
            setNewAirportCode('')
            fetchCities()
        }
    }

    const toggleActive = async (id: number, currentStatus: boolean) => {
        const { error } = await supabase
            .from('frequent_cities')
            .update({ is_active: !currentStatus })
            .eq('id', id)

        if (error) {
            console.error('Error updating city:', error)
            alert('상태 업데이트 실패')
        } else {
            fetchCities()
        }
    }

    const deleteCity = async (id: number) => {
        if (!confirm('정말 삭제하시겠습니까?')) return

        const { error } = await supabase
            .from('frequent_cities')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting city:', error)
            alert('삭제 실패')
        } else {
            fetchCities()
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">자주 찾는 도시 관리</h1>

            <div className="bg-white p-6 rounded-lg shadow mb-8">
                <h2 className="text-lg font-semibold mb-4">새 도시 추가</h2>
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="도시 이름 (예: 도쿄)"
                        value={newCityName}
                        onChange={(e) => setNewCityName(e.target.value)}
                        className="border p-2 rounded flex-1"
                    />
                    <input
                        type="text"
                        placeholder="공항 코드 (예: NRT)"
                        value={newAirportCode}
                        onChange={(e) => setNewAirportCode(e.target.value)}
                        className="border p-2 rounded w-32 uppercase"
                    />
                    <button
                        onClick={addCity}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        추가
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">도시</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">공항 코드</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">로딩 중...</td></tr>
                        ) : cities.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">등록된 도시가 없습니다.</td></tr>
                        ) : (
                            cities.map((city) => (
                                <tr key={city.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{city.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{city.city_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{city.airport_code}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <button
                                            onClick={() => toggleActive(city.id, city.is_active)}
                                            className={`px-3 py-1 rounded-full text-xs font-medium ${city.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}
                                        >
                                            {city.is_active ? '활성' : '비활성'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => deleteCity(city.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            삭제
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
