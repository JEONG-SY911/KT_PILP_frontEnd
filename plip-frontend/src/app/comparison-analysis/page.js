'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/utils/api';
import Image from 'next/image';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Area, AreaChart
} from 'recharts';

// 서울시 구 데이터
const seoulDistricts = [
  { code: '11680', name: '강남구' },
  { code: '11740', name: '강동구' },
  { code: '11305', name: '강북구' },
  { code: '11500', name: '강서구' },
  { code: '11620', name: '관악구' },
  { code: '11215', name: '광진구' },
  { code: '11530', name: '구로구' },
  { code: '11545', name: '금천구' },
  { code: '11350', name: '노원구' },
  { code: '11320', name: '도봉구' },
  { code: '11230', name: '동대문구' },
  { code: '11590', name: '동작구' },
  { code: '11440', name: '마포구' },
  { code: '11410', name: '서대문구' },
  { code: '11650', name: '서초구' },
  { code: '11200', name: '성동구' },
  { code: '11290', name: '성북구' },
  { code: '11710', name: '송파구' },
  { code: '11470', name: '양천구' },
  { code: '11560', name: '영등포구' },
  { code: '11170', name: '용산구' },
  { code: '11380', name: '은평구' },
  { code: '11110', name: '종로구' },
  { code: '11140', name: '중구' },
  { code: '11260', name: '중랑구' }
];

// 강남구 동 데이터 (예시)
const gangnamDongs = [
  { code: '11680600', name: '개포1동' },
  { code: '11680610', name: '개포2동' },
  { code: '11680630', name: '개포4동' },
  { code: '11680640', name: '역삼1동' },
  { code: '11680650', name: '역삼2동' },
  { code: '11680565', name: '삼성1동' },
  { code: '11680510', name: '신사동' },
  { code: '11680545', name: '청담동' }
];

