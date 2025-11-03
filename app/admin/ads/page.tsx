'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

interface Advertisement {
  id: string
  title: string
  description: string | null
  image_url: string | null
  link_url: string
  position: string
  priority: number
  start_date: string | null
  end_date: string | null
  is_active: boolean
  click_count: number
  view_count: number
  created_at: string
  updated_at: string
}

export default function AdminAdsPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [ads, setAds] = useState<Advertisement[]>([])
  const [loading, setLoading] = useState(false)
  const [editingAd, setEditingAd] = useState<Partial<Advertisement> | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // 간단한 패스워드 인증
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123'
    if (password === adminPassword) {
      setAuthenticated(true)
      localStorage.setItem('admin_auth', 'true')
      fetchAds()
    } else {
      alert('잘못된 패스워드입니다.')
    }
  }

  useEffect(() => {
    const isAuth = localStorage.getItem('admin_auth')
    if (isAuth === 'true') {
      setAuthenticated(true)
      fetchAds()
    }
  }, [])

  const fetchAds = async () => {
    setLoading(true)
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .order('priority', { ascending: false })

      if (error) throw error
      setAds(data || [])
    } catch (err) {
      console.error('Failed to fetch ads:', err)
      alert('광고 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('이미지 크기는 5MB 이하여야 합니다.')
      return
    }

    // 이미지 파일인지 체크
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }

    setSelectedFile(file)

    // 미리보기 생성
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedFile) return null

    setUploadingImage(true)
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // 파일명 생성 (timestamp + 원본 파일명)
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `ads/${fileName}`

      // Storage에 업로드
      const { error: uploadError } = await supabase.storage
        .from('ad-images')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error('이미지 업로드 실패. Supabase에서 "ad-images" 버킷을 먼저 생성해주세요.')
      }

      // Public URL 가져오기
      const { data: urlData } = supabase.storage
        .from('ad-images')
        .getPublicUrl(filePath)

      return urlData.publicUrl
    } catch (err: any) {
      console.error('Failed to upload image:', err)
      alert(err.message || '이미지 업로드에 실패했습니다.')
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAd) return

    try {
      // 이미지 파일이 선택되어 있으면 업로드
      let imageUrl = editingAd.image_url
      if (selectedFile) {
        const uploadedUrl = await uploadImage()
        if (uploadedUrl) {
          imageUrl = uploadedUrl
        } else {
          alert('이미지 업로드에 실패했습니다.')
          return
        }
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const adData = { ...editingAd, image_url: imageUrl }

      if (editingAd.id) {
        // 수정
        const { error } = await supabase
          .from('advertisements')
          .update(adData)
          .eq('id', editingAd.id)

        if (error) throw error
        alert('광고가 수정되었습니다.')
      } else {
        // 새로 생성
        const { error } = await supabase
          .from('advertisements')
          .insert([adData])

        if (error) throw error
        alert('광고가 추가되었습니다.')
      }

      setEditingAd(null)
      setShowForm(false)
      setSelectedFile(null)
      setImagePreview(null)
      fetchAds()
    } catch (err) {
      console.error('Failed to save ad:', err)
      alert('광고 저장에 실패했습니다. Service Role Key가 설정되어 있는지 확인하세요.')
    }
  }

  const handleDeleteAd = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error } = await supabase
        .from('advertisements')
        .delete()
        .eq('id', id)

      if (error) throw error
      alert('광고가 삭제되었습니다.')
      fetchAds()
    } catch (err) {
      console.error('Failed to delete ad:', err)
      alert('광고 삭제에 실패했습니다.')
    }
  }

  const handleLogout = () => {
    setAuthenticated(false)
    localStorage.removeItem('admin_auth')
    setPassword('')
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">광고 관리자 로그인</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="패스워드를 입력하세요"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
          >
            로그인
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">광고 관리</h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditingAd({
                  title: '',
                  description: '',
                  image_url: '',
                  link_url: '',
                  position: 'banner-top',
                  priority: 0,
                  is_active: true,
                })
                setShowForm(true)
                setSelectedFile(null)
                setImagePreview(null)
              }}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              새 광고 추가
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* 광고 폼 */}
        {showForm && editingAd && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {editingAd.id ? '광고 수정' : '새 광고 추가'}
            </h2>
            <form onSubmit={handleSaveAd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">제목</label>
                <input
                  type="text"
                  value={editingAd.title || ''}
                  onChange={(e) => setEditingAd({ ...editingAd, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">설명</label>
                <textarea
                  value={editingAd.description || ''}
                  onChange={(e) => setEditingAd({ ...editingAd, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  이미지
                </label>

                {/* 파일 업로드 */}
                <div className="mb-3">
                  <label className="cursor-pointer inline-flex items-center justify-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
                    <span>📁 이미지 파일 선택</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  {selectedFile && (
                    <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
                      {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)}KB)
                    </span>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    권장: 배너 728x90px 또는 300x250px, 최대 5MB
                  </p>
                </div>

                {/* 이미지 미리보기 */}
                {(imagePreview || editingAd.image_url) && (
                  <div className="mb-3 border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">미리보기:</p>
                    <img
                      src={imagePreview || editingAd.image_url || ''}
                      alt="Preview"
                      className="max-w-full max-h-48 rounded"
                    />
                  </div>
                )}

                {/* URL 직접 입력 */}
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">또는 이미지 URL 직접 입력:</div>
                <input
                  type="url"
                  value={editingAd.image_url || ''}
                  onChange={(e) => {
                    setEditingAd({ ...editingAd, image_url: e.target.value })
                    setSelectedFile(null)
                    setImagePreview(null)
                  }}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">링크 URL</label>
                <input
                  type="url"
                  value={editingAd.link_url || ''}
                  onChange={(e) => setEditingAd({ ...editingAd, link_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">위치</label>
                  <select
                    value={editingAd.position || 'banner-top'}
                    onChange={(e) => setEditingAd({ ...editingAd, position: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="banner-top">상단 배너 (728x90 권장)</option>
                    <option value="banner-bottom">하단 배너 (728x90 권장)</option>
                    <option value="sidebar">사이드바 (300x250 권장)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">우선순위</label>
                  <input
                    type="number"
                    value={editingAd.priority || 0}
                    onChange={(e) => setEditingAd({ ...editingAd, priority: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingAd.is_active !== false}
                    onChange={(e) => setEditingAd({ ...editingAd, is_active: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">활성화</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={uploadingImage}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
                >
                  {uploadingImage ? '업로드 중...' : '저장'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingAd(null)
                    setSelectedFile(null)
                    setImagePreview(null)
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 광고 목록 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-900 dark:text-white">로딩 중...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-900 dark:text-white">제목</th>
                  <th className="px-4 py-3 text-left text-gray-900 dark:text-white">위치</th>
                  <th className="px-4 py-3 text-left text-gray-900 dark:text-white">우선순위</th>
                  <th className="px-4 py-3 text-left text-gray-900 dark:text-white">노출/클릭</th>
                  <th className="px-4 py-3 text-left text-gray-900 dark:text-white">상태</th>
                  <th className="px-4 py-3 text-left text-gray-900 dark:text-white">작업</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => (
                  <tr key={ad.id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{ad.title}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{ad.position}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{ad.priority}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                      {ad.view_count} / {ad.click_count}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          ad.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {ad.is_active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setEditingAd(ad)
                          setShowForm(true)
                          setSelectedFile(null)
                          setImagePreview(null)
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeleteAd(ad.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 설정 안내 */}
        <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h3 className="font-bold text-yellow-800 dark:text-yellow-200 mb-2">⚠️ 이미지 업로드 설정</h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            이미지 파일 업로드를 사용하려면 Supabase 대시보드에서 "ad-images" Storage 버킷을 먼저 생성해주세요.
            <br />
            버킷 설정: Public 버킷, 최대 파일 크기 5MB
          </p>
        </div>
      </div>
    </div>
  )
}
