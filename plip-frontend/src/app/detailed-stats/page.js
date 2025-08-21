'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient, pythonApiClient, agentApiClient, langGraphApiClient, overviewInsightsApiClient, aiBundleApiClient } from '@/utils/api';
import { gangnamDongs } from '@/data/gangnamDongs';
import Image from 'next/image';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, ScatterChart, Scatter,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { format, getDay, startOfWeek, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import * as d3 from 'd3';

// 색상 팔레트
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];

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

export default function DetailedStatsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 필터 상태
  const [selectedDong, setSelectedDong] = useState('11680640'); // 기본값, URL 파라미터로 대체됨
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('all');
  const [selectedTimeType, setSelectedTimeType] = useState('daily');
  const [selectedDayType, setSelectedDayType] = useState('all');
  
  // 탭 상태 추가
  const [activeTab, setActiveTab] = useState('overview');
  
  // 데이터 상태
  const [dailyData, setDailyData] = useState([]);
  const [genderAgeStats, setGenderAgeStats] = useState(null);
  const [weekdayWeekendStats, setWeekdayWeekendStats] = useState(null);
  const [dayNightStats, setDayNightStats] = useState(null);
  const [genderTimeStats, setGenderTimeStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Prophet 예측 상태
  const [predictionData, setPredictionData] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [modelTrained, setModelTrained] = useState(false);
  const [predictionError, setPredictionError] = useState(null);
  
  // 예측 비교 상태 추가
  const [comparisonData, setComparisonData] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState(null);

  // AI Agent 분석 상태
  const [agentAnalysis, setAgentAnalysis] = useState(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState(null);
  const [currentStep, setCurrentStep] = useState('');

  // LangGraph Agent 분석 상태
  const [langGraphAnalysis, setLangGraphAnalysis] = useState(null);
  const [langGraphLoading, setLangGraphLoading] = useState(false);
  const [langGraphError, setLangGraphError] = useState(null);

  // Overview Insights 상태
  const [overviewInsights, setOverviewInsights] = useState(null);
  const [overviewInsightsLoading, setOverviewInsightsLoading] = useState(false);
  const [overviewInsightsError, setOverviewInsightsError] = useState(null);

  // 차트 타입 상태
  const [chartType, setChartType] = useState('d3-line');


  useEffect(() => {
    loadData();
  }, [selectedDong]);

  // URL 쿼리 파라미터에서 동 코드 반영
  useEffect(() => {
    const dongFromQuery = searchParams?.get('dong');
    if (dongFromQuery && dongFromQuery !== selectedDong) {
      setSelectedDong(dongFromQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // 선택 변경 시 URL 동기화 (공유/새로고침 시 동일한 상태 유지)
  useEffect(() => {
    if (!selectedDong) return;
    const params = new URLSearchParams(Array.from((searchParams || new URLSearchParams()).entries()));
    params.set('dong', selectedDong);
    const next = `/detailed-stats?${params.toString()}`;
    router.replace(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDong]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        dailyResponse,
        genderAgeResponse,
        weekdayWeekendResponse,
        dayNightResponse,
        genderTimeResponse
      ] = await Promise.allSettled([
        apiClient.getDailyPopulation(selectedDong),
        apiClient.getGenderAgeStats(selectedDong),
        apiClient.getWeekdayWeekendStats(selectedDong),
        apiClient.getDayNightStats(selectedDong),
        apiClient.getGenderTimeStats(selectedDong)
      ]);

      // 데이터 처리
      if (dailyResponse.status === 'fulfilled') {
        const dailyData = dailyResponse.value?.dailyDataList || [];
        setDailyData(dailyData);
        console.log('일별 데이터 로드 성공:', dailyData.length, '개');
      } else {
        console.error('일별 데이터 로드 실패:', dailyResponse.reason);
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
        console.log('성별/연령별 데이터 로드 성공:', genderAgeData);
      } else {
        console.error('성별/연령별 데이터 로드 실패:', genderAgeResponse.reason);
      }
      
      if (weekdayWeekendResponse.status === 'fulfilled') {
        setWeekdayWeekendStats(weekdayWeekendResponse.value);
        console.log('주중/주말 데이터 로드 성공:', weekdayWeekendResponse.value);
      } else {
        console.error('주중/주말 데이터 로드 실패:', weekdayWeekendResponse.reason);
      }
      
      if (dayNightResponse.status === 'fulfilled') {
        setDayNightStats(dayNightResponse.value);
        console.log('주야간 데이터 로드 성공:', dayNightResponse.value);
      } else {
        console.error('주야간 데이터 로드 실패:', dayNightResponse.reason);
      }

      if (genderTimeResponse.status === 'fulfilled') {
        setGenderTimeStats(genderTimeResponse.value);
        console.log('성별 시간대 데이터 로드 성공:', genderTimeResponse.value);
      } else {
        console.error('성별 시간대 데이터 로드 실패:', genderTimeResponse.reason);
      }

    } catch (err) {
      console.error('데이터 로드 오류:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };



  // 차트 데이터 변환 함수들
  const getTimeBasedChartData = () => {
    if (!dailyData || dailyData.length === 0) {
      console.log('일별 데이터가 없습니다.');
      return [];
    }
    
    console.log('일별 데이터:', dailyData);
    console.log('시간대별 분포:', dailyData.reduce((acc, item) => {
      const timeRange = item?.timeRange || '시간대 없음';
      acc[timeRange] = (acc[timeRange] || 0) + 1;
      return acc;
    }, {}));
    
    // 시간대별로 데이터 그룹화하고 평균 계산
    const timeGroups = {};
    
    dailyData.forEach(item => {
      const timeRange = item?.timeRange || '시간대 없음';
      const total = parseFloat(item?.totalPopulation || item?.total || 0);
      const local = parseFloat(item?.localPopulation || item?.local || 0);
      const longForeigner = parseFloat(item?.longForeignerPopulation || item?.longForeigner || 0);
      const tempForeigner = parseFloat(item?.tempForeignerPopulation || item?.tempForeigner || 0);
      
      if (!timeGroups[timeRange]) {
        timeGroups[timeRange] = {
          totalSum: 0,
          localSum: 0,
          longForeignerSum: 0,
          tempForeignerSum: 0,
          count: 0
        };
      }
      
      timeGroups[timeRange].totalSum += total;
      timeGroups[timeRange].localSum += local;
      timeGroups[timeRange].longForeignerSum += longForeigner;
      timeGroups[timeRange].tempForeignerSum += tempForeigner;
      timeGroups[timeRange].count += 1;
    });
    
    // 평균 계산하여 차트 데이터 생성
    const chartData = Object.keys(timeGroups).map(timeRange => {
      const group = timeGroups[timeRange];
      const avgTotal = Math.round(group.totalSum / group.count);
      const avgLocal = Math.round(group.localSum / group.count);
      const avgLongForeigner = Math.round(group.longForeignerSum / group.count);
      const avgTempForeigner = Math.round(group.tempForeignerSum / group.count);
      
      return {
        time: timeRange,
        total: avgTotal,
        local: avgLocal,
        longForeigner: avgLongForeigner,
        tempForeigner: avgTempForeigner,
        others: Math.max(avgTotal - avgLocal, 0)
      };
    });
    
    // 시간 순서대로 정렬 (더 정확한 정렬)
    chartData.sort((a, b) => {
      // "HH:MM-HH:MM" 형식에서 시작 시간 추출
      const timeA = parseInt(a.time.split('-')[0].split(':')[0]);
      const timeB = parseInt(b.time.split('-')[0].split(':')[0]);
      return timeA - timeB;
    });
    
    console.log('시간대별 평균 차트 데이터:', chartData);
    return chartData;
  };



  // X축 시간 라벨 축약 (예: "17:00-18:00" -> "17")
  const formatTimeTick = (label) => {
    if (!label) return '';
    const str = String(label);
    const match = str.match(/^(\d{1,2})/);
    return match ? match[1] : str;
  };

  // 이중 Y축 차트 컴포넌트 (Recharts 사용)
  const DualAxisLineChart = ({ data, width, height }) => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis 
            dataKey="time" 
            stroke="#6b7280" 
            fontSize={12} 
            axisLine={true} 
            tickLine={true}
            tickFormatter={formatTimeTick}
          />
                     <YAxis 
             yAxisId="left"
             stroke="#6b7280" 
             fontSize={12} 
             axisLine={true} 
             tickLine={true}
             tickFormatter={(value) => {
               if (value >= 1000) {
                 return `${(value / 1000).toFixed(1)}k`;
               }
               return value.toString();
             }}
             domain={['dataMin - 100', 'dataMax + 100']}
           />
           <YAxis 
             yAxisId="right"
             orientation="right"
             stroke="#6b7280" 
             fontSize={12} 
             axisLine={true} 
             tickLine={true}
             tickFormatter={(value) => {
               if (value >= 1000) {
                 return `${(value / 1000).toFixed(1)}k`;
               }
               return value.toString();
             }}
             domain={[0, 'dataMax + 50']}
           />
           <Tooltip 
             contentStyle={{
               backgroundColor: 'white',
               border: '1px solid #e5e7eb',
               borderRadius: '6px',
               boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
             }}
             formatter={(value, name) => {
               const labels = {
                 'total': '총 인구',
                 'local': '내국인', 
                 'longForeigner': '장기 외국인',
                 'tempForeigner': '단기 외국인'
               };
               return [
                 `${Math.round(value).toLocaleString()}명`, 
                 labels[name] || name
               ];
             }}
             labelFormatter={(label) => `시간: ${label}`}
           />
           <Legend 
             wrapperStyle={{ paddingTop: '5px', fontSize: '15px' }}
             iconSize={10}
             formatter={(value) => {
               const labels = {
                 'total': '총 인구',
                 'local': '내국인', 
                 'longForeigner': '장기 외국인',
                 'tempForeigner': '단기 외국인'
               };
               return labels[value] || value;
             }}
           />
           <Line 
             yAxisId="left"
             type="monotone" 
             dataKey="total" 
             stroke="#000000" 
             strokeWidth={3}
             dot={{ fill: '#000000', strokeWidth: 2, r: 4 }}
             activeDot={{ r: 6, stroke: '#000000', strokeWidth: 2, fill: '#ffffff' }}
           />
           <Line 
             yAxisId="left"
             type="monotone" 
             dataKey="local" 
             stroke="#666666" 
             strokeWidth={2}
             dot={{ fill: '#666666', strokeWidth: 2, r: 3 }}
             activeDot={{ r: 5, stroke: '#666666', strokeWidth: 2, fill: '#ffffff' }}
           />
           <Line 
             yAxisId="right"
             type="monotone" 
             dataKey="longForeigner" 
             stroke="#999999" 
             strokeWidth={2}
             dot={{ fill: '#999999', strokeWidth: 2, r: 3 }}
             activeDot={{ r: 5, stroke: '#999999', strokeWidth: 2, fill: '#ffffff' }}
           />
           <Line 
             yAxisId="right"
             type="monotone" 
             dataKey="tempForeigner" 
             stroke="#cccccc" 
             strokeWidth={2}
             dot={{ fill: '#cccccc', strokeWidth: 2, r: 3 }}
             activeDot={{ r: 5, stroke: '#cccccc', strokeWidth: 2, fill: '#ffffff' }}
           />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const getGenderChartData = () => {
    if (!genderAgeStats) return [];
    return [
      { name: '남성', value: genderAgeStats.malePopulation || 0, fill: '#0088FE' },
      { name: '여성', value: genderAgeStats.femalePopulation || 0, fill: '#FF6B6B' }
    ];
  };

  const getGenderDistributionData = () => {
    if (!genderAgeStats) return [];
    return [
      { name: 'Male', value: genderAgeStats.malePopulation || 0, fill: '#3b82f6' },
      { name: 'Female', value: genderAgeStats.femalePopulation || 0, fill: '#ec4899' }
    ];
  };

  const getAgeGroupChartData = () => {
    if (!genderAgeStats) return [];
    const maleAgeGroup = genderAgeStats.maleAgeGroup || {};
    const femaleAgeGroup = genderAgeStats.femaleAgeGroup || {};
    
    // 연령대 순서 정의 (어린 나이부터 나이 많은 순서로)
    const ageOrder = ['0-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70+'];
    
    // 실제 데이터에 있는 연령대만 필터링하고 정렬
    const availableAges = ageOrder.filter(age => maleAgeGroup.hasOwnProperty(age) || femaleAgeGroup.hasOwnProperty(age));
    
    return availableAges.map(age => ({
      age,
      male: maleAgeGroup[age] || 0,
      female: femaleAgeGroup[age] || 0
    }));
  };

  const getAgeGenderChartData = () => {
    if (!genderAgeStats) return [];
    const maleAgeGroup = genderAgeStats.maleAgeGroup || {};
    const femaleAgeGroup = genderAgeStats.femaleAgeGroup || {};
    
    // 연령대 순서 정의 (어린 나이부터 나이 많은 순서로)
    const ageOrder = ['0-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70+'];
    
    // 실제 데이터에 있는 연령대만 필터링하고 정렬
    const availableAges = ageOrder.filter(age => maleAgeGroup.hasOwnProperty(age) || femaleAgeGroup.hasOwnProperty(age));
    
    return availableAges.map(age => ({
      age,
      male: maleAgeGroup[age] || 0,
      female: femaleAgeGroup[age] || 0
    }));
  };

  const getWeekdayWeekendChartData = () => {
    if (!weekdayWeekendStats) return [];
    return [
      { type: '주중', population: weekdayWeekendStats.weekdayPopulation || 0, fill: '#00C49F' },
      { type: '주말', population: weekdayWeekendStats.weekendPopulation || 0, fill: '#FFBB28' }
    ];
  };

  // 주중/주말 성별 분포 데이터 (성별별 시간대 데이터를 활용)
  const getWeekdayWeekendGenderChartData = () => {
    if (!genderTimeStats || !weekdayWeekendStats) return [];
    
    // 성별별 시간대 데이터에서 주중/주말 비율 계산
    const maleData = genderTimeStats.male || {};
    const femaleData = genderTimeStats.female || {};
    
    // 전체 주중/주말 인구수에서 성별 비율 추정
    const weekdayTotal = weekdayWeekendStats.weekdayPopulation || 0;
    const weekendTotal = weekdayWeekendStats.weekendPopulation || 0;
    
    // 성별 총 인구 (성별/연령별 데이터에서 가져오기)
    const maleTotal = genderAgeStats?.malePopulation || 0;
    const femaleTotal = genderAgeStats?.femalePopulation || 0;
    const totalPopulation = maleTotal + femaleTotal;
    
    if (totalPopulation === 0) return [];
    
    // 성별 비율 계산
    const maleRatio = maleTotal / totalPopulation;
    const femaleRatio = femaleTotal / totalPopulation;
    
    // 주중/주말 성별 인구수 추정
    const weekdayMale = Math.round(weekdayTotal * maleRatio);
    const weekdayFemale = Math.round(weekdayTotal * femaleRatio);
    const weekendMale = Math.round(weekendTotal * maleRatio);
    const weekendFemale = Math.round(weekendTotal * femaleRatio);
    
    return [
      { 
        period: '주중', 
        male: weekdayMale, 
        female: weekdayFemale,
        total: weekdayTotal
      },
      { 
        period: '주말', 
        male: weekendMale, 
        female: weekendFemale,
        total: weekendTotal
      }
    ];
  };

  // Prophet 모델 훈련 함수
  const trainProphetModel = async () => {
    try {
      setPredictionLoading(true);
      console.log('Prophet 모델 훈련 시작...');
      
      const result = await pythonApiClient.trainModel(selectedDong);
      console.log('모델 훈련 완료:', result);
      
      setModelTrained(true);
      alert(`Prophet 모델 훈련 완료!\n정확도 (MAE): ${result.performance?.mae?.toFixed(1) || 'N/A'}`);
    } catch (error) {
      console.error('모델 훈련 실패:', error);
      alert('모델 훈련에 실패했습니다. Python 서버가 실행 중인지 확인해주세요.');
    } finally {
      setPredictionLoading(false);
    }
  };

  // Prophet 예측 실행 함수
  const runPrediction = async () => {
    try {
      setPredictionLoading(true);
      console.log('Prophet 예측 실행...');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const targetDate = tomorrow.toISOString().split('T')[0];
      
      const result = await pythonApiClient.predictHourlyPopulation(selectedDong, targetDate);
      console.log('예측 완료:', result);
      
      setPredictionData(result);
      alert(`내일(${targetDate}) 예측 완료!\n최대 인구: ${result.summary?.peak_population?.toLocaleString() || 'N/A'}명 (${result.summary?.peak_hour || 'N/A'}시)`);
    } catch (error) {
      console.error('예측 실패:', error);
      alert('예측에 실패했습니다. 먼저 모델을 훈련해주세요.');
    } finally {
      setPredictionLoading(false);
    }
  };

  // 예측 결과와 실제 데이터 비교
  const runPredictionComparison = async () => {
    if (!modelTrained) {
      setPredictionError('먼저 모델을 훈련해주세요.');
      return;
    }

    setComparisonLoading(true);
    setComparisonError(null);
    
    try {
      console.log('예측 비교 시작...');
      const targetDate = new Date().toISOString().split('T')[0]; // 오늘 날짜
      const result = await pythonApiClient.predictWithComparison(selectedDong, targetDate);
      console.log('예측 비교 완료:', result);
      setComparisonData(result);
    } catch (err) {
      console.error('예측 비교 실패:', err);
      setComparisonError(err.message);
    } finally {
      setComparisonLoading(false);
    }
  };

  // AI Agent 단계별 분석 실행 함수
  const runAgentAnalysis = async () => {
    try {
      setAgentLoading(true);
      setAgentError(null);
      setCurrentStep('초기화 중...');
      
      const dongInfo = gangnamDongs.find(dong => dong.code === selectedDong);
      const dongName = dongInfo?.name || '알 수 없는 동';
      
      // 현재 데이터 준비
      const populationData = {
        total: dailyData.length > 0 ? dailyData[0]?.total || 0 : 0,
        local: dailyData.length > 0 ? dailyData[0]?.local || 0 : 0,
        longForeigner: dailyData.length > 0 ? dailyData[0]?.longForeigner || 0 : 0,
        tempForeigner: dailyData.length > 0 ? dailyData[0]?.tempForeigner || 0 : 0
      };
      
      const timeStats = dailyData.slice(0, 6); // 처음 6개 시간대
      
      const genderStats = {
        male: genderAgeStats?.malePopulation || 0,
        female: genderAgeStats?.femalePopulation || 0
      };
      
      const ageStats = genderAgeStats?.maleAgeGroup || {};
      
      console.log('AI Agent 단계별 분석 시작:', dongName);
      setCurrentStep('인구 구성 분석 중...');
      
      const result = await agentApiClient.analyzeStepByStep(
        dongName,
        populationData,
        timeStats,
        genderStats,
        ageStats
      );
      
      setAgentAnalysis(result.analysis);
      setCurrentStep('분석 완료');
      console.log('AI Agent 분석 완료');
      
    } catch (error) {
      console.error('AI Agent 분석 실패:', error);
      setAgentError('AI Agent 분석에 실패했습니다. Agent 서버가 실행 중인지 확인해주세요.');
      setCurrentStep('분석 실패');
    } finally {
      setAgentLoading(false);
    }
  };

  // LangGraph Agent 분석 실행 함수 (원래 aigent.py 스타일)
  const runLangGraphAnalysis = async () => {
    try {
      setLangGraphLoading(true);
      setLangGraphError(null);
      
      const dongInfo = gangnamDongs.find(dong => dong.code === selectedDong);
      const dongName = dongInfo?.name || '알 수 없는 동';
      
      // 현재 데이터 준비 - 더 정확한 데이터 추출
      let populationData = {
        total: 0,
        local: 0,
        longForeigner: 0,
        tempForeigner: 0
      };

      // dailyData에서 최신 데이터 추출
      if (dailyData && dailyData.length > 0) {
        const latestData = dailyData[dailyData.length - 1]; // 최신 데이터 사용
        populationData = {
          total: Number(latestData?.totalPopulation || latestData?.total || 0),
          local: Number(latestData?.localPopulation || latestData?.local || 0),
          longForeigner: Number(latestData?.longForeignerPopulation || latestData?.longForeigner || 0),
          tempForeigner: Number(latestData?.tempForeignerPopulation || latestData?.tempForeigner || 0)
        };
      }

      // dailyData에서 시간대별 통계 추출 (새로운 DailyPopulationDto 구조 지원)
      const timeStats = dailyData.slice(0, 12).map(item => ({
        timeRange: item?.timeRange || '시간대 미정',
        totalPopulation: parseFloat(item?.totalPopulation || item?.total || 0),
        localPopulation: parseFloat(item?.localPopulation || item?.local || 0),
        longForeignerPopulation: parseFloat(item?.longForeignerPopulation || item?.longForeigner || 0),
        tempForeignerPopulation: parseFloat(item?.tempForeignerPopulation || item?.tempForeigner || 0),
        // 🔥 새로운 DailyPopulationDto에서 지원하는 성별 데이터도 활용 가능 (Double 타입)
        malePopulation: parseFloat(item?.malePopulation || 0),
        femalePopulation: parseFloat(item?.femalePopulation || 0)
      }));
      
      const genderStats = {
        male: parseFloat(genderAgeStats?.malePopulation || 0),
        female: parseFloat(genderAgeStats?.femalePopulation || 0),
        total: parseFloat(genderAgeStats?.total || 0)
      };
      
      const ageStats = genderAgeStats?.ageDistribution || genderAgeStats?.maleAgeGroup || [];
      
      console.log('LangGraph 분석 데이터 전송:', { 
        dongName, 
        populationData, 
        timeStatsCount: timeStats.length,
        genderStats, 
        ageStatsCount: Array.isArray(ageStats) ? ageStats.length : Object.keys(ageStats).length 
      });
      console.log('성별 데이터 상세:', genderStats);
      
      console.log('상세 인구 데이터:', populationData);
      console.log('시간대별 데이터 샘플:', timeStats.slice(0, 3));
      
      const result = await langGraphApiClient.analyzeWithLangGraph(
        dongName,
        populationData,
        timeStats,
        genderStats,
        ageStats
      );
      
      setLangGraphAnalysis(result);
      console.log('LangGraph Agent 분석 완료');
      
    } catch (error) {
      console.error('LangGraph Agent 분석 실패:', error);
      setLangGraphError('LangGraph Agent 분석에 실패했습니다. GPT-4o-mini 서버가 실행 중인지 확인해주세요.');
    } finally {
      setLangGraphLoading(false);
    }
  };

  // Overview Insights 생성 함수
  const runOverviewInsights = async () => {
    try {
      setOverviewInsightsLoading(true);
      setOverviewInsightsError(null);
      
      const dongInfo = gangnamDongs.find(dong => dong.code === selectedDong);
      const dongName = dongInfo?.name || '알 수 없는 동';
      
      // 현재 데이터 준비 - 동일한 방식으로 데이터 추출
      let populationData = {
        total: 0,
        local: 0,
        longForeigner: 0,
        tempForeigner: 0
      };

      if (dailyData && dailyData.length > 0) {
        const latestData = dailyData[dailyData.length - 1];
        populationData = {
          total: parseFloat(latestData?.totalPopulation || latestData?.total || 0),
          local: parseFloat(latestData?.localPopulation || latestData?.local || 0),
          longForeigner: parseFloat(latestData?.longForeignerPopulation || latestData?.longForeigner || 0),
          tempForeigner: parseFloat(latestData?.tempForeignerPopulation || latestData?.tempForeigner || 0)
        };
      }

      // 새로운 DailyPopulationDto 구조 지원
      const timeStats = dailyData.slice(0, 12).map(item => ({
        timeRange: item?.timeRange || '시간대 미정',
        totalPopulation: Number(item?.totalPopulation || item?.total || 0),
        localPopulation: Number(item?.localPopulation || item?.local || 0),
        longForeignerPopulation: Number(item?.longForeignerPopulation || item?.longForeigner || 0),
        tempForeignerPopulation: Number(item?.tempForeignerPopulation || item?.tempForeigner || 0)
      }));
      
      const genderStats = {
        male: Number(genderAgeStats?.malePopulation || 0),
        female: Number(genderAgeStats?.femalePopulation || 0),
        total: Number(genderAgeStats?.total || 0)
      };
      
      const ageStats = genderAgeStats?.ageDistribution || genderAgeStats?.maleAgeGroup || [];
      
      console.log('Overview Insights 데이터 전송:', { 
        dongName, 
        populationData, 
        timeStatsCount: timeStats.length,
        genderStats
      });
      
      const result = await overviewInsightsApiClient.generateOverviewInsights(
        dongName,
        populationData,
        timeStats,
        genderStats,
        ageStats
      );
      
      setOverviewInsights(result);
      
    } catch (err) {
      console.error('Overview Insights 생성 오류:', err);
      setOverviewInsightsError(err.message || 'Overview Insights 생성 중 오류가 발생했습니다.');
    } finally {
      setOverviewInsightsLoading(false);
    }
  };

  // 새로운 AI Bundle API 사용 (새로운 엔드포인트)
  const runOverviewInsightsFromBundle = async () => {
    try {
      setOverviewInsightsLoading(true);
      setOverviewInsightsError(null);
      
      const dongInfo = gangnamDongs.find(dong => dong.code === selectedDong);
      const dongName = dongInfo?.name || '알 수 없는 동';
      
      // 새로운 AI Bundle API 호출
      const today = new Date();
      const dateStr = today.getFullYear().toString() + 
                     (today.getMonth() + 1).toString().padStart(2, '0') + 
                     today.getDate().toString().padStart(2, '0');
      
      console.log(`AI Bundle API 호출: /population/ai/bundle/${selectedDong}?date=${dateStr}`);
      
      const aiBundleData = await aiBundleApiClient.getAiBundle(selectedDong, dateStr);
      
      console.log('AI Bundle 데이터 수신:', aiBundleData);
      
      // AI Bundle 데이터를 Overview Insights Agent로 전달
      const result = await aiBundleApiClient.generateInsightsFromBundle(aiBundleData);
      
      setOverviewInsights(result);
      console.log('AI Bundle 기반 인사이트 생성 완료');
      
    } catch (error) {
      console.error('AI Bundle API 오류:', error);
      setOverviewInsightsError(`AI Bundle 인사이트 생성 오류: ${error.message}`);
    } finally {
      setOverviewInsightsLoading(false);
    }
  };

  // Prophet 예측 차트 데이터 변환
  const getPredictionChartData = () => {
    if (!predictionData?.predictions) return [];
    
    return predictionData.predictions.map(pred => ({
      hour: pred.hour,
      predicted: pred.predicted_population,
      lower: pred.confidence_lower,
      upper: pred.confidence_upper,
      isWeekend: pred.is_weekend
    }));
  };

  const getRadarChartData = () => {
    if (!genderAgeStats) {
      console.log('레이더 차트 데이터가 없습니다.');
      return [];
    }
    
    const maleAgeGroup = genderAgeStats.maleAgeGroup || {};
    if (Object.keys(maleAgeGroup).length === 0) {
      console.log('남성 연령대 데이터가 없습니다.');
      return [];
    }
    
    const chartData = Object.entries(maleAgeGroup).map(([age, value]) => ({
      subject: age,
      A: value || 0,
      B: genderAgeStats.femaleAgeGroup?.[age] || 0,
      fullMark: Math.max(...Object.values(maleAgeGroup).map(v => v || 0))
    }));
    
    console.log('레이더 차트 데이터:', chartData);
    return chartData;
  };

  // 히트맵 데이터 변환 함수 (실제 API 데이터 사용)
  const getHeatmapData = () => {
    if (!dailyData || dailyData.length === 0) {
      console.log('히트맵 데이터가 없습니다.');
      return [];
    }

    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const heatmapData = [];

    // 실제 API 데이터를 기반으로 히트맵 생성
    dailyData.forEach((item) => {
      if (!item?.date || !item?.timeRange) {
        console.log('날짜 또는 시간대 정보가 없습니다:', item);
        return;
      }

      // 날짜 파싱 (YYYYMMDD 형식)
      const dateStr = item.date.toString();
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1; // JavaScript Date는 0부터 시작
      const day = parseInt(dateStr.substring(6, 8));
      
      const targetDate = new Date(year, month, day);
      const dayOfWeek = getDay(targetDate); // 0=일요일, 1=월요일, ..., 6=토요일
      const dayName = days[dayOfWeek];
      
      // 시간대 추출 (HH:MM-HH:MM 형식에서 시작 시간만 추출)
      let hour = 0;
      if (item.timeRange) {
        const timeMatch = item.timeRange.match(/^(\d{1,2}):\d{2}/);
        if (timeMatch) {
          hour = parseInt(timeMatch[1]);
        }
      }
      
      if (hour < 24) {
        heatmapData.push({
          day: dayName,
          hour: hour,
          value: item?.totalPopulation || 0,
          date: format(targetDate, 'yyyy-MM-dd'),
          dayOfWeek: dayOfWeek,
          timeRange: item?.timeRange || `${hour}:00`,
          timeZone: item?.timeZone || '',
          localPopulation: item?.localPopulation || 0,
          tempForeignerPopulation: item?.tempForeignerPopulation || 0,
          longForeignerPopulation: item?.longForeignerPopulation || 0
        });
      }
    });

    // 빈 셀 채우기 (7일 x 24시간)
    days.forEach((day, dayIndex) => {
      for (let hour = 0; hour < 24; hour++) {
        const existing = heatmapData.find(d => d.day === day && d.hour === hour);
        if (!existing) {
          // 현재 주의 해당 요일로 날짜 계산
          const currentDate = new Date();
          const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
          const targetDate = addDays(weekStart, dayIndex);
          
          heatmapData.push({
            day,
            hour,
            value: 0,
            date: format(targetDate, 'yyyy-MM-dd'),
            dayOfWeek: dayIndex,
            timeRange: `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`,
            timeZone: '',
            localPopulation: 0,
            tempForeignerPopulation: 0,
            longForeignerPopulation: 0
          });
        }
      }
    });

    // 요일 순서대로 정렬
    heatmapData.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek - b.dayOfWeek;
      }
      return a.hour - b.hour;
    });

    console.log('히트맵 데이터:', heatmapData);
    return heatmapData;
  };

  // 선택된 동 정보
  const selectedDongInfo = gangnamDongs.find(d => d.id === selectedDong);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">통계 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-black text-lg font-semibold mb-4">오류</div>
          <h1 className="text-2xl font-bold text-red-700 mb-2">오류 발생</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => router.push('/')} 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="gap-2 text-gray-600 hover:text-black hover:bg-transparent transition-colors flex items-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to home
              </button>
              <div className="h-4 w-px bg-gray-200"></div>
              <div>
                <h1 className="text-xl font-semibold text-black">
                  {gangnamDongs.find(d => d.id === selectedDong)?.name || 'District'} Analysis
                </h1>
                <p className="text-sm text-gray-600">Comprehensive population insights</p>
              </div>
            </div>
            
            {/* 네비게이션 */}
            <nav className="hidden md:flex items-center gap-6">
              <button
                onClick={() => router.push('/seoul-dashboard')}
                className="text-sm text-gray-600 hover:text-black transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push('/gangnam-dongs')}
                className="text-sm text-gray-600 hover:text-black transition-colors"
              >
                Regional Analysis
              </button>
              <button
                onClick={() => router.push('/detailed-stats')}
                className="text-sm text-black font-medium"
              >
                Analytics
              </button>
              <button
                onClick={() => router.push('/comparison-analysis')}
                className="text-sm text-gray-600 hover:text-black transition-colors"
              >
                비교분석
              </button>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 지역 선택 드롭다운 */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select District</label>
          <select
            value={selectedDong}
            onChange={(e) => setSelectedDong(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white min-w-[200px]"
          >
            {gangnamDongs.map(dong => (
              <option key={dong.id} value={dong.id}>
                {dong.name}
              </option>
            ))}
          </select>
        </div>

        {/* 핵심 지표 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm text-gray-600">Living population</span>
            </div>
            <div className="text-2xl font-bold text-black">
              {selectedDongInfo?.population?.toLocaleString() || 'N/A'}
            </div>
          </div>

          <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm text-gray-600">Population density</span>
            </div>
            <div className="text-2xl font-bold text-black">
              {selectedDongInfo?.density?.toLocaleString() || 'N/A'}/km²
            </div>
          </div>

          <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-sm text-gray-600">Peak time</span>
            </div>
            <div className="text-2xl font-bold text-black">18:00</div>
          </div>

          <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-gray-600">Peak day</span>
            </div>
            <div className="text-2xl font-bold text-black">Friday</div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="space-y-6">
          <div className="grid w-full grid-cols-5 bg-gray-100 rounded-lg p-1">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'overview' 
                  ? 'bg-white text-black shadow-sm' 
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('time')}
              className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'time' 
                  ? 'bg-white text-black shadow-sm' 
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Time Analysis
            </button>
            <button 
              onClick={() => setActiveTab('demographics')}
              className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'demographics' 
                  ? 'bg-white text-black shadow-sm' 
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Demographics
            </button>
            <button 
              onClick={() => setActiveTab('prediction')}
              className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'prediction' 
                  ? 'bg-white text-black shadow-sm' 
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Prediction
            </button>
            <button 
              onClick={() => setActiveTab('ai-analysis')}
              className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'ai-analysis' 
                  ? 'bg-white text-black shadow-sm' 
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              AI Analysis
            </button>
          </div>

          {/* Overview 탭 */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* AI 인사이트 섹션 */}
              <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-black">실용적 AI 인사이트</h3>
                  <button
                    onClick={runOverviewInsights}
                    disabled={overviewInsightsLoading || loading}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {overviewInsightsLoading ? '분석 중...' : '인사이트 생성'}
                  </button>
                </div>
                
                {overviewInsightsError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700">{overviewInsightsError}</p>
                  </div>
                )}

                <div className="min-h-32">
                  {overviewInsightsLoading ? (
                    <div className="flex items-center justify-center h-32 text-gray-500">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
                        <p>AI가 실용적인 인사이트를 생성하고 있습니다...</p>
                        <p className="text-sm text-gray-400 mt-2">교통, 식당, 사업, 생활패턴을 분석 중</p>
                      </div>
                    </div>
                  ) : overviewInsights?.insights ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {overviewInsights.insights.map((insight, index) => (
                        <div key={index} className="p-4 border border-gray-100 rounded-lg bg-gray-50">
                          <div className="flex items-center mb-3">
                            <span className="text-2xl mr-3">{insight.icon}</span>
                            <h4 className="font-semibold text-black">{insight.title}</h4>
                          </div>
                          <p className="text-gray-700 text-sm leading-relaxed">{insight.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-gray-500">
                      <div className="text-center">
                        <p>AI 인사이트를 생성하여 실용적인 정보를 확인해보세요</p>
                        <p className="text-sm text-gray-400 mt-2">교통, 맛집, 사업기회, 생활패턴 분석</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 일별 데이터 섹션 */}
              <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
                <h3 className="text-lg font-semibold text-black mb-4">일별 인구 데이터</h3>
                <div className="overflow-x-auto">
                  {dailyData && dailyData.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-900">날짜</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">시간대</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900">총 인구</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900">내국인</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900">장기 외국인</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900">단기 외국인</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyData.slice(0, 10).map((item, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-700">{item.date || 'N/A'}</td>
                            <td className="py-3 px-4 text-gray-700">{item.timeRange || 'N/A'}</td>
                            <td className="py-3 px-4 text-right text-gray-700">
                              {parseFloat(item.totalPopulation || item.total || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-700">
                              {parseFloat(item.localPopulation || item.local || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-700">
                              {parseFloat(item.longForeignerPopulation || item.longForeigner || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-700">
                              {parseFloat(item.tempForeignerPopulation || item.tempForeigner || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-gray-500">
                      <div className="text-center">
                        <p>일별 데이터가 없습니다</p>
                        <p className="text-sm text-gray-400 mt-2">백엔드에서 일별 데이터를 확인해주세요</p>
                      </div>
                    </div>
                  )}
                </div>
                {dailyData && dailyData.length > 10 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">총 {dailyData.length}개의 데이터 중 최근 10개 표시</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
                  <h3 className="text-lg font-semibold text-black mb-4">24-Hour Population Flow</h3>
                  <div className="h-80">
                    {(() => {
                      const timeBasedChartData = getTimeBasedChartData();
                      if (!timeBasedChartData || timeBasedChartData.length === 0) {
                        return (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">
                              <p>No time-based data available</p>
                            </div>
                          </div>
                        );
                      }
                      console.log('차트 데이터:', timeBasedChartData);
                      console.log('데이터 길이:', timeBasedChartData.length);
                      if (timeBasedChartData.length > 0) {
                        console.log('첫 번째 데이터 항목:', timeBasedChartData[0]);
                        console.log('데이터 키들:', Object.keys(timeBasedChartData[0]));
                      }
                                             return (
                         <div style={{ width: '100%', height: '100%' }}>
                           <DualAxisLineChart 
                             data={timeBasedChartData} 
                             width={800} 
                             height={320} 
                           />
                         </div>
                       );
                    })()}
                  </div>
                </div>

                <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
                  <h3 className="text-lg font-semibold text-black mb-4">Weekly Patterns</h3>
                  <div className="h-80">
                    {(() => {
                      const weekdayWeekendGenderChartData = getWeekdayWeekendGenderChartData();
                      if (!weekdayWeekendGenderChartData || weekdayWeekendGenderChartData.length === 0) {
                        return (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">

                              <p>No weekly data available</p>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={weekdayWeekendGenderChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="period" stroke="#9ca3af" fontSize={12} axisLine={false} tickLine={false} />
                            <YAxis stroke="#9ca3af" fontSize={12} axisLine={false} tickLine={false} />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px'
                              }}
                            />
                            <Bar 
                              dataKey="total" 
                              fill="#3b82f6" 
                              radius={[4, 4, 0, 0]}
                              label={(props) => {
                                const total = weekdayWeekendGenderChartData.reduce((sum, item) => sum + item.total, 0);
                                return <CustomBarLabel {...props} total={total} />;
                              }}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Time Analysis 탭 */}
          {activeTab === 'time' && (
            <div className="space-y-6">
              {/* 첫 번째 행: 주중/주말 비교와 주야간 비교 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 주중/주말 비교 차트 */}
                <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
                  <h3 className="text-lg font-semibold text-black mb-4">주중/주말 인구 비교</h3>
                  <div className="h-80">
                    {(() => {
                      const weekdayWeekendData = getWeekdayWeekendChartData();
                      if (!weekdayWeekendData || weekdayWeekendData.length === 0) {
                        return (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">

                              <p>주중/주말 데이터가 없습니다</p>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={weekdayWeekendData} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis 
                              dataKey="type" 
                              stroke="#6b7280" 
                              fontSize={12} 
                              axisLine={true} 
                              tickLine={true}
                            />
                            <YAxis 
                              stroke="#6b7280" 
                              fontSize={12} 
                              axisLine={true} 
                              tickLine={true}
                              tickFormatter={(value) => {
                                if (value >= 1000) {
                                  return `${(value / 1000).toFixed(1)}k`;
                                }
                                return value.toString();
                              }}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px'
                              }}
                              formatter={(value) => {
                                const total = weekdayWeekendData.reduce((sum, item) => sum + item.population, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return [`${Math.round(value).toLocaleString()}명 (${percentage}%)`, '인구'];
                              }}
                            />
                            <Bar 
                              dataKey="population" 
                              fill="#3b82f6" 
                              radius={[4, 4, 0, 0]}
                              label={(props) => {
                                const total = weekdayWeekendData.reduce((sum, item) => sum + item.population, 0);
                                return <CustomBarLabel {...props} total={total} />;
                              }}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </div>

                {/* 주야간 비교 차트 */}
                <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
                  <h3 className="text-lg font-semibold text-black mb-4">주야간 인구 분포</h3>
                  <div className="h-80">
                    {(() => {
                      if (!dayNightStats) {
                        return (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">

                              <p>주야간 데이터가 없습니다</p>
                            </div>
                          </div>
                        );
                      }
                      const dayNightData = [
                        { period: '주간 (06-18시)', population: dayNightStats.dayPopulation || 0, fill: '#fbbf24' },
                        { period: '야간 (18-06시)', population: dayNightStats.nightPopulation || 0, fill: '#1e40af' }
                      ];
                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={dayNightData}
                              dataKey="population"
                              nameKey="period"
                              cx="50%"
                              cy="45%"
                              outerRadius={100}
                              innerRadius={60}
                              fill="#3b82f6"
                              label={<CustomPieLabel />}
                            >
                              {dayNightData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px'
                              }}
                              formatter={(value, name, props) => {
                                const total = dayNightData.reduce((sum, item) => sum + item.population, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return [`${Math.round(value).toLocaleString()}명 (${percentage}%)`, '인구'];
                              }}
                            />
                            <Legend 
                              wrapperStyle={{ paddingTop: '10px' }}
                              formatter={(value, entry) => {
                                const total = dayNightData.reduce((sum, item) => sum + item.population, 0);
                                const percentage = total > 0 ? ((entry.payload.population / total) * 100).toFixed(1) : 0;
                                return `${value} (${percentage}%)`;
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </div>
              </div>


            </div>
          )}

          {/* Demographics 탭 */}
          {activeTab === 'demographics' && (
            <div className="space-y-6">
              {/* 첫 번째 행: 연령별 성별 분포 */}
              <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
                <h3 className="text-lg font-semibold text-black mb-4">연령별 성별 인구 분포</h3>
                <div className="h-96">
                  {(() => {
                    const ageGenderData = getAgeGenderChartData();
                    if (!ageGenderData || ageGenderData.length === 0) {
                      return (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          <div className="text-center">

                            <p>연령별 성별 데이터가 없습니다</p>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ageGenderData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="age" 
                            stroke="#6b7280" 
                            fontSize={12} 
                            axisLine={true} 
                            tickLine={true}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis 
                            stroke="#6b7280" 
                            fontSize={12} 
                            axisLine={true} 
                            tickLine={true}
                            tickFormatter={(value) => {
                              if (value >= 1000) {
                                return `${(value / 1000).toFixed(1)}k`;
                              }
                              return value.toString();
                            }}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                            formatter={(value, name) => {
                              const total = ageGenderData.reduce((sum, item) => sum + item.male + item.female, 0);
                              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                              return [
                                `${Math.round(value).toLocaleString()}명 (${percentage}%)`, 
                                name === 'male' ? '남성' : '여성'
                              ];
                            }}
                            labelFormatter={(label) => `연령대: ${label}`}
                          />
                          <Legend 
                            wrapperStyle={{ paddingTop: '10px' }}
                            formatter={(value) => value === 'male' ? '남성' : '여성'}
                          />
                          <Bar 
                            dataKey="male" 
                            fill="#3b82f6" 
                            name="male" 
                            radius={[2, 2, 0, 0]}
                            label={(props) => {
                              const total = ageGenderData.reduce((sum, item) => sum + item.male + item.female, 0);
                              return <CustomBarLabel {...props} total={total} />;
                            }}
                          />
                          <Bar 
                            dataKey="female" 
                            fill="#ef4444" 
                            name="female" 
                            radius={[2, 2, 0, 0]}
                            label={(props) => {
                              const total = ageGenderData.reduce((sum, item) => sum + item.male + item.female, 0);
                              return <CustomBarLabel {...props} total={total} />;
                            }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
                  <h3 className="text-lg font-semibold text-black mb-4">Gender Distribution</h3>
                  <div className="h-80">
                    {(() => {
                      const genderData = getGenderDistributionData();
                      if (!genderData || genderData.length === 0) {
                        return (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">
  
                              <p>No gender data available</p>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={genderData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="45%"
                              outerRadius={100}
                              innerRadius={60}
                              fill="#3b82f6"
                              label={<CustomPieLabel />}
                            >
                              {genderData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px'
                              }}
                              formatter={(value, name, props) => {
                                const total = genderData.reduce((sum, item) => sum + item.value, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return [`${Math.round(value).toLocaleString()}명 (${percentage}%)`, '인구'];
                              }}
                            />
                            <Legend 
                              formatter={(value, entry) => {
                                const total = genderData.reduce((sum, item) => sum + item.value, 0);
                                const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(1) : 0;
                                return `${value} (${percentage}%)`;
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </div>

                {/* dailyData 기반 시간대별 인구 변화 차트 */}
                <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
                  <h3 className="text-lg font-semibold text-black mb-4">일별 데이터 기반 시간대별 인구 변화</h3>
                  <div className="h-80">
                                         {(() => {
                       const dailyTimeChartData = getTimeBasedChartData();
                       if (!dailyTimeChartData || dailyTimeChartData.length === 0) {
                        return (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">
                              <p>일별 데이터가 없습니다</p>
                            </div>
                          </div>
                        );
                      }
                                             return (
                         <div style={{ width: '100%', height: '100%' }}>
                           <DualAxisLineChart 
                             data={dailyTimeChartData} 
                             width={800} 
                             height={320} 
                           />
                         </div>
                       );
                    })()}
                  </div>
                </div>

                <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
                  <h3 className="text-lg font-semibold text-black mb-4">Age Group Distribution</h3>
                  <div className="h-80">
                    {(() => {
                      const ageGroupChartData = getAgeGroupChartData();
                      if (!ageGroupChartData || ageGroupChartData.length === 0) {
                        return (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">

                              <p>No age group data available</p>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={ageGroupChartData} barCategoryGap="15%" barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="age" stroke="#9ca3af" fontSize={12} axisLine={false} tickLine={false} />
                            <YAxis stroke="#9ca3af" fontSize={12} axisLine={false} tickLine={false} />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px'
                              }}
                              formatter={(value, name) => {
                                const total = ageGroupChartData.reduce((sum, item) => sum + item.male + item.female, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return [
                                  `${Math.round(value).toLocaleString()}명 (${percentage}%)`, 
                                  name === 'male' ? 'Male' : 'Female'
                                ];
                              }}
                            />
                            <Bar 
                              dataKey="male" 
                              fill="#3b82f6" 
                              name="Male"
                              label={(props) => {
                                const total = ageGroupChartData.reduce((sum, item) => sum + item.male + item.female, 0);
                                return <CustomBarLabel {...props} total={total} />;
                              }}
                            />
                            <Bar 
                              dataKey="female" 
                              fill="#8b5cf6" 
                              name="Female"
                              label={(props) => {
                                const total = ageGroupChartData.reduce((sum, item) => sum + item.male + item.female, 0);
                                return <CustomBarLabel {...props} total={total} />;
                              }}
                            />
                            <Legend />
                          </BarChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Prediction 탭 */}
          {activeTab === 'prediction' && (
            <div className="space-y-6">
              <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
                <h3 className="text-lg font-semibold text-black mb-4">Population Prediction</h3>
                
                <div className="flex gap-4 mb-6">
                  <button
                    onClick={trainProphetModel}
                    disabled={predictionLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {predictionLoading ? 'Training...' : 'Train Model'}
                  </button>
                  <button
                    onClick={runPrediction}
                    disabled={predictionLoading || !modelTrained}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {predictionLoading ? 'Predicting...' : 'Run Prediction'}
                  </button>
                </div>

                <div className="h-96">
                  {(() => {
                    const predictionChartData = getPredictionChartData();
                    if (!predictionChartData || predictionChartData.length === 0) {
                      return (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          <div className="text-center">

                            <p>No prediction data available</p>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={predictionChartData} margin={{ top: 20, right: 30, bottom: 5, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="hour"
                            stroke="#9ca3af" 
                            fontSize={12} 
                            axisLine={false} 
                            tickLine={false}
                          />
                          <YAxis 
                            stroke="#9ca3af" 
                            fontSize={12} 
                            axisLine={false} 
                            tickLine={false}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="predicted" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={false}
                            name="Predicted Population"
                          />
                          <Legend />
                        </LineChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </div>
              </div>

              {/* Prophet 예측 섹션 */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-black mb-6">Prophet 인구 예측</h3>
                
                <div className="flex gap-4 mb-6">
                  <button
                    onClick={trainProphetModel}
                    disabled={predictionLoading}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {predictionLoading ? '훈련 중...' : '모델 훈련'}
                  </button>
                  
                  <button
                    onClick={runPredictionComparison}
                    disabled={!modelTrained || comparisonLoading}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {comparisonLoading ? '예측 중...' : '예측 + 실제 데이터 비교'}
                  </button>
                </div>

                {predictionError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700">{predictionError}</p>
                  </div>
                )}

                {comparisonError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700">{comparisonError}</p>
                  </div>
                )}

                {modelTrained && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-700">✅ Prophet 모델이 훈련되었습니다.</p>
                  </div>
                )}

                {/* 기존 예측 결과 */}
                {predictionData && (
                  <div className="space-y-6">
                    {/* 기존 예측 그래프들... */}
                  </div>
                )}

                {/* 예측 비교 결과 */}
                {comparisonData && (
                  <div className="space-y-6">
                    {/* 성능 지표 */}
                    {comparisonData.summary?.performance && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-black">
                            {comparisonData.summary.performance.mae.toFixed(1)}
                          </div>
                          <div className="text-sm text-gray-600">MAE</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-black">
                            {comparisonData.summary.performance.mape.toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-600">MAPE</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-black">
                            {comparisonData.summary.performance.rmse.toFixed(1)}
                          </div>
                          <div className="text-sm text-gray-600">RMSE</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-black">
                            {comparisonData.summary.performance.data_points}
                          </div>
                          <div className="text-sm text-gray-600">데이터 포인트</div>
                        </div>
                      </div>
                    )}

                    {/* 예측 vs 실제 비교 그래프 */}
                    <div>
                      <h4 className="text-lg font-medium text-black mb-4">
                        예측 vs 실제 데이터 비교 ({comparisonData.prediction_date} vs {comparisonData.actual_date})
                      </h4>
                      <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={comparisonData.comparison_data}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="hour" 
                            tick={{ fontSize: 12 }}
                            label={{ value: '시간', position: 'insideBottom', offset: -10 }}
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => value.toLocaleString()}
                            label={{ value: '인구', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip 
                            formatter={(value, name) => [value.toLocaleString(), name]}
                            labelFormatter={(label) => `${label}시`}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="predicted_population"
                            stroke="#000000" 
                            strokeWidth={2}
                            name="예측 인구"
                            dot={{ fill: '#000000', strokeWidth: 2, r: 4 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="actual_population"
                            stroke="#666666" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="실제 인구"
                            dot={{ fill: '#666666', strokeWidth: 2, r: 4 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 예측 오류 분석 */}
                    <div>
                      <h4 className="text-lg font-medium text-black mb-4">예측 오류 분석</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={comparisonData.comparison_data.filter(item => item.prediction_error !== null)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" />
                          <YAxis />
                          <Tooltip formatter={(value, name) => [value.toLocaleString(), name]} />
                          <Legend />
                          <Bar dataKey="prediction_error" fill="#FF6B6B" name="예측 오류" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 요약 통계 */}
                    {comparisonData.summary && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h5 className="font-medium text-black mb-3">예측 결과</h5>
                          <div className="space-y-2 text-sm">
                            <div>최대 인구: {comparisonData.summary.prediction.peak_population?.toLocaleString()}명 ({comparisonData.summary.prediction.peak_hour}시)</div>
                            <div>최소 인구: {comparisonData.summary.prediction.min_population?.toLocaleString()}명 ({comparisonData.summary.prediction.min_hour}시)</div>
                            <div>평균 인구: {comparisonData.summary.prediction.avg_population?.toLocaleString()}명</div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h5 className="font-medium text-black mb-3">실제 데이터</h5>
                          <div className="space-y-2 text-sm">
                            <div>최대 인구: {comparisonData.summary.actual.peak_population?.toLocaleString()}명 ({comparisonData.summary.actual.peak_hour}시)</div>
                            <div>최소 인구: {comparisonData.summary.actual.min_population?.toLocaleString()}명 ({comparisonData.summary.actual.min_hour}시)</div>
                            <div>평균 인구: {comparisonData.summary.actual.avg_population?.toLocaleString()}명</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Analysis 탭 */}
          {activeTab === 'ai-analysis' && (
            <div className="space-y-6">
              <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
                <h3 className="text-lg font-semibold text-black mb-4">AI Agent 단계별 분석</h3>
                
                <div className="flex gap-4 mb-6">
                  <button
                    onClick={runLangGraphAnalysis}
                    disabled={langGraphLoading || loading}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {langGraphLoading ? 'LangGraph 분석 중...' : 'GPT-4o-mini 분석 시작'}
                  </button>
                  
                  {(langGraphLoading || agentLoading) && (
                    <div className="flex items-center text-gray-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                      <span className="text-sm">
                        {langGraphLoading ? 'GPT-4o-mini로 분석 중...' : currentStep}
                      </span>
                    </div>
                  )}
                </div>

                {(agentError || langGraphError) && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700">{langGraphError || agentError}</p>
                  </div>
                )}

                <div className="min-h-96">
                  {langGraphLoading ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                        <p>GPT-4o-mini가 LangGraph로 분석하고 있습니다...</p>
                        <p className="text-sm text-gray-400 mt-2">고품질 분석을 위해 잠시만 기다려주세요</p>
                      </div>
                    </div>
                  ) : langGraphAnalysis ? (
                    <div className="space-y-6">
                      {/* 데이터 요약 */}
                      {langGraphAnalysis.data_summary && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                          <h4 className="text-lg font-semibold text-black mb-3">📊 데이터 요약</h4>
                          <div className="text-gray-700 leading-relaxed">
                            {langGraphAnalysis.data_summary}
                          </div>
                        </div>
                      )}
                      
                      {/* 분석 로그 */}
                      {langGraphAnalysis.analysis_log && langGraphAnalysis.analysis_log.map((log, index) => (
                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                          <h4 className="text-lg font-semibold text-black mb-3 flex items-center">
                            <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm mr-2">
                              {index + 1}
                            </span>
                            {log.analysis}
                          </h4>
                          <div className="text-gray-700 leading-relaxed pl-8">
                            {log.result}
                          </div>
                        </div>
                      ))}
                      
                      {/* 최종 보고서 */}
                      {langGraphAnalysis.final_report && (
                        <div className="bg-black text-white rounded-lg p-6">
                          <h4 className="text-lg font-semibold mb-3">🎯 최종 분석 보고서</h4>
                          <div className="whitespace-pre-wrap leading-relaxed">
                            {langGraphAnalysis.final_report}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : agentLoading ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <div className="animate-pulse space-y-4">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                          <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto"></div>
                        </div>
                        <p className="mt-4">AI Agent가 단계별로 분석하고 있습니다...</p>
                        <p className="text-sm text-gray-400 mt-2">{currentStep}</p>
                      </div>
                    </div>
                  ) : agentAnalysis ? (
                    <div className="space-y-6">
                      {/* 단계별 분석 결과 */}
                      {agentAnalysis.demographic_analysis && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                          <h4 className="text-lg font-semibold text-black mb-3 flex items-center">
                            <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm mr-2">1</span>
                            인구 구성 분석
                          </h4>
                          <div className="text-gray-700 leading-relaxed">
                            {agentAnalysis.demographic_analysis}
                          </div>
                        </div>
                      )}
                      
                      {agentAnalysis.temporal_analysis && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                          <h4 className="text-lg font-semibold text-black mb-3 flex items-center">
                            <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm mr-2">2</span>
                            시간 패턴 분석
                          </h4>
                          <div className="text-gray-700 leading-relaxed">
                            {agentAnalysis.temporal_analysis}
                          </div>
                        </div>
                      )}
                      
                      {agentAnalysis.regional_analysis && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                          <h4 className="text-lg font-semibold text-black mb-3 flex items-center">
                            <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-sm mr-2">3</span>
                            지역 특성 분석
                          </h4>
                          <div className="text-gray-700 leading-relaxed">
                            {agentAnalysis.regional_analysis}
                          </div>
                        </div>
                      )}
                      
                      {agentAnalysis.policy_analysis && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                          <h4 className="text-lg font-semibold text-black mb-3 flex items-center">
                            <span className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-sm mr-2">4</span>
                            정책 제안 분석
                          </h4>
                          <div className="text-gray-700 leading-relaxed">
                            {agentAnalysis.policy_analysis}
                          </div>
                        </div>
                      )}
                      
                      {agentAnalysis.final_summary && (
                        <div className="bg-black text-white rounded-lg p-6">
                          <h4 className="text-lg font-semibold mb-3 flex items-center">
                            <span className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-sm mr-2">📋</span>
                            종합 분석 결과
                          </h4>
                          <div className="whitespace-pre-wrap leading-relaxed">
                            {agentAnalysis.final_summary}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <p>AI Agent를 실행하여 단계별 인구 데이터 분석을 확인해보세요</p>
                        <p className="text-sm text-gray-400 mt-2">성능 최적화를 위해 단계별로 분석합니다</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
