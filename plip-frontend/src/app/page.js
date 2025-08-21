'use client';

import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/utils/api';
import Link from 'next/link';
import Image from 'next/image';

// 간단한 스크롤 애니메이션 훅
const useScrollAnimation = () => {
  const [visibleElements, setVisibleElements] = useState(new Set());
  
  useEffect(() => {
    // 클라이언트에서만 실행
    if (typeof window === 'undefined') return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id) {
            setVisibleElements(prev => new Set(prev).add(entry.target.id));
          }
        });
      },
      { 
        threshold: 0.1,
        rootMargin: '0px'
      }
    );

    // 약간의 지연을 두고 요소들 관찰 시작
    const timer = setTimeout(() => {
      const animatedElements = document.querySelectorAll('[data-animate]');
      animatedElements.forEach((el) => {
        if (el.id) observer.observe(el);
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  return visibleElements;
};

export default function Home() {
  const [homeData, setHomeData] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 스크롤 애니메이션 훅 제거됨
  
  // 로그인/회원가입 상태 관리
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    // 페이지 로드 시 로컬 스토리지에서 로그인 상태 확인
    if (typeof window !== 'undefined') {
      const savedLoginState = localStorage.getItem('isLoggedIn');
      return savedLoginState === 'true';
    }
    return false;
  });
  const [userInfo, setUserInfo] = useState(() => {
    // 페이지 로드 시 로컬 스토리지에서 사용자 정보 확인
    if (typeof window !== 'undefined') {
      const savedUserInfo = localStorage.getItem('userInfo');
      if (savedUserInfo && savedUserInfo !== 'undefined' && savedUserInfo !== 'null') {
        try {
          return JSON.parse(savedUserInfo);
        } catch (error) {
          console.error('사용자 정보 파싱 오류:', error);
          return null;
        }
      }
      return null;
    }
    return null;
  });
  
  // 폼 데이터 상태
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });
  const [signupForm, setSignupForm] = useState({
    username: '',
    password: '',
    email: '',
    nickname: '',
    confirmPassword: ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  
  // 인구 변화 데이터 상태
  const [populationChangeData, setPopulationChangeData] = useState(null);
  
  // 강남구 특정 동 코드들
  const gangnamDongCodes = [
    "11680600",
    "11680610", 
    "11680630",
    "11680640",
    "11680650",
    "11680565",
    "11680510",
    "11680545"
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 6일 전 날짜를 YYYYMMDD 형식으로 변환
        const sixDaysAgo = new Date();
        sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
        const dateString = sixDaysAgo.getFullYear().toString() + 
                          String(sixDaysAgo.getMonth() + 1).padStart(2, '0') + 
                          String(sixDaysAgo.getDate()).padStart(2, '0');
        
        const [homeResponse, healthResponse, multiplePopulationChangeResponse] = await Promise.all([
          apiClient.getHomeData(),
          apiClient.getHealth(),
          apiClient.getMultiplePopulationChange(gangnamDongCodes, dateString)
        ]);
        
        // 여러 동의 데이터를 합산
        let aggregatedData = null;
        console.log('API 응답 데이터:', multiplePopulationChangeResponse);
        
        if (multiplePopulationChangeResponse && multiplePopulationChangeResponse.length > 0) {
          console.log('개별 동 데이터:');
          multiplePopulationChangeResponse.forEach((data, index) => {
            console.log(`동 ${index + 1}:`, {
              dongCode: data.adstrdCodeSe,
              dongName: data.dongName,
              currentTotalPopulation: data.currentTotalPopulation,
              previousTotalPopulation: data.previousTotalPopulation,
              totalPopulationChange: data.totalPopulationChange,
              totalPopulationChangeRate: data.totalPopulationChangeRate
            });
          });
          
          const totalCurrentPopulation = multiplePopulationChangeResponse.reduce((sum, data) => {
            const current = data.currentTotalPopulation || 0;
            console.log(`동 ${data.dongName}: 현재 인구 ${current} 추가, 누적: ${sum + current}`);
            return sum + current;
          }, 0);
          
          const totalPreviousPopulation = multiplePopulationChangeResponse.reduce((sum, data) => {
            const previous = data.previousTotalPopulation || 0;
            console.log(`동 ${data.dongName}: 이전 인구 ${previous} 추가, 누적: ${sum + previous}`);
            return sum + previous;
          }, 0);
          
          const totalChange = totalCurrentPopulation - totalPreviousPopulation;
          const totalChangeRate = totalPreviousPopulation > 0 ? 
            (totalChange / totalPreviousPopulation) * 100 : 0;
          
          console.log('최종 합산 결과:', {
            totalCurrentPopulation,
            totalPreviousPopulation,
            totalChange,
            totalChangeRate,
            dongCount: multiplePopulationChangeResponse.length
          });
          
          aggregatedData = {
            currentTotalPopulation: totalCurrentPopulation,
            previousTotalPopulation: totalPreviousPopulation,
            totalPopulationChange: totalChange,
            totalPopulationChangeRate: totalChangeRate,
            dongCount: multiplePopulationChangeResponse.length
          };
        } else {
          console.log('API 응답이 비어있거나 null입니다.');
        }
        
        setHomeData(homeResponse);
        setHealthStatus(healthResponse);
        setPopulationChangeData(aggregatedData);
      } catch (err) {
        console.error('백엔드 연결 실패:', err);
        // 백엔드 연결 실패 시 기본 데이터 설정
        setHomeData({
          message: 'PLIP Population API Server',
          version: '1.0.0',
          status: 'offline',
          availableEndpoints: {}
        });
        setHealthStatus({
          status: 'DOWN',
          timestamp: new Date().toISOString()
        });
        // 에러는 표시하지 않고 로그만 남김
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSeoulDashboard = () => {
    console.log('서울 대시보드 버튼 클릭됨');
    window.location.href = '/seoul-dashboard';
  };

  const handleGangnamDongs = () => {
    console.log('강남구 동별 정보 버튼 클릭됨');
    window.location.href = '/gangnam-dongs';
  };

  const handleFavorites = () => {
    console.log('마이페이지 버튼 클릭됨');
    window.location.href = '/favorites';
  };

  const handleHealth = () => {
    console.log('서버 상태 버튼 클릭됨');
    window.location.href = '/health';
  };

     const handleDetailedStats = () => {
     console.log('상세 통계 페이지 버튼 클릭됨');
     window.location.href = '/detailed-stats';
   };

   const handleComparisonAnalysis = () => {
     console.log('비교분석 페이지 버튼 클릭됨');
     window.location.href = '/comparison-analysis';
   };

  // 로그인 처리
  const handleLogin = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!loginForm.username || !loginForm.password) {
      setFormError('사용자명과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      const response = await apiClient.login(loginForm);
      console.log('로그인 응답:', response);
      console.log('응답 타입:', typeof response);
      console.log('응답 키들:', Object.keys(response));
      
      // 백엔드 응답 구조에 맞게 사용자 정보 구성
      const userData = {
        id: response.userId,
        username: response.username,
        nickname: response.nickname,
        email: response.email
      };
      
      console.log('생성된 userData:', userData);
      
      setIsLoggedIn(true);
      setUserInfo(userData);
      
      // 로컬 스토리지에 로그인 상태와 사용자 정보 저장
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userInfo', JSON.stringify(userData));
      
      console.log('저장된 사용자 정보:', userData);
      
      setFormSuccess('로그인에 성공했습니다!');
      setShowLoginModal(false);
      setLoginForm({ username: '', password: '' });
      
      // 2초 후 성공 메시지 제거
      setTimeout(() => setFormSuccess(''), 2000);
    } catch (err) {
      setFormError(err.message || '로그인에 실패했습니다.');
    }
  };

  // 회원가입 처리
  const handleSignup = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!signupForm.username || !signupForm.password || !signupForm.email || !signupForm.nickname) {
      setFormError('모든 필드를 입력해주세요.');
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      setFormError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (signupForm.password.length < 6) {
      setFormError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    try {
      const response = await apiClient.signup(signupForm);
      console.log('회원가입 응답:', response);
      setFormSuccess('회원가입에 성공했습니다! 로그인해주세요.');
      setShowSignupModal(false);
      setSignupForm({ username: '', password: '', email: '', nickname: '', confirmPassword: '' });
      
      // 2초 후 성공 메시지 제거
      setTimeout(() => setFormSuccess(''), 2000);
    } catch (err) {
      setFormError(err.message || '회원가입에 실패했습니다.');
    }
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      // 백엔드 로그아웃 API 호출
      await apiClient.logout();
      
      setIsLoggedIn(false);
      setUserInfo(null);
      
      // 로컬 스토리지에서 로그인 상태와 사용자 정보 제거
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userInfo');
      
      setFormSuccess('로그아웃되었습니다.');
      setTimeout(() => setFormSuccess(''), 2000);
    } catch (error) {
      console.error('로그아웃 오류:', error);
      // 백엔드 오류가 발생해도 프론트엔드에서는 로그아웃 처리
      setIsLoggedIn(false);
      setUserInfo(null);
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userInfo');
    }
  };

  // 모달 닫기
  const closeModals = () => {
    setShowLoginModal(false);
    setShowSignupModal(false);
    setFormError('');
    setFormSuccess('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">PLIP 서버에 연결 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-700 mb-2">연결 오류</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-gray-600">스프링부트 서버가 실행 중인지 확인해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 간단한 애니메이션 스타일 */}
      <style jsx global>{`
        /* 기본 애니메이션 */
        [data-animate] {
          opacity: 1;
          transform: translateY(0);
          transition: all 0.6s ease-out;
        }
        
        [data-animate].animate-visible {
          opacity: 1;
          transform: translateY(0);
        }
        
        /* 부드러운 호버 효과 */
        .hover-lift {
          transition: all 0.3s ease;
        }
        
        .hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.2);
        }
      `}</style>
      
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/data/KT_CI/KT CI 활용파일 (JPEG, PNG)/01_KT Wordmark (Standard)_01.jpg"
                alt="KT 로고"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <button 
                onClick={() => window.location.href = '/'}
                className="text-left hover:opacity-80 transition-opacity"
              >
                <div className="text-lg font-semibold text-black">PLIP</div>
                <div className="text-xs text-gray-600">Population Analytics</div>
              </button>
            </div>
            
            <div className="flex items-center gap-6">
              {/* 네비게이션 링크 */}
              <nav className="hidden md:flex items-center gap-6">
                <button
                  onClick={handleSeoulDashboard}
                  className="text-sm text-gray-600 hover:text-black transition-colors"
                >
                  Dashboard
                </button>
                <button
                  onClick={handleGangnamDongs}
                  className="text-sm text-gray-600 hover:text-black transition-colors"
                >
                  Regional Analysis
                </button>
                                 <button
                   onClick={handleDetailedStats}
                   className="text-sm text-gray-600 hover:text-black transition-colors"
                 >
                   Analytics
                 </button>
                 <button
                   onClick={handleComparisonAnalysis}
                   className="text-sm text-gray-600 hover:text-black transition-colors"
                 >
                   비교분석
                 </button>
              </nav>

              {/* 상태 표시 */}
              {healthStatus?.status === 'OK' && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm border border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Online
                </div>
              )}
              
              {/* 로그인/회원가입 버튼 */}
              {isLoggedIn ? (
                <div className="flex items-center gap-3">
                  {isLoggedIn && (
                    <button
                      onClick={handleFavorites}
                      className="text-sm text-gray-600 hover:text-black transition-colors"
                    >
                      My Page
                    </button>
                  )}
                  <span className="text-sm text-gray-600">
                    {userInfo?.nickname || userInfo?.username}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="text-sm text-gray-600 hover:text-black transition-colors"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => setShowSignupModal(true)}
                    className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
                  >
                    Get started
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 성공/에러 메시지 */}
      {formSuccess && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {formSuccess}
        </div>
      )}

      {/* Hero 섹션 */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2 text-sm text-gray-600 mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              진화하는 생활인구 분석 솔루션
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-black mb-6 leading-tight">
            생활이동분석솔루션(PLIP)
              <br />
              <span className="text-gray-500">KT 데이터의 힘</span>
              {/* <br />
              특정 시점, 특정 지역에 거주하는 인구 데이터 제공 솔루션. */}
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
            주소 기반 인구통계 방식을 벗어나 실제 생활인구 데이터를 분석하는 솔루션으로,
            정확하고 현실적인 인구 분석 및 수요예측을 지원합니다.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <button 
                className="px-8 py-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                onClick={handleSeoulDashboard}
              >
                Start exploring
              </button>
              <button 
                className="px-8 py-4 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                onClick={handleDetailedStats}
              >
                View analytics
              </button>
            </div>
          </div>

          {/* 핵심 지표 카드들 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
            <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm text-gray-600">Living population</span>
              </div>
              <div className="text-2xl font-bold text-black">
                {populationChangeData ? 
                  `${(populationChangeData.currentTotalPopulation / 1000000).toFixed(1)}M` : 
                  '9.7M'
                }
              </div>
              <div className={`text-sm mt-1 ${
                populationChangeData && populationChangeData.totalPopulationChangeRate > 0 
                  ? 'text-green-600' 
                  : populationChangeData && populationChangeData.totalPopulationChangeRate < 0 
                  ? 'text-red-600' 
                  : 'text-gray-600'
              }`}>
                {populationChangeData ? 
                  `${populationChangeData.totalPopulationChangeRate > 0 ? '+' : ''}${populationChangeData.totalPopulationChangeRate.toFixed(1)}% from last month` : 
                  '+2.3% from last month'
                }
              </div>
            </div>

            <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm text-gray-600">Data accuracy</span>
              </div>
              <div className="text-2xl font-bold text-black">99.2%</div>
              <div className="text-sm text-gray-600 mt-1">Real-time validation</div>
            </div>

            <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-gray-600">Update frequency</span>
              </div>
              <div className="text-2xl font-bold text-black">24/7</div>
              <div className="text-sm text-gray-600 mt-1">Real-time monitoring</div>
            </div>

            <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-sm text-gray-600">Active districts</span>
              </div>
              <div className="text-2xl font-bold text-black">
                {populationChangeData ? populationChangeData.dongCount : gangnamDongCodes.length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Gangnam districts</div>
            </div>
          </div>
        </div>
      </section>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-6 py-24">
        {/* 주요 기능 섹션 */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-6">
              Key Features
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Comprehensive population analytics tools designed for modern urban planning and business intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div 
              onClick={handleSeoulDashboard}
              className="group p-8 border border-gray-200 rounded-lg bg-white cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-gray-300"
            >
              <div className="flex items-center gap-3 mb-6">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-xl font-semibold text-black">Seoul Dashboard</h3>
              </div>
              
              <p className="text-gray-600 mb-6 leading-relaxed">
                Comprehensive overview of Seoul's population dynamics with interactive district-level insights and real-time data visualization.
              </p>
              
              <ul className="text-sm text-gray-600 space-y-2 mb-8">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  Real-time population monitoring
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  25 district detailed analysis
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  Interactive map visualization
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  Historical trend analysis
                </li>
              </ul>
              
              <div className="flex items-center text-sm font-medium text-gray-700 group-hover:text-black transition-colors">
                Explore dashboard
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            
            <div 
              onClick={handleGangnamDongs}
              className="group p-8 border border-gray-200 rounded-lg bg-white cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-gray-300"
            >
              <div className="flex items-center gap-3 mb-6">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3 className="text-xl font-semibold text-black">Regional Analysis</h3>
              </div>
              
              <p className="text-gray-600 mb-6 leading-relaxed">
                Deep dive into specific regions with detailed population breakdowns, demographic analysis, and comparative insights.
              </p>
              
              <ul className="text-sm text-gray-600 space-y-2 mb-8">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  District-level population mapping
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  Comparative regional analysis
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  Demographic segmentation
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  Time-based patterns
                </li>
              </ul>
              
              <div className="flex items-center text-sm font-medium text-gray-700 group-hover:text-black transition-colors">
                View regions
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            
            <div 
              onClick={handleDetailedStats}
              className="group p-8 border border-gray-200 rounded-lg bg-white cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-gray-300"
            >
              <div className="flex items-center gap-3 mb-6">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-xl font-semibold text-black">Advanced Analytics</h3>
              </div>
              
              <p className="text-gray-600 mb-6 leading-relaxed">
                Comprehensive statistical analysis with interactive charts, filtering capabilities, and predictive modeling tools.
              </p>
              
              <ul className="text-sm text-gray-600 space-y-2 mb-8">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  Interactive data visualization
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  Multi-dimensional filtering
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  Predictive trend analysis
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  Custom report generation
                </li>
              </ul>
              
              <div className="flex items-center text-sm font-medium text-gray-700 group-hover:text-black transition-colors">
                Access analytics
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* 기술적 우위 섹션 */}
        <section className="mb-24 py-16 bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-black mb-6">
                Why Choose PLIP
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Built on cutting-edge technology and validated by government institutions for reliable population analytics.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-white border border-gray-200 rounded-lg flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-black mb-4">Signal-Based Accuracy</h3>
                <p className="text-gray-600 leading-relaxed">
                  Leveraging LTE and 5G communication signals for precise data collection, 
                  surpassing traditional address-based demographic limitations.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-white border border-gray-200 rounded-lg flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-black mb-4">Government Validated</h3>
                <p className="text-gray-600 leading-relaxed">
                  Co-developed with Seoul Metropolitan Government and recognized with 
                  ministerial awards for data reliability and innovation.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-white border border-gray-200 rounded-lg flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-black mb-4">Real-Time Updates</h3>
                <p className="text-gray-600 leading-relaxed">
                  Continuous data refresh cycles with weekly and monthly updates 
                  to track the latest population dynamics and trends.
                </p>
              </div>
            </div>
          </div>
        </section>


      </main>

      {/* 푸터 */}
      <footer className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* 로고 및 설명 */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-lg font-semibold text-black">PLIP</span>
              </div>
              <p className="text-gray-600 leading-relaxed max-w-md">
                Advanced population analytics solution providing real-time insights 
                for data-driven urban planning and business decisions.
              </p>
            </div>

            {/* 제품 */}
            <div>
              <h3 className="font-semibold text-black mb-4">Product</h3>
              <ul className="space-y-3">
                <li><a href="#features" className="text-gray-600 hover:text-black text-sm">Features</a></li>
                <li><a href="#pricing" className="text-gray-600 hover:text-black text-sm">Pricing</a></li>
                <li><a href="#api" className="text-gray-600 hover:text-black text-sm">API</a></li>
                <li><a href="#integrations" className="text-gray-600 hover:text-black text-sm">Integrations</a></li>
              </ul>
            </div>

            {/* 지원 */}
            <div>
              <h3 className="font-semibold text-black mb-4">Support</h3>
              <ul className="space-y-3">
                <li><a href="#docs" className="text-gray-600 hover:text-black text-sm">Documentation</a></li>
                <li><a href="#help" className="text-gray-600 hover:text-black text-sm">Help Center</a></li>
                <li><a href="#contact" className="text-gray-600 hover:text-black text-sm">Contact</a></li>
                <li><a href="#status" className="text-gray-600 hover:text-black text-sm">Status</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-100 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-600">
              © 2024 PLIP. All rights reserved.
            </div>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#privacy" className="text-sm text-gray-600 hover:text-black">Privacy</a>
              <a href="#terms" className="text-sm text-gray-600 hover:text-black">Terms</a>
              <a href="#cookies" className="text-sm text-gray-600 hover:text-black">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

      {/* 로그인 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">로그인</h2>
              <button
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            {formError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {formError}
              </div>
            )}
            
            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="block text-gray-900 text-sm font-bold mb-2">
                  사용자명
                </label>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  placeholder="사용자명을 입력하세요"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-900 text-sm font-bold mb-2">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  placeholder="비밀번호를 입력하세요"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  로그인
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    setShowSignupModal(true);
                  }}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  회원가입
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 회원가입 모달 */}
      {showSignupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">회원가입</h2>
              <button
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            {formError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {formError}
              </div>
            )}
            
            <form onSubmit={handleSignup}>
              <div className="mb-4">
                <label className="block text-gray-900 text-sm font-bold mb-2">
                  사용자명
                </label>
                <input
                  type="text"
                  value={signupForm.username}
                  onChange={(e) => setSignupForm({...signupForm, username: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  placeholder="사용자명을 입력하세요"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-900 text-sm font-bold mb-2">
                  이메일
                </label>
                <input
                  type="email"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({...signupForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  placeholder="이메일을 입력하세요"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-900 text-sm font-bold mb-2">
                  닉네임
                </label>
                <input
                  type="text"
                  value={signupForm.nickname}
                  onChange={(e) => setSignupForm({...signupForm, nickname: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  placeholder="닉네임을 입력하세요"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-900 text-sm font-bold mb-2">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({...signupForm, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  placeholder="비밀번호를 입력하세요 (최소 6자)"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-900 text-sm font-bold mb-2">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  value={signupForm.confirmPassword}
                  onChange={(e) => setSignupForm({...signupForm, confirmPassword: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  placeholder="비밀번호를 다시 입력하세요"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  회원가입
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSignupModal(false);
                    setShowLoginModal(true);
                  }}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  로그인
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 푸터 */}
      <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">P</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">PLIP Population Analysis</h3>
                  <p className="text-gray-400 text-sm">차세대 생활인구 분석 솔루션</p>
                </div>
              </div>
              <p className="text-gray-300 leading-relaxed max-w-md">
                주소 기반 인구통계 방식을 벗어나 실제 생활인구 데이터를 분석하는 솔루션으로, 
                정확하고 현실적인 인구 분석 및 수요예측을 지원합니다.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-6">주요 기능</h4>
              <ul className="text-gray-300 space-y-3">
                <li className="flex items-center">
                  <span className="text-blue-400 mr-2">•</span>
                  종합 현황 대시보드
                </li>
                <li className="flex items-center">
                  <span className="text-blue-400 mr-2">•</span>
                  지역별 생활인구 분석
                </li>
                <li className="flex items-center">
                  <span className="text-blue-400 mr-2">•</span>
                  상세 생활인구 현황
                </li>
                <li className="flex items-center">
                  <span className="text-blue-400 mr-2">•</span>
                  실시간 데이터 업데이트
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-6">서버 정보</h4>
              <div className="text-gray-300 space-y-3">
                <div className="flex items-center justify-between">
                  <span>버전:</span>
                  <span className="text-blue-400">{homeData?.version || '1.0.0'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>상태:</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    homeData?.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {homeData?.status || 'offline'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>마지막 업데이트:</span>
                  <span className="text-blue-400 text-xs">
                    {healthStatus?.timestamp ? new Date(healthStatus.timestamp).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-12 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 PLIP Population API Server - 생활이동분석솔루션. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