export default function ComparisonAnalysis() {
  const [selectedDistrict1, setSelectedDistrict1] = useState('');
  const [selectedDong1, setSelectedDong1] = useState('');
  const [selectedDistrict2, setSelectedDistrict2] = useState('');
  const [selectedDong2, setSelectedDong2] = useState('');
  
  const [dong1Data, setDong1Data] = useState(null);
  const [dong2Data, setDong2Data] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 6일 전 날짜 계산
  const getDateString = () => {
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    return sixDaysAgo.getFullYear().toString() + 
           String(sixDaysAgo.getMonth() + 1).padStart(2, '0') + 
           String(sixDaysAgo.getDate()).padStart(2, '0');
  };

  // 시간대별 차트 데이터 생성
  const getTimeBasedChartData = (dongData, dongName) => {
    if (!dongData?.dailyDataList) return [];
    
    return dongData.dailyDataList
      .sort((a, b) => a.timeRange.localeCompare(b.timeRange))
      .map(data => ({
        timeRange: data.timeRange,
        total: data.totalPopulation,
        local: data.localPopulation,
        tempForeigner: data.tempForeignerPopulation,
        longForeigner: data.longForeignerPopulation,
        dongName: dongName
      }));
  };

  // 인구 구성 파이 차트 데이터 생성
  const getPopulationCompositionData = (dongData, dongName) => {
    if (!dongData?.dailyDataList?.[0]) return [];
    
    const data = dongData.dailyDataList[0];
    return [
      { name: '내국인', value: data.localPopulation, dongName },
      { name: '단기 외국인', value: data.tempForeignerPopulation, dongName },
      { name: '장기 외국인', value: data.longForeignerPopulation, dongName }
    ];
  };

  // 비교용 시간대별 데이터 생성
  const getComparisonTimeData = () => {
    if (!dong1Data?.dailyDataList || !dong2Data?.dailyDataList) {
      console.log('데이터가 없습니다:', { dong1Data, dong2Data });
      return [];
    }
    
    const dong1Name = gangnamDongs.find(d => d.code === selectedDong1)?.name || '동1';
    const dong2Name = gangnamDongs.find(d => d.code === selectedDong2)?.name || '동2';
    
    console.log('원본 데이터:', {
      dong1Data: dong1Data.dailyDataList,
      dong2Data: dong2Data.dailyDataList
    });
    
    // 6일 전 날짜 계산
    const targetDate = getDateString();
    console.log('목표 날짜:', targetDate);
    
    // 같은 날짜의 데이터만 필터링
    const dong1Filtered = dong1Data.dailyDataList.filter(data => data.date === targetDate);
    const dong2Filtered = dong2Data.dailyDataList.filter(data => data.date === targetDate);
    
    console.log('필터링된 데이터:', {
      dong1Filtered,
      dong2Filtered
    });
    
    const dong1Sorted = dong1Filtered.sort((a, b) => a.timeRange.localeCompare(b.timeRange));
    const dong2Sorted = dong2Filtered.sort((a, b) => a.timeRange.localeCompare(b.timeRange));
    
    const result = dong1Sorted.map((data, index) => {
      // timeRange에서 시간만 추출 (예: "21:00-22:00" -> "21")
      const hour = data.timeRange.split(':')[0];
      
      const chartData = {
        timeRange: hour,
        [`${dong1Name}_total`]: data.totalPopulation,
        [`${dong1Name}_local`]: data.localPopulation,
        [`${dong2Name}_total`]: dong2Sorted[index]?.totalPopulation || 0,
        [`${dong2Name}_local`]: dong2Sorted[index]?.localPopulation || 0,
      };
      
      console.log('차트 데이터 항목:', chartData);
      return chartData;
    });
    
    console.log('최종 차트 데이터:', result);
    return result;
  };

  const handleCompare = async () => {
    if (!selectedDong1 || !selectedDong2) {
      setError('두 개의 행정동을 모두 선택해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const dateString = getDateString();
      console.log('사용할 날짜:', dateString);
      
      // 두 동의 데이터를 병렬로 가져오기 (같은 날짜 사용)
      const [dong1Response, dong2Response] = await Promise.all([
        apiClient.getDailyPopulation(selectedDong1, dateString),
        apiClient.getDailyPopulation(selectedDong2, dateString)
      ]);

      setDong1Data(dong1Response);
      setDong2Data(dong2Response);
    } catch (err) {
      console.error('데이터 로드 실패:', err);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-white">
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
                onClick={handleBack}
                className="text-left hover:opacity-80 transition-opacity"
              >
                <div className="text-lg font-semibold text-black">PLIP</div>
                <div className="text-xs text-gray-600">Population Analytics</div>
              </button>
            </div>
            
            <div className="flex items-center gap-6">
              <nav className="hidden md:flex items-center gap-6">
                <button
                  onClick={() => window.location.href = '/seoul-dashboard'}
                  className="text-sm text-gray-600 hover:text-black transition-colors"
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
                  className="text-sm text-black font-medium"
                >
                  비교분석
                </button>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">행정동 비교분석</h1>
          <p className="text-gray-600">두 개의 행정동을 선택하여 인구 데이터를 비교해보세요.</p>
        </div>

        {/* 선택 영역 */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 첫 번째 행정동 선택 */}
            <div>
              <h3 className="text-lg font-semibold text-black mb-4">첫 번째 행정동</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">구 선택</label>
                  <select
                    value={selectedDistrict1}
                    onChange={(e) => {
                      setSelectedDistrict1(e.target.value);
                      setSelectedDong1('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="">구를 선택하세요</option>
                    {seoulDistricts.map((district) => (
                      <option key={district.code} value={district.code}>
                        {district.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">행정동 선택</label>
                  <select
                    value={selectedDong1}
                    onChange={(e) => setSelectedDong1(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    disabled={!selectedDistrict1}
                  >
                    <option value="">행정동을 선택하세요</option>
                    {selectedDistrict1 === '11680' && gangnamDongs.map((dong) => (
                      <option key={dong.code} value={dong.code}>
                        {dong.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 두 번째 행정동 선택 */}
            <div>
              <h3 className="text-lg font-semibold text-black mb-4">두 번째 행정동</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">구 선택</label>
                  <select
                    value={selectedDistrict2}
                    onChange={(e) => {
                      setSelectedDistrict2(e.target.value);
                      setSelectedDong2('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="">구를 선택하세요</option>
                    {seoulDistricts.map((district) => (
                      <option key={district.code} value={district.code}>
                        {district.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">행정동 선택</label>
                  <select
                    value={selectedDong2}
                    onChange={(e) => setSelectedDong2(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    disabled={!selectedDistrict2}
                  >
                    <option value="">행정동을 선택하세요</option>
                    {selectedDistrict2 === '11680' && gangnamDongs.map((dong) => (
                      <option key={dong.code} value={dong.code}>
                        {dong.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 비교 버튼 */}
          <div className="mt-8 text-center">
            <button
              onClick={handleCompare}
              disabled={loading || !selectedDong1 || !selectedDong2}
              className="px-8 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? '비교 중...' : '비교'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* 비교 결과 */}
        {dong1Data && dong2Data && (
          <div className="space-y-8">
            {/* 기본 통계 비교 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 첫 번째 행정동 데이터 */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-black mb-6">
                  {gangnamDongs.find(d => d.code === selectedDong1)?.name || '첫 번째 행정동'}
                </h3>
                
                {/* 기본 통계 */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-black">
                      {dong1Data.dailyDataList?.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">데이터 포인트</div>
                    <div className="text-xs text-gray-500 mt-1">
                      하루 24시간 시간대별 데이터<br/>
                      (00:00-01:00 ~ 23:00-24:00)
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-black">
                      {dong1Data.dailyDataList?.[0]?.totalPopulation?.toLocaleString() || 0}
                    </div>
                    <div className="text-sm text-gray-600">총 인구</div>
                  </div>
                </div>

                {/* 시간대별 인구 분포 */}
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-black mb-4">시간대별 인구 분포</h4>
                  <div className="space-y-2">
                    {dong1Data.dailyDataList?.slice(0, 6).map((data, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{data.timeRange}</span>
                        <span className="text-sm font-medium text-black">
                          {data.totalPopulation?.toLocaleString() || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 인구 구성 */}
                <div>
                  <h4 className="text-lg font-medium text-black mb-4">인구 구성</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">내국인</span>
                      <span className="text-sm font-medium text-black">
                        {dong1Data.dailyDataList?.[0]?.localPopulation?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">단기 외국인</span>
                      <span className="text-sm font-medium text-black">
                        {dong1Data.dailyDataList?.[0]?.tempForeignerPopulation?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">장기 외국인</span>
                      <span className="text-sm font-medium text-black">
                        {dong1Data.dailyDataList?.[0]?.longForeignerPopulation?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 두 번째 행정동 데이터 */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-black mb-6">
                  {gangnamDongs.find(d => d.code === selectedDong2)?.name || '두 번째 행정동'}
                </h3>
                
                {/* 기본 통계 */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-black">
                      {dong2Data.dailyDataList?.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">데이터 포인트</div>
                    <div className="text-xs text-gray-500 mt-1">
                      하루 24시간 시간대별 데이터<br/>
                      (00:00-01:00 ~ 23:00-24:00)
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-black">
                      {dong2Data.dailyDataList?.[0]?.totalPopulation?.toLocaleString() || 0}
                    </div>
                    <div className="text-sm text-gray-600">총 인구</div>
                  </div>
                </div>

                {/* 시간대별 인구 분포 */}
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-black mb-4">시간대별 인구 분포</h4>
                  <div className="space-y-2">
                    {dong2Data.dailyDataList?.slice(0, 6).map((data, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{data.timeRange}</span>
                        <span className="text-sm font-medium text-black">
                          {data.totalPopulation?.toLocaleString() || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 인구 구성 */}
                <div>
                  <h4 className="text-lg font-medium text-black mb-4">인구 구성</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">내국인</span>
                      <span className="text-sm font-medium text-black">
                        {dong2Data.dailyDataList?.[0]?.localPopulation?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">단기 외국인</span>
                      <span className="text-sm font-medium text-black">
                        {dong2Data.dailyDataList?.[0]?.tempForeignerPopulation?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">장기 외국인</span>
                      <span className="text-sm font-medium text-black">
                        {dong2Data.dailyDataList?.[0]?.longForeignerPopulation?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 시각적 비교 그래프 */}
            <div className="space-y-8">
              {/* 시간대별 인구 비교 그래프 */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-black mb-6">시간대별 인구 비교 (6일 전 데이터)</h3>
                <p className="text-sm text-gray-600 mb-4">
                  두 행정동의 24시간 인구 변화를 비교하여 시간대별 패턴을 확인할 수 있습니다. (오늘 기준 6일 전 데이터)
                </p>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={getComparisonTimeData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timeRange" 
                      tick={{ fontSize: 12 }}
                      angle={0}
                      textAnchor="middle"
                      height={60}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => value.toLocaleString()}
                    />
                    <Tooltip 
                      formatter={(value, name) => [value.toLocaleString(), name]}
                      labelFormatter={(label) => `${label}시`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey={`${gangnamDongs.find(d => d.code === selectedDong1)?.name || '동1'}_total`}
                      stroke="#000000" 
                      strokeWidth={2}
                      name={`${gangnamDongs.find(d => d.code === selectedDong1)?.name || '동1'} 총인구`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey={`${gangnamDongs.find(d => d.code === selectedDong2)?.name || '동2'}_total`}
                      stroke="#666666" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name={`${gangnamDongs.find(d => d.code === selectedDong2)?.name || '동2'} 총인구`}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* 인구 구성 비교 파이 차트 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-black mb-6">
                    {gangnamDongs.find(d => d.code === selectedDong1)?.name || '첫 번째 행정동'} 인구 구성
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    내국인, 단기 외국인, 장기 외국인의 비율을 확인할 수 있습니다.
                  </p>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getPopulationCompositionData(dong1Data, gangnamDongs.find(d => d.code === selectedDong1)?.name || '동1')}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#3A73B6" />
                        <Cell fill="#00A693" />
                        <Cell fill="#A2AAAD" />
                      </Pie>
                      <Tooltip formatter={(value) => value.toLocaleString()} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-black mb-6">
                    {gangnamDongs.find(d => d.code === selectedDong2)?.name || '두 번째 행정동'} 인구 구성
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    내국인, 단기 외국인, 장기 외국인의 비율을 확인할 수 있습니다.
                  </p>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getPopulationCompositionData(dong2Data, gangnamDongs.find(d => d.code === selectedDong2)?.name || '동2')}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#3A73B6" />
                        <Cell fill="#00A693" />
                        <Cell fill="#999999" />
                      </Pie>
                      <Tooltip formatter={(value) => value.toLocaleString()} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 내국인 vs 외국인 비교 바 차트 */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-black mb-6">내국인 vs 외국인 비교</h3>
                <p className="text-sm text-gray-600 mb-4">
                  두 행정동의 내국인과 외국인(단기+장기) 비율을 비교할 수 있습니다.
                </p>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={[
                    {
                      name: gangnamDongs.find(d => d.code === selectedDong1)?.name || '동1',
                      내국인: dong1Data.dailyDataList?.[0]?.localPopulation || 0,
                      외국인: (dong1Data.dailyDataList?.[0]?.tempForeignerPopulation || 0) + 
                              (dong1Data.dailyDataList?.[0]?.longForeignerPopulation || 0)
                    },
                    {
                      name: gangnamDongs.find(d => d.code === selectedDong2)?.name || '동2',
                      내국인: dong2Data.dailyDataList?.[0]?.localPopulation || 0,
                      외국인: (dong2Data.dailyDataList?.[0]?.tempForeignerPopulation || 0) + 
                              (dong2Data.dailyDataList?.[0]?.longForeignerPopulation || 0)
                    }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => value.toLocaleString()} />
                    <Tooltip formatter={(value) => value.toLocaleString()} />
                    <Legend />
                    <Bar dataKey="내국인" fill="#3A73B6  " barSize={100}/>
                    <Bar dataKey="외국인" fill="#00A693  " barSize={100}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
