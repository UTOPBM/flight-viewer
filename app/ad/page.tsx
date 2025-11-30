'use client';

import Link from 'next/link';

export default function AdSelectionPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans flex items-center justify-center">
      <div className="max-w-4xl w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">광고 슬롯 선택</h1>
        <p className="text-center text-gray-500 mb-12">원하시는 광고 위치를 선택해주세요.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Top Banner */}
          <Link href="/ad/top" className="group block">
            <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 h-full flex flex-col">
              <div className="h-40 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-6">
                <div className="w-full h-12 bg-white/20 rounded-md backdrop-blur-sm border border-white/30 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">Top Banner</span>
                </div>
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">상단 배너 광고</h3>
                <p className="text-gray-500 text-sm mb-4 flex-grow">
                  웹사이트 최상단에 고정되어 모든 방문자에게 가장 먼저 노출되는 프리미엄 영역입니다.
                </p>
                <div className="mt-auto">
                  <span className="inline-block px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    예약하기 &rarr;
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Bottom Banner */}
          <Link href="/ad/bottom" className="group block">
            <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 h-full flex flex-col">
              <div className="h-40 bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center p-6 relative">
                <div className="absolute bottom-6 w-3/4 h-10 bg-white/20 rounded-md backdrop-blur-sm border border-white/30 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">Bottom Banner</span>
                </div>
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">하단 배너 광고</h3>
                <p className="text-gray-500 text-sm mb-4 flex-grow">
                  컨텐츠 하단에 위치하여 방문자가 정보를 모두 확인한 후 자연스럽게 노출됩니다.
                </p>
                <div className="mt-auto">
                  <span className="inline-block px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-bold group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    예약하기 &rarr;
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Newsletter Banner */}
          <Link href="/ad/newsletter" className="group block">
            <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 h-full flex flex-col">
              <div className="h-40 bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center p-6">
                <div className="w-16 h-20 bg-white/20 rounded-md backdrop-blur-sm border border-white/30 flex flex-col items-center justify-center gap-1">
                  <div className="w-10 h-1 bg-white/40 rounded-full"></div>
                  <div className="w-10 h-1 bg-white/40 rounded-full"></div>
                  <div className="w-10 h-8 bg-white/60 rounded mt-1"></div>
                </div>
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">뉴스레터 광고</h3>
                <p className="text-gray-500 text-sm mb-4 flex-grow">
                  매일 아침 발송되는 뉴스레터에 포함되어 구독자들에게 직접 전달됩니다.
                </p>
                <div className="mt-auto">
                  <span className="inline-block px-4 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-bold group-hover:bg-orange-600 group-hover:text-white transition-colors">
                    예약하기 &rarr;
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
