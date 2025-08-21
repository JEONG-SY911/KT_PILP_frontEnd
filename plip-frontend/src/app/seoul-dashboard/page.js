'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/utils/api';
import * as topojson from 'topojson-client';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { getDistrictData, getSeoulTotalStats } from '@/utils/seoulDistrictsData';

// MapComponent를 동적으로 import (SSR 비활성화)
const MapComponent = dynamic(() => import('@/components/MapComponent'), { 
  ssr: false,
  loading: () => <div className="h-[85vh] bg-gray-200 rounded-lg flex items-center justify-center">지도를 불러오는 중...</div>
});

export default function SeoulDashboard() {
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [districtData, setDistrictData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [favoriteMessage, setFavoriteMessage] = useState('');
  const [favoriteStatuses, setFavoriteStatuses] = useState({});
  const [hoveredDistrict, setHoveredDistrict] = useState(null);
  const [isFavoriteMode, setIsFavoriteMode] = useState(false);

  useEffect(() => {
    // 로그인 상태 확인
    const savedLoginState = localStorage.getItem('isLoggedIn');
    const savedUserInfo = localStorage.getItem('userInfo');
    
    if (savedLoginState === 'true' && savedUserInfo) {
      try {
        const userInfo = JSON.parse(savedUserInfo);
        setIsLoggedIn(true);
        setUserInfo(userInfo);
      } catch (error) {
        console.error('사용자 정보 파싱 오류:', error);
      }
    }

    // TopoJSON 데이터 로드
    fetch('/data/topomap.json')
      .then((res) => res.json())
      .then((topoJson) => {
        // TopoJSON을 GeoJSON으로 변환
        const convertedGeoJson = topojson.feature(topoJson, topoJson.objects['서울시 자치구 경계3']);
        setGeoJsonData(convertedGeoJson);
      })
      .catch((error) => console.error('TopoJSON 로딩 중 오류:', error));
  }, []);

  // 즐겨찾기 상태 초기화
  useEffect(() => {
    const loadFavoriteStatuses = async () => {
      if (!isLoggedIn) {
        console.log('로그인되지 않음 - 즐겨찾기 상태 로드 건너뜀');
        return;
      }

      try {
        const statuses = {};
        const districtNames = Object.keys(districtCodes);
        
        console.log('즐겨찾기 상태 로드 시작:', districtNames);
        
        // 각 구의 즐겨찾기 상태를 병렬로 확인
        const promises = districtNames.map(async (districtName) => {
          const adstrdCodeSe = districtCodes[districtName];
          try {
            const isFavorite = await apiClient.checkFavoriteStatus(adstrdCodeSe);
            console.log(`${districtName} 즐겨찾기 상태:`, isFavorite);
            return { districtName, isFavorite };
          } catch (error) {
            console.error(`${districtName} 즐겨찾기 상태 확인 실패:`, error);
            return { districtName, isFavorite: false };
          }
        });

        const results = await Promise.all(promises);
        results.forEach(({ districtName, isFavorite }) => {
          statuses[districtName] = isFavorite;
        });

        console.log('최종 즐겨찾기 상태:', statuses);
        setFavoriteStatuses(statuses);
      } catch (error) {
        console.error('즐겨찾기 상태 로드 실패:', error);
        // 에러가 발생해도 기본 상태 설정
        const defaultStatuses = {};
        Object.keys(districtCodes).forEach(districtName => {
          defaultStatuses[districtName] = false;
        });
        setFavoriteStatuses(defaultStatuses);
      }
    };

    loadFavoriteStatuses();
  }, [isLoggedIn]);

  // 메시지 이벤트 리스너 추가
  useEffect(() => {
    const handleMessage = async (event) => {
      if (event.data.type === 'districtClick') {
        handleDistrictClick(event.data.districtName);
      } else if (event.data.type === 'districtHover') {
        console.log('구 호버됨:', event.data.districtName);
        setHoveredDistrict(event.data.districtName);
        setSelectedDistrict(event.data.districtName);
      } else if (event.data.type === 'districtLeave') {
        console.log('구 호버 해제:', event.data.districtName);
        setHoveredDistrict(null);
        setSelectedDistrict(null);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isLoggedIn, userInfo, isFavoriteMode]);

  const handleDistrictHover = (districtName) => {
    setSelectedDistrict(districtName);
    setHoveredDistrict(districtName);
  };

  const handleDistrictLeave = () => {
    setSelectedDistrict(null);
    setHoveredDistrict(null);
  };

  // 하트 버튼 클릭 핸들러
  const handleHeartClick = async (districtName) => {
    const isFavorite = favoriteStatuses[districtName] || false;
    if (isFavorite) {
      await handleRemoveFavorite(districtName);
    } else {
      await handleAddFavorite(districtName);
    }
  };

  // 구별 행정동 코드 매핑 (실제 데이터에 맞게 수정 필요)
  const districtCodes = {
    '강남구': '11680',
    '강동구': '11740',
    '강북구': '11305',
    '강서구': '11500',
    '관악구': '11620',
    '광진구': '11215',
    '구로구': '11530',
    '금천구': '11545',
    '노원구': '11350',
    '도봉구': '11320',
    '동대문구': '11230',
    '동작구': '11590',
    '마포구': '11440',
    '서대문구': '11410',
    '서초구': '11650',
    '성동구': '11200',
    '성북구': '11290',
    '송파구': '11710',
    '양천구': '11470',
    '영등포구': '11560',
    '용산구': '11170',
    '은평구': '11380',
    '종로구': '11110',
    '중구': '11140',
    '중랑구': '11260'
  };

  // 즐겨찾기 추가 함수
  const handleAddFavorite = async (districtName) => {
    if (!isLoggedIn) {
      setFavoriteMessage('로그인이 필요합니다.');
      setTimeout(() => setFavoriteMessage(''), 3000);
      return;
    }

    try {
      const adstrdCodeSe = districtCodes[districtName];
      if (!adstrdCodeSe) {
        setFavoriteMessage('지원하지 않는 구입니다.');
        setTimeout(() => setFavoriteMessage(''), 3000);
        return;
      }

      const favoriteData = {
        adstrdCodeSe: adstrdCodeSe,
        dongName: districtName
      };

      try {
        await apiClient.addFavorite(favoriteData);
      } catch (e) {
        if (e.status === 401) {
          setFavoriteMessage('세션이 만료되었거나 로그인되지 않았습니다. 다시 로그인해주세요.');
          setTimeout(() => setFavoriteMessage(''), 3000);
          return;
        }
        throw e;
      }
      setFavoriteStatuses(prev => ({ ...prev, [districtName]: true }));
      setFavoriteMessage(`${districtName}이(가) 즐겨찾기에 추가되었습니다!`);
      setTimeout(() => setFavoriteMessage(''), 3000);
    } catch (error) {
      console.error('즐겨찾기 추가 실패:', error);
      setFavoriteMessage('즐겨찾기 추가에 실패했습니다. (네트워크/서버 오류)');
      setTimeout(() => setFavoriteMessage(''), 3000);
    }
  };

  // 즐겨찾기 해제 함수
  const handleRemoveFavorite = async (districtName) => {
    if (!isLoggedIn) {
      setFavoriteMessage('로그인이 필요합니다.');
      setTimeout(() => setFavoriteMessage(''), 3000);
      return;
    }

    try {
      const adstrdCodeSe = districtCodes[districtName];
      if (!adstrdCodeSe) {
        setFavoriteMessage('지원하지 않는 구입니다.');
        setTimeout(() => setFavoriteMessage(''), 3000);
        return;
      }

      await apiClient.deleteFavorite(adstrdCodeSe);
      setFavoriteStatuses(prev => ({ ...prev, [districtName]: false }));
      setFavoriteMessage(`${districtName}이(가) 즐겨찾기에서 제거되었습니다.`);
      setTimeout(() => setFavoriteMessage(''), 3000);
    } catch (error) {
      console.error('즐겨찾기 해제 실패:', error);
      setFavoriteMessage('즐겨찾기 해제에 실패했습니다.');
      setTimeout(() => setFavoriteMessage(''), 3000);
    }
  };

  // 구별 상세 페이지로 이동하는 함수
  const handleDistrictClick = (districtName) => {
    console.log(`${districtName} 구 클릭됨`);
    
    // 즐겨찾기 모드인 경우 즐겨찾기 추가
    if (isFavoriteMode) {
      handleHeartClick(districtName);
      setIsFavoriteMode(false); // 즐겨찾기 모드 해제
      return;
    }
    
    console.log(`${districtName} 구 클릭됨 - 상세 페이지로 이동`);
    
    // 구별 상세 페이지 URL 매핑
    const districtUrls = {
      '강남구': '/gangnam-dongs',
      '강동구': '/gangdong-dongs',
      '강북구': '/gangbuk-dongs',
      '강서구': '/gangseo-dongs',
      '관악구': '/gwanak-dongs',
      '광진구': '/gwangjin-dongs',
      '구로구': '/guro-dongs',
      '금천구': '/geumcheon-dongs',
      '노원구': '/nowon-dongs',
      '도봉구': '/dobong-dongs',
      '동대문구': '/dongdaemun-dongs',
      '동작구': '/dongjak-dongs',
      '마포구': '/mapo-dongs',
      '서대문구': '/seodaemun-dongs',
      '서초구': '/seocho-dongs',
      '성동구': '/seongdong-dongs',
      '성북구': '/seongbuk-dongs',
      '송파구': '/songpa-dongs',
      '양천구': '/yangcheon-dongs',
      '영등포구': '/yeongdeungpo-dongs',
      '용산구': '/yongsan-dongs',
      '은평구': '/eunpyeong-dongs',
      '종로구': '/jongno-dongs',
      '중구': '/jung-dongs',
      '중랑구': '/jungnang-dongs'
    };

    const targetUrl = districtUrls[districtName];
    
    if (targetUrl) {
      // 해당 구의 상세 페이지로 이동
      window.location.href = targetUrl;
    } else {
      // 아직 구현되지 않은 구의 경우 임시 처리
      alert(`${districtName}의 상세 페이지는 준비 중입니다.`);
      console.log(`${districtName} 구 상세 페이지 미구현`);
    }
  };

  if (!geoJsonData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">지도 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.href = '/'}
                className="gap-2 text-gray-600 hover:text-gray-900 transition-colors flex items-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                홈으로 돌아가기
              </button>
              <div className="h-4 w-px bg-gray-200"></div>
              <div>
                <h1 className="text-xl font-semibold text-black">서울시 대시보드</h1>
                <p className="text-sm text-gray-600">자치구별 생활인구 현황</p>
              </div>
            </div>
            
            {/* 네비게이션 */}
            <nav className="hidden md:flex items-center gap-6">
              <button
                onClick={() => window.location.href = '/seoul-dashboard'}
                className="text-sm text-black font-medium"
              >
                Dashboard
              </button>
              <button
                onClick={() => window.location.href = '/gangnam-dongs'}
                className="text-sm text-gray-600 hover:text-black transition-colors"
              >
                Regional Analysis
              </button>
              <button
                onClick={() => window.location.href = '/detailed-stats'}
                className="text-sm text-gray-600 hover:text-black transition-colors"
              >
                Analytics
              </button>
              <button
                onClick={() => window.location.href = '/comparison-analysis'}
                className="text-sm text-gray-600 hover:text-black transition-colors"
              >
                비교분석
              </button>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* 즐겨찾기 메시지 */}
        {favoriteMessage && (
          <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-lg text-sm font-medium ${
            favoriteMessage.includes('추가되었습니다') 
              ? 'bg-green-100 border border-green-400 text-green-700' 
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {favoriteMessage}
          </div>
        )}

        {/* 로그인 안내 */}
        {!isLoggedIn && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              즐겨찾기 기능을 사용하려면 로그인이 필요합니다. <a href="/" className="underline font-medium hover:text-blue-900">홈페이지로 이동</a>
            </p>
          </div>
        )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 지도 섹션 */}
          <div className="lg:col-span-2">
            <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
              <h2 className="text-lg font-semibold text-black mb-4">
                서울시 자치구 지도
              </h2>
              
              <div className="relative w-full bg-white rounded-lg overflow-hidden h-96">
                <MapComponent 
                  geoJsonData={geoJsonData}
                  selectedDistrict={selectedDistrict}
                  onDistrictClick={handleDistrictClick}
                  favoriteStatuses={favoriteStatuses}
                />
              </div>
            </div>
          </div>

          {/* 정보 패널 */}
          <div className="lg:col-span-1">
            <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
              <h2 className="text-lg font-semibold text-black mb-4">
                자치구 정보
              </h2>
                
                {selectedDistrict && (() => {
                  const districtData = getDistrictData(selectedDistrict);
                  return (
                    <div className="space-y-4">
                      <div className="text-center">
                        <h4 className="text-xl font-bold text-gray-900 mb-2">{selectedDistrict}</h4>
                        <p className="text-sm text-gray-600">클릭하여 상세 정보를 확인하세요</p>
                      </div>
                      
                      {districtData && (
                        <div className="space-y-3">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="text-sm text-blue-600 font-medium">총 인구</div>
                            <div className="text-lg font-bold text-blue-900">
                              {districtData.population.toLocaleString()}명
                            </div>
                          </div>
                          
                          <div className="bg-green-50 p-3 rounded-lg">
                            <div className="text-sm text-green-600 font-medium">면적</div>
                            <div className="text-lg font-bold text-green-900">
                              {districtData.area}㎢
                            </div>
                          </div>
                          
                          <div className="bg-orange-50 p-3 rounded-lg">
                            <div className="text-sm text-orange-600 font-medium">인구밀도</div>
                            <div className="text-lg font-bold text-orange-900">
                              {districtData.density.toLocaleString()}명/㎢
                            </div>
                          </div>
                          

                          
                          <button
                            onClick={() => window.location.href = `/detailed-stats?dong=${selectedDistrict}`}
                            className="w-full bg-gray-900 hover:bg-black text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                          >
                            상세 통계 보기
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {!selectedDistrict && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">지도에서 자치구를 선택하세요</p>
                  </div>
                )}

                {/* 선택된 구 즐겨찾기 상태 */}
                {selectedDistrict && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-xs font-medium text-gray-700 mb-2 text-center">
                      {selectedDistrict} 즐겨찾기 상태
                    </h3>
                    <div className="text-center">
                      <p className="text-sm font-medium text-black">
                        {favoriteStatuses[selectedDistrict] ? '즐겨찾기됨' : '즐겨찾기 안됨'}
                      </p>
                    </div>
                  </div>
                )}

                {/* 즐겨찾기 모드 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-black">즐겨찾기 모드</h3>
                    <button
                      onClick={() => setIsFavoriteMode(!isFavoriteMode)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        isFavoriteMode
                          ? 'bg-gray-900 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      disabled={!isLoggedIn}
                    >
                      {isFavoriteMode ? '활성화' : '비활성화'}
                    </button>
                  </div>
                  
                  {!isLoggedIn && (
                    <p className="text-xs text-gray-500">
                      즐겨찾기 기능은 로그인이 필요합니다
                    </p>
                  )}
                  
                  <p className="text-xs text-gray-600">
                    {isFavoriteMode 
                      ? '자치구를 클릭하여 즐겨찾기 추가/제거' 
                      : '즐겨찾기 관리를 위해 활성화하세요'
                    }
                  </p>
                </div>
               </div>
             </div>
        </div>

        {/* 서울시 전체 통계 */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-black mb-4">서울시 전체 통계 (2024년 기준)</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {(() => {
              const seoulStats = getSeoulTotalStats();
              return (
                <>
                  <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
                    <div className="text-sm text-gray-500">총 인구</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {seoulStats.totalPopulation.toLocaleString()}명
                    </div>
                  </div>
                  <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
                    <div className="text-sm text-gray-500">총 면적</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {seoulStats.totalArea}㎢
                    </div>
                  </div>
                  <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
                    <div className="text-sm text-gray-500">평균 인구밀도</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {seoulStats.averageDensity.toLocaleString()}명/㎢
                    </div>
                  </div>
                  <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
                    <div className="text-sm text-gray-500">자치구 수</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {seoulStats.districtCount}개구
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* 사용 안내 */}
        <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-black mb-2">사용 방법</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• 지도에서 자치구에 마우스를 올리면 선택됩니다</li>
                <li>• 즐겨찾기 모드를 활성화하여 즐겨찾기를 추가/제거하세요</li>
                <li>• 일반 모드에서 자치구를 클릭하면 상세 정보를 확인할 수 있습니다</li>
                <li>• 즐겨찾기 저장을 위해서는 로그인이 필요합니다</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
