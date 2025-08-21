'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { gangnamDongs } from '@/data/gangnamDongs';
import { loadDongTopoJSON, filterDongsByDistrict } from '@/utils/dongTopoJSON';
import Image from 'next/image';
import { apiClient } from '@/utils/api';

// 동적 임포트로 클라이언트 사이드 렌더링
const DongMapComponent = dynamic(() => import('@/components/DongMapComponent'), {
  ssr: false,
  loading: () => <div className="h-[85vh] bg-gray-100 flex items-center justify-center">지도를 불러오는 중...</div>
});

export default function GangnamDongsPage() {
  const [selectedDong, setSelectedDong] = useState(null);
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [isFavoriteMode, setIsFavoriteMode] = useState(false);
  const [favoriteMessage, setFavoriteMessage] = useState('');

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

    const loadGangnamDongsData = async () => {
      try {
        setLoading(true);
        setError(null);

        // topomap_dong.json에서 강남구 행정동 데이터 로드
        const allDongData = await loadDongTopoJSON();
        
        if (allDongData) {
          // 강남구 행정동만 필터링
          const gangnamDongData = filterDongsByDistrict(allDongData, '강남구');
          
          if (gangnamDongData && gangnamDongData.features.length > 0) {
                         // 실제 동별 데이터와 매칭
             const updatedFeatures = gangnamDongData.features.map(feature => {
               const properties = feature.properties;
               let dongName = properties.ADM_NM || properties.adm_nm || properties.dongName;
               
               // "서울특별시 강남구" 부분 제거하고 동 이름만 추출
               if (dongName && dongName.includes('서울특별시 강남구')) {
                 dongName = dongName.replace('서울특별시 강남구 ', '');
               }
               
               // 강남구 동별 데이터에서 매칭되는 동 찾기
               const dongData = gangnamDongs.find(dong => 
                 dong.name.includes(dongName) || dongName.includes(dong.name)
               );
               
               return {
                 ...feature,
                 properties: {
                   ...feature.properties,
                   id: dongData ? dongData.id : feature.properties.ADM_CD || feature.properties.adm_cd,
                   name: dongName,
                   population: dongData ? dongData.population : 0,
                   area: dongData ? dongData.area : 0,
                   density: dongData ? dongData.density : 0,
                   description: dongData ? dongData.description : ''
                 }
               };
             });
            
            setGeoJsonData({
              ...gangnamDongData,
              features: updatedFeatures
            });
            return;
          }
        }

        // 데이터 로드 실패 시 에러 처리
        console.error('강남구 행정동 데이터를 불러올 수 없습니다.');
        setError('강남구 행정동 데이터를 불러올 수 없습니다.');

      } catch (err) {
        console.error('강남구 동별 데이터 로드 오류:', err);
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadGangnamDongsData();
  }, []);

  const handleDongClick = (feature) => {
    const properties = feature.properties;
    let dongName = properties.ADM_NM || properties.adm_nm || properties.dongName;
    
    console.log('클릭된 동 정보:', properties);
    console.log('원본 동 이름:', dongName);
    
    // "서울특별시 강남구" 부분 제거하고 동 이름만 추출
    if (dongName && dongName.includes('서울특별시 강남구')) {
      dongName = dongName.replace('서울특별시 강남구 ', '');
    }
    
    console.log('정리된 동 이름:', dongName);
    
    // 즐겨찾기 모드인 경우 즐겨찾기 추가
    if (isFavoriteMode) {
      handleAddFavorite(dongName);
      setIsFavoriteMode(false); // 즐겨찾기 모드 해제
      return;
    }
    
    // 동 코드 찾기 (더 유연한 매칭)
    const dongData = gangnamDongs.find(dong => {
      const match1 = dong.name === dongName;
      const match2 = dong.name.includes(dongName) || dongName.includes(dong.name);
      const match3 = properties.id === dong.id;
      
      return match1 || match2 || match3;
    });
    
    console.log('찾은 동 데이터:', dongData);
    
    if (dongData) {
      // 상세 통계 페이지로 이동
      console.log('상세 통계 페이지로 이동:', `/detailed-stats?dong=${dongData.id}`);
      window.location.href = `/detailed-stats?dong=${dongData.id}`;
    } else {
      console.log('동 데이터를 찾을 수 없음');
      alert('해당 동의 정보를 찾을 수 없습니다.');
    }
  };

  // 즐겨찾기 추가 함수
  const handleAddFavorite = async (dongName) => {
    if (!isLoggedIn) {
      setFavoriteMessage('로그인이 필요합니다.');
      setTimeout(() => setFavoriteMessage(''), 3000);
      return;
    }

    try {
      const favoriteData = {
        adstrdCodeSe: `11680_${dongName}`, // 강남구 동별 코드
        dongName: dongName
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
      setFavoriteMessage(`${dongName} 동이(가) 즐겨찾기에 추가되었습니다!`);
      setTimeout(() => setFavoriteMessage(''), 3000);
    } catch (error) {
      console.error('즐겨찾기 추가 실패:', error);
      setFavoriteMessage('즐겨찾기 추가에 실패했습니다. (네트워크/서버 오류)');
      setTimeout(() => setFavoriteMessage(''), 3000);
    }
  };

  const selectedDongData = selectedDong ? gangnamDongs.find(dong => dong.name === selectedDong) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">강남구 동별 데이터를 불러오는 중...</p>
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
      <header className="bg-white border-b border-gray-100">
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
                Back to home
              </button>
              <div className="h-4 w-px bg-gray-200"></div>
              <div>
                <h1 className="text-xl font-semibold text-black">Gangnam Districts</h1>
                <p className="text-sm text-gray-600">Regional population analysis</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium border border-green-200">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Real-time data
                </div>
              </div>
              
              {/* 네비게이션 */}
              <nav className="hidden md:flex items-center gap-6">
                <button
                  onClick={() => window.location.href = '/seoul-dashboard'}
                  className="text-sm text-gray-600 hover:text-black transition-colors"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => window.location.href = '/gangnam-dongs'}
                  className="text-sm text-black font-medium"
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
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        {/* 즐겨찾기 메시지 */}
        {favoriteMessage && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
            favoriteMessage.includes('추가되었습니다') 
              ? 'bg-green-100 border border-green-400 text-green-700' 
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {favoriteMessage}
          </div>
        )}

        {/* 로그인 상태 표시 */}
        {!isLoggedIn && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-yellow-800 text-sm">
              💡 즐겨찾기 기능을 사용하려면 <a href="/" className="underline font-medium">로그인</a>이 필요합니다.
            </p>
          </div>
        )}

        {/* 페이지 제목 */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">강남구 동별 분석</h2>
          <p className="text-gray-600">지도에서 동을 클릭하여 각 동의 상세 통계를 확인하세요</p>
        </div>

        {/* 지도와 정보 패널 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 지도 섹션 */}
          <div className="lg:col-span-3">
            <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
              <h2 className="text-lg font-semibold text-black mb-4">
                강남구 행정동 지도
              </h2>
              
              <div className="relative w-full bg-white rounded-lg overflow-hidden h-96">
                <DongMapComponent
                  geoJsonData={geoJsonData}
                  selectedDong={selectedDong}
                  onDongClick={handleDongClick}
                  onDongHover={() => {}}
                />
              </div>
            </div>
          </div>

          {/* 동별 정보 패널 */}
          <div className="lg:col-span-1">
            <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
              <h2 className="text-lg font-semibold text-black mb-4">동별 정보</h2>
              
              {selectedDongData ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{selectedDongData.name}</h4>
                    <p className="text-sm text-gray-600">{selectedDongData.description}</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="text-sm font-medium text-gray-600 mb-1">총 인구</div>
                      <div className="text-2xl font-bold text-black">
                        {selectedDongData.population.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">명</div>
                    </div>
                    
                    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="text-sm font-medium text-gray-600 mb-1">면적</div>
                      <div className="text-2xl font-bold text-black">
                        {selectedDongData.area}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">㎢</div>
                    </div>
                    
                    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="text-sm font-medium text-gray-600 mb-1">인구밀도</div>
                      <div className="text-2xl font-bold text-black">
                        {selectedDongData.density.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">명/㎢</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">지도에서 동을 선택하세요</p>
                </div>
              )}

              {/* 즐겨찾기 모드 */}
              <div className="mt-4 space-y-4">
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
                    ? '동을 클릭하여 즐겨찾기 추가/제거' 
                    : '즐겨찾기 관리를 위해 활성화하세요'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>



        {/* 통계 요약 */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">강남구 전체 통계</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-500">총 인구</div>
              <div className="text-2xl font-bold text-gray-900">
                {gangnamDongs.reduce((sum, dong) => sum + dong.population, 0).toLocaleString()}명
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-500">총 면적</div>
              <div className="text-2xl font-bold text-gray-900">
                {gangnamDongs.reduce((sum, dong) => sum + dong.area, 0).toFixed(2)}㎢
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-500">평균 인구밀도</div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(gangnamDongs.reduce((sum, dong) => sum + dong.population, 0) / 
                           gangnamDongs.reduce((sum, dong) => sum + dong.area, 0)).toLocaleString()}명/㎢
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-500">동 개수</div>
              <div className="text-2xl font-bold text-gray-900">{gangnamDongs.length}개</div>
            </div>
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h4 className="font-semibold mb-2">강남구 동별 생활인구 분석</h4>
                         <p className="text-gray-400 text-sm">
               강남구 22개 동의 인구, 면적, 인구밀도 정보를 제공합니다
             </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

