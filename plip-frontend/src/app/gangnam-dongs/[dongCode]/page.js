'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { gangnamDongs } from '@/data/gangnamDongs';
import { apiClient } from '@/utils/api';
import Image from 'next/image';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// 색상 팔레트
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// 커스텀 파이 차트 라벨 컴포넌트
const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize="12"
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

// 커스텀 바 차트 라벨 컴포넌트
const CustomBarLabel = ({ x, y, width, height, value, total }) => {
  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
  return (
    <text 
      x={x + width / 2} 
      y={y - 5} 
      fill="#374151" 
      textAnchor="middle" 
      dominantBaseline="bottom"
      fontSize="11"
      fontWeight="500"
    >
      {`${percentage}%`}
    </text>
  );
};

export default function DongDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dongCode = params.dongCode;
  
  const [dongData, setDongData] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [timeBasedData, setTimeBasedData] = useState([]);
  const [dailyStats, setDailyStats] = useState(null);
  const [dayNightStats, setDayNightStats] = useState(null);
  const [timeWeekStats, setTimeWeekStats] = useState(null);
  const [weekdayWeekendStats, setWeekdayWeekendStats] = useState(null);
  const [genderAgeStats, setGenderAgeStats] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const loadDongData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('동 코드:', dongCode);

        // 동 정보 찾기
        const dong = gangnamDongs.find(d => d.id === dongCode);
        console.log('찾은 동 데이터:', dong);
        
        if (!dong) {
          setError('동 정보를 찾을 수 없습니다.');
          setLoading(false);
          return;
        }
        setDongData(dong);

        // API 호출 시도 (실패해도 기본 정보는 표시)
        try {
          // 각 동별로 개별 API 호출
          const apiDongCode = dongCode;
          
                     // 모든 API 호출을 병렬로 실행
           const [
             dailyResponse,
             timeBasedResponse,
             dailyStatsResponse,
             dayNightResponse,
             timeWeekResponse,
             weekdayWeekendResponse,
             genderAgeResponse
           ] = await Promise.allSettled([
             apiClient.getDailyPopulation(apiDongCode),
             apiClient.getTimeBasedPopulation(apiDongCode),
             apiClient.getDailyStats(apiDongCode),
             apiClient.getDayNightStats(apiDongCode),
             apiClient.getTimeWeekStats(apiDongCode),
             apiClient.getWeekdayWeekendStats(apiDongCode),
             apiClient.getGenderAgeStats(apiDongCode)
           ]);

                     console.log('API 응답 결과:', {
             daily: dailyResponse.status,
             timeBased: timeBasedResponse.status,
             dailyStats: dailyStatsResponse.status,
             dayNight: dayNightResponse.status,
             timeWeek: timeWeekResponse.status,
             weekdayWeekend: weekdayWeekendResponse.status,
             genderAge: genderAgeResponse.status
           });

          // 결과 처리 - 백엔드 응답 형식에 맞게 수정
          if (dailyResponse.status === 'fulfilled') {
            // 일별 데이터: { dailyDataList: [...] } 형태로 반환
            const dailyData = dailyResponse.value?.dailyDataList || [];
            setDailyData(dailyData);
            console.log('일별 데이터:', dailyData);
          }
          if (timeBasedResponse.status === 'fulfilled') {
            // 시간대별 데이터: { timeDataList: [...] } 형태로 반환
            const timeData = timeBasedResponse.value?.timeDataList || [];
            setTimeBasedData(timeData);
            console.log('시간대별 데이터:', timeData);
          }
          if (dailyStatsResponse.status === 'fulfilled') {
            setDailyStats(dailyStatsResponse.value);
            console.log('일일 통계:', dailyStatsResponse.value);
          }
          if (dayNightResponse.status === 'fulfilled') {
            setDayNightStats(dayNightResponse.value);
            console.log('주야간 통계:', dayNightResponse.value);
          }
          if (timeWeekResponse.status === 'fulfilled') {
            setTimeWeekStats(timeWeekResponse.value);
            console.log('시간대/요일별 통계:', timeWeekResponse.value);
          }
          if (weekdayWeekendResponse.status === 'fulfilled') {
            setWeekdayWeekendStats(weekdayWeekendResponse.value);
            console.log('주중/주말 통계:', weekdayWeekendResponse.value);
          }
                     if (genderAgeResponse.status === 'fulfilled') {
             const genderAgeData = genderAgeResponse.value;
             
             // malePopulation과 femalePopulation이 null인 경우 계산
             if (genderAgeData.malePopulation === null && genderAgeData.maleAgeGroup) {
               genderAgeData.malePopulation = Object.values(genderAgeData.maleAgeGroup).reduce((sum, val) => sum + (val || 0), 0);
             }
             if (genderAgeData.femalePopulation === null && genderAgeData.femaleAgeGroup) {
               genderAgeData.femalePopulation = Object.values(genderAgeData.femaleAgeGroup).reduce((sum, val) => sum + (val || 0), 0);
             }
             
             setGenderAgeStats(genderAgeData);
             console.log('성별/연령별 통계:', genderAgeData);
           }

        } catch (apiError) {
          console.error('API 호출 오류:', apiError);
          // API 호출이 실패해도 기본 동 정보는 표시
        }

      } catch (err) {
        console.error('데이터 로드 오류:', err);
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (dongCode) {
      loadDongData();
    }
  }, [dongCode]);

  // 차트 데이터 변환 함수들 - 백엔드 응답 형식에 맞게 수정
  const getTimeBasedChartData = () => {
    if (!timeBasedData || timeBasedData.length === 0) {
      console.log('timeBasedData가 없습니다.');
      return [];
    }
    
    console.log('timeBasedData:', timeBasedData);
    
    // 새로운 DailyPopulationDto 구조 지원
    const chartData = timeBasedData.map(item => ({
      time: item.timeRange || '시간대 없음',
      total: item.totalPopulation || 0,
      local: item.localPopulation || 0,
      tempForeigner: item.tempForeignerPopulation || 0,
      longForeigner: item.longForeignerPopulation || 0
    }));
    
    console.log('시간대별 차트 데이터:', chartData);
    return chartData;
  };

  const getGenderAgeChartData = () => {
    if (!genderAgeStats) {
      console.log('genderAgeStats가 없습니다.');
      return [];
    }
    
    // 백엔드 응답 형식에 맞게 수정
    const maleAgeGroup = genderAgeStats.maleAgeGroup || {};
    const femaleAgeGroup = genderAgeStats.femaleAgeGroup || {};
    
    console.log('maleAgeGroup:', maleAgeGroup);
    console.log('femaleAgeGroup:', femaleAgeGroup);
    
    const ageGroups = Object.keys(maleAgeGroup);
    const chartData = ageGroups.map(age => ({
      age,
      male: maleAgeGroup[age] || 0,
      female: femaleAgeGroup[age] || 0
    }));
    
    console.log('성별/연령별 차트 데이터:', chartData);
    return chartData;
  };

  const getWeekdayWeekendChartData = () => {
    if (!weekdayWeekendStats) return [];
    
    // 백엔드 응답 형식에 맞게 수정
    return [
      { type: '주중', population: weekdayWeekendStats.weekdayPopulation || weekdayWeekendStats.weekday || 0 },
      { type: '주말', population: weekdayWeekendStats.weekendPopulation || weekdayWeekendStats.weekend || 0 }
    ];
  };

  const getAgeGroupChartData = () => {
    if (!weekdayWeekendStats) {
      console.log('weekdayWeekendStats가 없습니다.');
      return [];
    }
    
    // 백엔드 응답 형식에 맞게 수정
    const ageGroupWeekday = weekdayWeekendStats.ageGroupWeekday || {};
    const ageGroupWeekend = weekdayWeekendStats.ageGroupWeekend || {};
    
    console.log('ageGroupWeekday:', ageGroupWeekday);
    console.log('ageGroupWeekend:', ageGroupWeekend);
    
    const ageGroups = Object.keys(ageGroupWeekday);
    const chartData = ageGroups.map(age => ({
      age,
      weekday: ageGroupWeekday[age] || 0,
      weekend: ageGroupWeekend[age] || 0
    }));
    
    console.log('연령대별 주중/주말 차트 데이터:', chartData);
    return chartData;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !dongData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-700 mb-2">오류 발생</h1>
          <p className="text-red-600 mb-4">{error || '동 정보를 찾을 수 없습니다.'}</p>
          <button 
            onClick={() => router.push('/gangnam-dongs')} 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            목록으로 돌아가기
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
                  <h1 className="text-xl font-bold text-gray-900">{dongData.name} 상세 분석</h1>
                  <p className="text-sm text-gray-500">행정동별 생활인구 상세 통계</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                🟢 실시간 데이터
              </div>
              <button
                onClick={() => router.push('/gangnam-dongs')}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                ← 목록으로
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 동 기본 정보 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{dongData.name}</h2>
              <p className="text-gray-600">{dongData.description}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-sm text-blue-600 font-medium">총 인구</div>
              <div className="text-2xl font-bold text-blue-900">
                {dongData.population.toLocaleString()}명
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-sm text-green-600 font-medium">면적</div>
              <div className="text-2xl font-bold text-green-900">
                {dongData.area}㎢
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-sm text-purple-600 font-medium">인구밀도</div>
              <div className="text-2xl font-bold text-purple-900">
                {dongData.density.toLocaleString()}명/㎢
              </div>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', name: '개요', icon: '📊' },
                { id: 'time', name: '시간대별', icon: '⏰' },
                { id: 'demographics', name: '인구통계', icon: '👥' },
                { id: 'patterns', name: '패턴분석', icon: '📈' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="space-y-6">
          {/* 개요 탭 */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 기본 동 정보 */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">동 이름</span>
                    <span className="font-bold text-blue-600">{dongData.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">총 인구</span>
                    <span className="font-bold text-green-600">{dongData.population.toLocaleString()}명</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">면적</span>
                    <span className="font-bold text-purple-600">{dongData.area}㎢</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">인구밀도</span>
                    <span className="font-bold text-red-600">{dongData.density.toLocaleString()}명/㎢</span>
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">{dongData.description}</p>
                  </div>
                </div>
              </div>

              {/* 일일 통계 */}
              {dailyStats ? (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">일일 통계</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-500">평균 인구</div>
                      <div className="text-xl font-bold text-blue-600">
                        {dailyStats.averagePopulation?.toLocaleString()}명
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-500">최대 인구</div>
                      <div className="text-xl font-bold text-green-600">
                        {dailyStats.maxPopulation?.toLocaleString()}명
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-500">최소 인구</div>
                      <div className="text-xl font-bold text-red-600">
                        {dailyStats.minPopulation?.toLocaleString()}명
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-500">변동폭</div>
                      <div className="text-xl font-bold text-purple-600">
                        {((dailyStats.maxPopulation - dailyStats.minPopulation) / dailyStats.averagePopulation * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">일일 통계</h3>
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-4">📊</div>
                    <p className="text-gray-500">실시간 통계 데이터를 불러올 수 없습니다.</p>
                    <p className="text-sm text-gray-400 mt-2">서버 연결을 확인해주세요.</p>
                  </div>
                </div>
              )}

              {/* 주간/야간 통계 */}
              {dayNightStats ? (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">주간/야간 통계</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">주간 인구</span>
                      <span className="font-bold text-blue-600">{dayNightStats.dayPopulation?.toLocaleString()}명</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">야간 인구</span>
                      <span className="font-bold text-purple-600">{dayNightStats.nightPopulation?.toLocaleString()}명</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">주야간 비율</span>
                      <span className="font-bold text-green-600">{dayNightStats.dayNightRatio?.toFixed(1)}:1</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">주간/야간 통계</h3>
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-4">🌙</div>
                    <p className="text-gray-500">주야간 통계 데이터를 불러올 수 없습니다.</p>
                  </div>
                </div>
              )}

              {/* 주중/주말 통계 */}
              {weekdayWeekendStats ? (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">주중/주말 통계</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={getWeekdayWeekendChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip />
                      <Bar 
                        dataKey="population" 
                        fill="#8884d8"
                        label={(props) => {
                          const total = getWeekdayWeekendChartData().reduce((sum, item) => sum + item.population, 0);
                          return <CustomBarLabel {...props} total={total} />;
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">주중/주말 통계</h3>
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-4">📅</div>
                    <p className="text-gray-500">주중/주말 통계 데이터를 불러올 수 없습니다.</p>
                  </div>
                </div>
              )}

              {/* 성별 통계 */}
              {genderAgeStats ? (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">성별 통계</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: '남성', value: genderAgeStats.malePopulation || 0 },
                          { name: '여성', value: genderAgeStats.femalePopulation || 0 }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        label={<CustomPieLabel />}
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => {
                          const total = (genderAgeStats.malePopulation || 0) + (genderAgeStats.femalePopulation || 0);
                          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                          return [`${Math.round(value).toLocaleString()}명 (${percentage}%)`, '인구'];
                        }}
                      />
                      <Legend 
                        formatter={(value, entry) => {
                          const total = (genderAgeStats.malePopulation || 0) + (genderAgeStats.femalePopulation || 0);
                          const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(1) : 0;
                          return `${value} (${percentage}%)`;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">성별 통계</h3>
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-4">👥</div>
                    <p className="text-gray-500">성별 통계 데이터를 불러올 수 없습니다.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 시간대별 탭 */}
          {activeTab === 'time' && (
            <div className="space-y-6">
              {/* 시간대별 인구 변화 */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">시간대별 인구 변화</h3>
                {timeBasedData.length > 0 && getTimeBasedChartData().length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={getTimeBasedChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => {
                          const total = getTimeBasedChartData().reduce((sum, item) => sum + (item.total || 0), 0);
                          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                          return [`${Math.round(value).toLocaleString()}명 (${percentage}%)`, name];
                        }}
                      />
                      <Legend 
                        formatter={(value, entry) => {
                          const total = getTimeBasedChartData().reduce((sum, item) => sum + (item.total || 0), 0);
                          const avgValue = getTimeBasedChartData().reduce((sum, item) => sum + (item[entry.dataKey] || 0), 0) / getTimeBasedChartData().length;
                          const percentage = total > 0 ? ((avgValue / total) * 100).toFixed(1) : 0;
                          return `${value} (평균 ${percentage}%)`;
                        }}
                      />
                      <Area type="monotone" dataKey="total" stackId="1" stroke="#8884d8" fill="#8884d8" />
                      <Line type="monotone" dataKey="local" stroke="#82ca9d" strokeWidth={2} />
                      <Line type="monotone" dataKey="tempForeigner" stroke="#ffc658" strokeWidth={2} />
                      <Line type="monotone" dataKey="longForeigner" stroke="#ff7300" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <div className="text-4xl mb-2">⏰</div>
                      <p>시간대별 데이터가 없습니다.</p>
                      <p className="text-sm text-gray-400 mt-2">API 응답을 확인해주세요.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 시간대별 상세 데이터 테이블 */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">시간대별 상세 데이터</h3>
                {timeBasedData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">시간대</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총 인구</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">국내인</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">단기외국인</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">장기외국인</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {timeBasedData.map((item, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.timeZone || '시간대'} ({item.timeRange || '범위 없음'})
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.totalPopulation?.toLocaleString() || '0'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.localPopulation?.toLocaleString() || '0'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.tempForeignerPopulation?.toLocaleString() || '0'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.longForeignerPopulation?.toLocaleString() || '0'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-gray-500">
                    <div className="text-center">
                      <div className="text-2xl mb-2">📋</div>
                      <p>시간대별 상세 데이터가 없습니다.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 인구통계 탭 */}
          {activeTab === 'demographics' && (
            <div className="space-y-6">
              {/* 성별/연령별 분포 */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">성별/연령별 분포</h3>
                {genderAgeStats && getGenderAgeChartData().length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={getGenderAgeChartData()} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="age" type="category" width={80} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="male" stackId="a" fill="#8884d8" name="남성" />
                      <Bar dataKey="female" stackId="a" fill="#82ca9d" name="여성" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <div className="text-4xl mb-2">👥</div>
                      <p>성별/연령별 데이터가 없습니다.</p>
                      <p className="text-sm text-gray-400 mt-2">API 응답을 확인해주세요.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 연령대별 주중/주말 비교 */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">연령대별 주중/주말 비교</h3>
                {weekdayWeekendStats && getAgeGroupChartData().length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={getAgeGroupChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="age" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="weekday" fill="#8884d8" name="주중" />
                      <Bar dataKey="weekend" fill="#82ca9d" name="주말" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📊</div>
                      <p>연령대별 주중/주말 데이터가 없습니다.</p>
                      <p className="text-sm text-gray-400 mt-2">API 응답을 확인해주세요.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 패턴분석 탭 */}
          {activeTab === 'patterns' && (
            <div className="space-y-6">
              {/* 시간대별 패턴 */}
              {timeWeekStats && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">시간대별 패턴</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={Object.entries(timeWeekStats.timeSlotPopulation || {}).map(([time, pop]) => ({
                      time: `${time}시`,
                      population: pop
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="population" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* 요일별 패턴 */}
              {timeWeekStats && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">요일별 패턴</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={Object.entries(timeWeekStats.weekdayPopulation || {}).map(([day, pop]) => ({
                      day,
                      population: pop
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="population" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}


        </div>
      </main>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h4 className="font-semibold mb-2">{dongData.name} 상세 분석</h4>
            <p className="text-gray-400 text-sm">
              행정동별 생활인구 상세 통계 및 분석 데이터를 제공합니다
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
