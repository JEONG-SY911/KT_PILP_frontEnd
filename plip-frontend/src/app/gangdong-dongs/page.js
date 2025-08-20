'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

// 동적 임포트로 클라이언트 사이드 렌더링
const GangnamMapComponent = dynamic(() => import('@/components/GangnamMapComponent'), {
  ssr: false,
  loading: () => <div className="h-[85vh] bg-gray-100 flex items-center justify-center">지도를 불러오는 중...</div>
});

// 강동구 동별 데이터 (예시)
const gangdongDongs = [
  {
    id: "11740101",
    name: "강일동",
    population: 12340,
    area: 1.23,
    density: 10033,
    description: "강동구의 북동쪽에 위치한 주거지역"
  },
  {
    id: "11740102",
    name: "상일동",
    population: 15670,
    area: 1.45,
    density: 10807,
    description: "강동구의 중심지로 번화가와 주거지가 혼재"
  },
  {
    id: "11740103",
    name: "명일동",
    population: 18920,
    area: 1.67,
    density: 11329,
    description: "강동구의 서쪽에 위치한 상권 발달 지역"
  },
  {
    id: "11740104",
    name: "고덕동",
    population: 14230,
    area: 1.34,
    density: 10619,
    description: "한강변 고급 주거지역으로 유명"
  },
  {
    id: "11740105",
    name: "암사동",
    population: 16780,
    area: 2.12,
    density: 7915,
    description: "암사동 선사유적지가 위치한 역사적 지역"
  },
  {
    id: "11740106",
    name: "천호동",
    population: 19890,
    area: 1.89,
    density: 10524,
    description: "강동구의 중심 상권으로 번화가 발달"
  },
  {
    id: "11740107",
    name: "성내동",
    population: 14560,
    area: 1.56,
    density: 9333,
    description: "강동구청이 위치한 행정 중심지"
  },
  {
    id: "11740108",
    name: "길동",
    population: 13450,
    area: 1.78,
    density: 7556,
    description: "강동구의 남쪽에 위치한 주거지역"
  },
  {
    id: "11740109",
    name: "둔촌동",
    population: 17890,
    area: 2.34,
    density: 7645,
    description: "둔촌동 주공아파트 단지가 위치한 대규모 주거지역"
  }
];

