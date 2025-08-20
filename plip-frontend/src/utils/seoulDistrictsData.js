// 서울시 자치구 실제 데이터 (2024년 기준)
export const seoulDistrictsData = [
  { name: '종로구', population: 149608, area: 23.91, density: 6256 },
  { name: '중구', population: 131214, area: 9.96, density: 13174 },
  { name: '용산구', population: 217194, area: 21.87, density: 9932 },
  { name: '성동구', population: 281289, area: 16.82, density: 16723 },
  { name: '광진구', population: 348652, area: 17.06, density: 20433 },
  { name: '동대문구', population: 358603, area: 14.22, density: 25226 },
  { name: '중랑구', population: 385349, area: 18.50, density: 20832 },
  { name: '성북구', population: 435037, area: 24.58, density: 17700 },
  { name: '강북구', population: 289374, area: 23.61, density: 12258 },
  { name: '도봉구', population: 306032, area: 20.65, density: 14819 },
  { name: '노원구', population: 496552, area: 35.44, density: 14010 },
  { name: '은평구', population: 465350, area: 29.71, density: 15663 },
  { name: '서대문구', population: 318622, area: 17.63, density: 18073 },
  { name: '마포구', population: 372745, area: 23.85, density: 15626 },
  { name: '양천구', population: 434351, area: 17.41, density: 24953 },
  { name: '강서구', population: 562194, area: 41.45, density: 13563 },
  { name: '구로구', population: 411916, area: 20.12, density: 20472 },
  { name: '금천구', population: 239070, area: 13.02, density: 18364 },
  { name: '영등포구', population: 397173, area: 24.55, density: 16177 },
  { name: '동작구', population: 387352, area: 16.35, density: 23684 },
  { name: '관악구', population: 495620, area: 29.57, density: 16762 },
  { name: '서초구', population: 413076, area: 46.97, density: 8795 },
  { name: '강남구', population: 563215, area: 39.50, density: 14259 },
  { name: '송파구', population: 656310, area: 33.88, density: 19374 },
  { name: '강동구', population: 481474, area: 24.59, density: 19580 }
];

// 특정 자치구 데이터 조회
export const getDistrictData = (districtName) => {
  return seoulDistrictsData.find(district => district.name === districtName);
};

// 전체 서울시 통계 계산
export const getSeoulTotalStats = () => {
  const totalPopulation = seoulDistrictsData.reduce((sum, district) => sum + district.population, 0);
  const totalArea = seoulDistrictsData.reduce((sum, district) => sum + district.area, 0);
  const averageDensity = Math.round(totalPopulation / totalArea);
  
  return {
    totalPopulation,
    totalArea: Math.round(totalArea * 100) / 100, // 소수점 2자리
    averageDensity,
    districtCount: seoulDistrictsData.length
  };
};

// 인구 순위별 정렬
export const getDistrictsByPopulation = (ascending = false) => {
  return [...seoulDistrictsData].sort((a, b) => 
    ascending ? a.population - b.population : b.population - a.population
  );
};

// 인구밀도 순위별 정렬
export const getDistrictsByDensity = (ascending = false) => {
  return [...seoulDistrictsData].sort((a, b) => 
    ascending ? a.density - b.density : b.density - a.density
  );
};
