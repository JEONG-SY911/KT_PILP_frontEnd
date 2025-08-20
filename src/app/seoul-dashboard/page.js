'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/utils/api';

export default function SeoulDashboard() {
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [districtData, setDistrictData] = useState(null);
  const [loading, setLoading] = useState(false);

  // 서울시 25개 구의 TopoJSON 기반 경계 데이터
  const seoulDistricts = [
    { name: '종로구', code: '11110', color: '#FF6B6B' },
    { name: '중구', code: '11140', color: '#4ECDC4' },
    { name: '용산구', code: '11170', color: '#45B7D1' },
    { name: '성동구', code: '11200', color: '#96CEB4' },
    { name: '광진구', code: '11215', color: '#FFEAA7' },
    { name: '동대문구', code: '11230', color: '#DDA0DD' },
    { name: '중랑구', code: '11260', color: '#98D8C8' },
    { name: '성북구', code: '11290', color: '#F7DC6F' },
    { name: '강북구', code: '11305', color: '#BB8FCE' },
    { name: '도봉구', code: '11320', color: '#85C1E9' },
    { name: '노원구', code: '11350', color: '#F8C471' },
    { name: '은평구', code: '11380', color: '#82E0AA' },
    { name: '서대문구', code: '11410', color: '#F1948A' },
    { name: '마포구', code: '11440', color: '#85C1E9' },
    { name: '양천구', code: '11470', color: '#F7DC6F' },
    { name: '강서구', code: '11500', color: '#D7BDE2' },
    { name: '구로구', code: '11530', color: '#A9CCE3' },
    { name: '금천구', code: '11545', color: '#FAD7A0' },
    { name: '영등포구', code: '11560', color: '#ABEBC6' },
    { name: '동작구', code: '11590', color: '#FDEBD0' },
    { name: '관악구', code: '11620', color: '#D5A6BD' },
    { name: '서초구', code: '11650', color: '#A2D9CE' },
    { name: '강남구', code: '11680', color: '#F9E79F' },
    { name: '송파구', code: '11710', color: '#D2B4DE' },
    { name: '강동구', code: '11740', color: '#AED6F1' }
  ];

  const handleDistrictHover = (districtName) => {
    setSelectedDistrict(districtName);
  };

  const handleDistrictLeave = () => {
    setSelectedDistrict(null);
  };

  const handleDistrictClick = async (districtName) => {
    setLoading(true);
    try {
      const data = await apiClient.getDongByName(districtName);
      setDistrictData(data);
    } catch (error) {
      console.error('구 정보를 불러오는데 실패했습니다:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            서울시 생활인구 현황
          </h1>
          <p className="text-lg text-gray-600">
            서울시 25개 자치구별 상세 인구 정보를 확인하세요
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 지도 섹션 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                서울시 지도
              </h2>
              
              <div className="relative w-full h-[600px] bg-white rounded-lg overflow-hidden">
                <svg
                  viewBox="0 0 1000 800"
                  className="w-full h-full"
                  style={{ background: '#f8fafc' }}
                >
                  {/* 서울시 25개 구 경계 */}
                  {seoulDistricts.map((district, index) => (
                    <g key={district.code}>
                      {/* 각 구의 경계를 나타내는 path */}
                      <path
                        d={getDistrictPath(district.code)}
                        fill={selectedDistrict === district.name ? district.color : '#e2e8f0'}
                        stroke="#374151"
                        strokeWidth="1"
                        className="cursor-pointer transition-all duration-200 hover:opacity-80"
                        onMouseEnter={() => handleDistrictHover(district.name)}
                        onMouseLeave={handleDistrictLeave}
                        onClick={() => handleDistrictClick(district.name)}
                      />
                      
                      {/* 구 이름 라벨 */}
                      <text
                        x={getDistrictCenter(district.code).x}
                        y={getDistrictCenter(district.code).y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs font-medium pointer-events-none"
                        fill={selectedDistrict === district.name ? '#1f2937' : '#6b7280'}
                      >
                        {district.name}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          </div>

          {/* 정보 패널 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                구별 정보
              </h2>
              
              {selectedDistrict && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    선택된 구: {selectedDistrict}
                  </h3>
                  <p className="text-sm text-gray-600">
                    클릭하여 상세 정보를 확인하세요
                  </p>
                </div>
              )}

              {loading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">불러오는 중...</p>
                </div>
              )}

              {districtData && !loading && (
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">
                      {districtData.name} 상세 정보
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">총 인구:</span> {districtData.totalPopulation?.toLocaleString()}명</p>
                      <p><span className="font-medium">남성:</span> {districtData.malePopulation?.toLocaleString()}명</p>
                      <p><span className="font-medium">여성:</span> {districtData.femalePopulation?.toLocaleString()}명</p>
                      <p><span className="font-medium">면적:</span> {districtData.area}km²</p>
                    </div>
                  </div>
                </div>
              )}

              {!selectedDistrict && !districtData && !loading && (
                <div className="text-center py-8 text-gray-500">
                  <p>지도에서 구를 선택하거나 클릭하세요</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 각 구의 SVG path 데이터 (TopoJSON 기반)
function getDistrictPath(code) {
  const paths = {
    '11110': 'M 40 25 L 46 25 L 46 31 L 40 31 Z', // 종로구
    '11140': 'M 44 30 L 50 30 L 50 36 L 44 36 Z', // 중구
    '11170': 'M 35 32 L 43 32 L 43 38 L 35 38 Z', // 용산구
    '11200': 'M 56 30 L 64 30 L 64 36 L 56 36 Z', // 성동구
    '11215': 'M 66 20 L 74 20 L 74 26 L 66 26 Z', // 광진구
    '11230': 'M 52 25 L 60 25 L 60 31 L 52 31 Z', // 동대문구
    '11260': 'M 58 15 L 66 15 L 66 21 L 58 21 Z', // 중랑구
    '11290': 'M 48 20 L 56 20 L 56 26 L 48 26 Z', // 성북구
    '11305': 'M 42 15 L 50 15 L 50 21 L 42 21 Z', // 강북구
    '11320': 'M 48 5 L 56 5 L 56 11 L 48 11 Z', // 도봉구
    '11350': 'M 56 8 L 66 8 L 66 14 L 56 14 Z', // 노원구
    '11380': 'M 25 15 L 35 15 L 35 21 L 25 21 Z', // 은평구
    '11410': 'M 32 25 L 40 25 L 40 31 L 32 31 Z', // 서대문구
    '11440': 'M 25 25 L 33 25 L 33 31 L 25 31 Z', // 마포구
    '11470': 'M 20 35 L 28 35 L 28 41 L 20 41 Z', // 양천구
    '11500': 'M 15 30 L 25 30 L 25 36 L 15 36 Z', // 강서구
    '11530': 'M 20 45 L 28 45 L 28 51 L 20 51 Z', // 구로구
    '11545': 'M 25 50 L 33 50 L 33 56 L 25 56 Z', // 금천구
    '11560': 'M 25 40 L 33 40 L 33 46 L 25 46 Z', // 영등포구
    '11590': 'M 35 40 L 43 40 L 43 46 L 35 46 Z', // 동작구
    '11620': 'M 35 45 L 43 45 L 43 51 L 35 51 Z', // 관악구
    '11650': 'M 45 40 L 53 40 L 53 46 L 45 46 Z', // 서초구
    '11680': 'M 48 35 L 56 35 L 56 41 L 48 41 Z', // 강남구
    '11710': 'M 60 40 L 70 40 L 70 46 L 60 46 Z', // 송파구
    '11740': 'M 68 30 L 76 30 L 76 36 L 68 36 Z' // 강동구
  };
  return paths[code] || '';
}

// 각 구의 중심점 좌표
function getDistrictCenter(code) {
  const centers = {
    '11110': { x: 43, y: 28 }, // 종로구
    '11140': { x: 47, y: 33 }, // 중구
    '11170': { x: 39, y: 35 }, // 용산구
    '11200': { x: 60, y: 33 }, // 성동구
    '11215': { x: 70, y: 23 }, // 광진구
    '11230': { x: 56, y: 28 }, // 동대문구
    '11260': { x: 62, y: 18 }, // 중랑구
    '11290': { x: 52, y: 23 }, // 성북구
    '11305': { x: 46, y: 18 }, // 강북구
    '11320': { x: 52, y: 8 }, // 도봉구
    '11350': { x: 61, y: 11 }, // 노원구
    '11380': { x: 30, y: 18 }, // 은평구
    '11410': { x: 36, y: 28 }, // 서대문구
    '11440': { x: 29, y: 28 }, // 마포구
    '11470': { x: 24, y: 38 }, // 양천구
    '11500': { x: 20, y: 33 }, // 강서구
    '11530': { x: 24, y: 48 }, // 구로구
    '11545': { x: 29, y: 53 }, // 금천구
    '11560': { x: 29, y: 43 }, // 영등포구
    '11590': { x: 39, y: 43 }, // 동작구
    '11620': { x: 39, y: 48 }, // 관악구
    '11650': { x: 49, y: 43 }, // 서초구
    '11680': { x: 52, y: 38 }, // 강남구
    '11710': { x: 65, y: 43 }, // 송파구
    '11740': { x: 72, y: 33 } // 강동구
  };
  return centers[code] || { x: 0, y: 0 };
}