export default function GangdongDongsPage() {
  const [selectedDong, setSelectedDong] = useState(null);
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 강동구 동별 GeoJSON 데이터 생성 (간단한 사각형 형태)
    const createGangdongDongsGeoJSON = () => {
      const center = [37.5504, 127.1470]; // 강동구 중심점
      
      const dongPositions = {
        "11740101": { offset: [-0.005, -0.015], name: "강일동" },
        "11740102": { offset: [-0.005, -0.005], name: "상일동" },
        "11740103": { offset: [0.010, -0.010], name: "명일동" },
        "11740104": { offset: [0.000, 0.000], name: "고덕동" },
        "11740105": { offset: [-0.010, 0.010], name: "암사동" },
        "11740106": { offset: [-0.020, 0.010], name: "천호동" },
        "11740107": { offset: [-0.020, -0.005], name: "성내동" },
        "11740108": { offset: [-0.030, 0.005], name: "길동" },
        "11740109": { offset: [-0.030, 0.015], name: "둔촌동" }
      };

      const features = Object.entries(dongPositions).map(([id, pos]) => {
        const lat = center[0] + pos.offset[0];
        const lng = center[1] + pos.offset[1];
        const size = 0.003;
        
        return {
          type: "Feature",
          properties: {
            id: id,
            name: pos.name,
            population: Math.floor(Math.random() * 20000) + 10000
          },
          geometry: {
            type: "Polygon",
            coordinates: [[
              [lng - size, lat - size],
              [lng + size, lat - size],
              [lng + size, lat + size],
              [lng - size, lat + size],
              [lng - size, lat - size]
            ]]
          }
        };
      });

      return {
        type: "FeatureCollection",
        features: features
      };
    };

    try {
      setLoading(true);
      const geoJSON = createGangdongDongsGeoJSON();
      
      // 실제 동별 데이터와 매칭
      const updatedFeatures = geoJSON.features.map(feature => {
        const dongData = gangdongDongs.find(dong => dong.id === feature.properties.id);
        return {
          ...feature,
          properties: {
            ...feature.properties,
            population: dongData ? dongData.population : feature.properties.population
          }
        };
      });
      
      setGeoJsonData({
        ...geoJSON,
        features: updatedFeatures
      });
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDongClick = (dongId) => {
    setSelectedDong(dongId);
  };

  const selectedDongData = selectedDong ? gangdongDongs.find(dong => dong.id === selectedDong) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">강동구 동별 데이터를 불러오는 중...</p>
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
                  <h1 className="text-xl font-bold text-gray-900">강동구 동별 생활인구 현황</h1>
                  <p className="text-sm text-gray-500">강동구 9개 동의 상세 정보</p>
                </div>
              </div>
            </div>
                         <div className="flex items-center space-x-4">
               <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                 🟢 실시간 데이터
               </div>
               <button
                 onClick={() => window.location.href = '/'}
                 className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
               >
                 ← 메인으로
               </button>
               <button
                 onClick={() => window.location.href = '/seoul-dashboard'}
                 className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
               >
                 ← 서울 대시보드
               </button>
             </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        {/* 페이지 제목 */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">강동구 동별 분석</h2>
          <p className="text-gray-600">지도를 클릭하여 각 동의 상세 정보를 확인하세요</p>
        </div>

        {/* 지도와 정보 패널 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* 지도 섹션 */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-lg shadow-lg p-2">
              <GangnamMapComponent
                geoJsonData={geoJsonData}
                selectedDong={selectedDong}
                onDongClick={handleDongClick}
              />
            </div>
          </div>

          {/* 동별 정보 패널 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">동별 정보</h3>
              
              {selectedDongData ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{selectedDongData.name}</h4>
                    <p className="text-sm text-gray-600">{selectedDongData.description}</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm text-blue-600 font-medium">총 인구</div>
                      <div className="text-lg font-bold text-blue-900">
                        {selectedDongData.population.toLocaleString()}명
                      </div>
                    </div>
                    
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-sm text-green-600 font-medium">면적</div>
                      <div className="text-lg font-bold text-green-900">
                        {selectedDongData.area}㎢
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="text-sm text-purple-600 font-medium">인구밀도</div>
                      <div className="text-lg font-bold text-purple-900">
                        {selectedDongData.density.toLocaleString()}명/㎢
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">🗺️</div>
                  <p className="text-gray-500 text-sm">지도에서 동을 선택하세요</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 동별 목록 */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">전체 동 목록</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {gangdongDongs.map((dong) => (
              <div
                key={dong.id}
                className={`bg-white rounded-lg shadow-md p-4 cursor-pointer transition-all hover:shadow-lg ${
                  selectedDong === dong.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => handleDongClick(dong.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{dong.name}</h4>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {dong.id.slice(-2)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{dong.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">인구:</span>
                    <span className="font-medium ml-1">{dong.population.toLocaleString()}명</span>
                  </div>
                  <div>
                    <span className="text-gray-500">면적:</span>
                    <span className="font-medium ml-1">{dong.area}㎢</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 통계 요약 */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">강동구 전체 통계</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-500">총 인구</div>
              <div className="text-2xl font-bold text-gray-900">
                {gangdongDongs.reduce((sum, dong) => sum + dong.population, 0).toLocaleString()}명
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-500">총 면적</div>
              <div className="text-2xl font-bold text-gray-900">
                {gangdongDongs.reduce((sum, dong) => sum + dong.area, 0).toFixed(2)}㎢
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-500">평균 인구밀도</div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(gangdongDongs.reduce((sum, dong) => sum + dong.population, 0) / 
                           gangdongDongs.reduce((sum, dong) => sum + dong.area, 0)).toLocaleString()}명/㎢
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-500">동 개수</div>
              <div className="text-2xl font-bold text-gray-900">{gangdongDongs.length}개</div>
            </div>
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h4 className="font-semibold mb-2">강동구 동별 생활인구 분석</h4>
            <p className="text-gray-400 text-sm">
              강동구 9개 동의 인구, 면적, 인구밀도 정보를 제공합니다
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
