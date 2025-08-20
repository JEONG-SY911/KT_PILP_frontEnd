'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { loadDongTopoJSON, filterDongsByDistrict } from '@/utils/dongTopoJSON';

// 동적 임포트로 Leaflet 컴포넌트 로드
const DongMapComponent = dynamic(() => import('@/components/DongMapComponent'), {
  ssr: false,
  loading: () => (
    <div style={{ 
      height: '600px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
        <p style={{ color: '#6c757d', margin: 0 }}>지도를 불러오는 중...</p>
      </div>
    </div>
  )
});

export default function DongMapPage() {
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [selectedDong, setSelectedDong] = useState(null);
  const [hoveredDong, setHoveredDong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState('강남구');

  // 행정동 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await loadDongTopoJSON();
        if (data) {
          setGeoJsonData(data);
        } else {
          setError('행정동 데이터를 불러올 수 없습니다.');
        }
      } catch (err) {
        console.error('행정동 데이터 로드 오류:', err);
        setError('행정동 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 선택된 구에 따라 행정동 필터링
  const filteredData = geoJsonData ? filterDongsByDistrict(geoJsonData, selectedDistrict) : null;

  // 행정동 클릭 핸들러
  const handleDongClick = (feature) => {
    const properties = feature.properties;
    const dongName = properties.ADM_NM || properties.adm_nm || properties.dongName;
    const dongCode = properties.ADM_CD || properties.adm_cd || properties.dongCode;
    
    setSelectedDong(dongName);
    
    console.log('선택된 행정동:', {
      name: dongName,
      code: dongCode,
      properties: properties
    });
  };

  // 행정동 호버 핸들러
  const handleDongHover = (feature, isHovering) => {
    if (isHovering) {
      const properties = feature.properties;
      const dongName = properties.ADM_NM || properties.adm_nm || properties.dongName;
      setHoveredDong(dongName);
    } else {
      setHoveredDong(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">행정동 지도를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-700 mb-2">데이터 로드 오류</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => window.location.href = '/'}
                  className="hover:opacity-80 transition-opacity"
                >
                  <Image
                    src="/data/KT_CI/KT CI 활용파일 (JPEG, PNG)/01_KT Wordmark (Standard)_01.jpg"
                    alt="KT 로고"
                    width={50}
                    height={50}
                    className="rounded-lg cursor-pointer"
                  />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">행정동 지도</h1>
                  <p className="text-sm text-gray-500">상세한 행정동 구역 정보</p>
                </div>
              </div>
            </div>
                         <div className="flex items-center space-x-4">
               <Link 
                 href="/"
                 className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
               >
                 ← 메인으로
               </Link>
               <Link 
                 href="/seoul-dashboard"
                 className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
               >
                 ← 서울 대시보드
               </Link>
             </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 컨트롤 패널 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">지도 컨트롤</h2>
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">구 선택:</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="강남구">강남구</option>
                <option value="강동구">강동구</option>
                <option value="강북구">강북구</option>
                <option value="강서구">강서구</option>
                <option value="관악구">관악구</option>
                <option value="광진구">광진구</option>
                <option value="구로구">구로구</option>
                <option value="금천구">금천구</option>
                <option value="노원구">노원구</option>
                <option value="도봉구">도봉구</option>
                <option value="동대문구">동대문구</option>
                <option value="동작구">동작구</option>
                <option value="마포구">마포구</option>
                <option value="서대문구">서대문구</option>
                <option value="서초구">서초구</option>
                <option value="성동구">성동구</option>
                <option value="성북구">성북구</option>
                <option value="송파구">송파구</option>
                <option value="양천구">양천구</option>
                <option value="영등포구">영등포구</option>
                <option value="용산구">용산구</option>
                <option value="은평구">은평구</option>
                <option value="종로구">종로구</option>
                <option value="중구">중구</option>
                <option value="중랑구">중랑구</option>
              </select>
            </div>
          </div>
          
          {/* 상태 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium">선택된 행정동</div>
              <div className="text-lg font-semibold text-blue-900">
                {selectedDong || '없음'}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium">호버된 행정동</div>
              <div className="text-lg font-semibold text-green-900">
                {hoveredDong || '없음'}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 font-medium">표시된 구</div>
              <div className="text-lg font-semibold text-purple-900">
                {selectedDistrict}
              </div>
            </div>
          </div>
        </div>

        {/* 지도 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">행정동 지도</h2>
          <DongMapComponent
            geoJsonData={filteredData}
            selectedDong={selectedDong}
            onDongClick={handleDongClick}
            onDongHover={handleDongHover}
            height="600px"
            width="100%"
          />
        </div>

        {/* 정보 패널 */}
        {selectedDong && (
          <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedDong} 상세 정보
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">기본 정보</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">행정동명:</span>
                    <span className="font-medium">{selectedDong}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">소속 구:</span>
                    <span className="font-medium">{selectedDistrict}</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">액션</h3>
                <div className="space-y-2">
                  <button className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    상세 인구 정보 보기
                  </button>
                  <button className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    즐겨찾기 추가
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h4 className="font-semibold mb-2">PLIP 행정동 지도</h4>
            <p className="text-gray-400 text-sm">
              상세한 행정동 구역 정보를 제공합니다
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
