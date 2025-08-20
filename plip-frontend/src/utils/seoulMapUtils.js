// 서울시 TopoJSON 데이터를 SVG 경로로 변환하는 유틸리티
import * as topojson from 'topojson-client';

// TopoJSON을 GeoJSON으로 변환하는 함수
export function convertTopoJsonToGeoJson(topojsonData) {
  try {
    // TopoJSON을 GeoJSON으로 변환
    const geoJson = topojson.feature(topojsonData, topojsonData.objects['서울시 자치구 경계3']);
    return geoJson;
  } catch (error) {
    console.error('TopoJSON 변환 중 오류:', error);
    return null;
  }
}

// GeoJSON에서 구별 경계 데이터 추출
export function extractDistrictBoundaries(geoJsonData) {
  const districts = {};
  
  if (!geoJsonData || !geoJsonData.features) {
    console.error('GeoJSON 데이터를 찾을 수 없습니다.');
    return districts;
  }
  
  geoJsonData.features.forEach(feature => {
    if (feature.properties) {
      const { SIG_CD, SIG_KOR_NM } = feature.properties;
      const districtCode = SIG_CD;
      const districtName = SIG_KOR_NM;
      
      if (feature.geometry && feature.geometry.coordinates) {
        // MultiPolygon 또는 Polygon 처리
        let coordinates = [];
        if (feature.geometry.type === 'Polygon') {
          coordinates = feature.geometry.coordinates[0]; // 외곽 경계만 사용
        } else if (feature.geometry.type === 'MultiPolygon') {
          coordinates = feature.geometry.coordinates[0][0]; // 첫 번째 폴리곤의 외곽 경계
        }
        
        if (coordinates.length > 0) {
          districts[districtCode] = {
            name: districtName,
            code: districtCode,
            coordinates: coordinates
          };
        }
      }
    }
  });
  
  return districts;
}

// 좌표를 SVG viewBox에 맞게 스케일링하는 함수 (통합된 서울시 모양으로)
export function scaleCoordinates(coordinates, viewBox) {
  if (!coordinates || coordinates.length === 0) return [];
  
  // 좌표의 경계 찾기
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  coordinates.forEach(coord => {
    minX = Math.min(minX, coord[0]);
    minY = Math.min(minY, coord[1]);
    maxX = Math.max(maxX, coord[0]);
    maxY = Math.max(maxY, coord[1]);
  });
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  // 스케일 계산 - 더 작고 통합된 모양으로
  const scaleX = viewBox.width / width;
  const scaleY = viewBox.height / height;
  const scale = Math.min(scaleX, scaleY) * 0.6; // 60% 크기로 축소하여 통합감 증가
  
  // 좌표 변환 - 중앙 정렬
  const centerX = viewBox.x + viewBox.width / 2;
  const centerY = viewBox.y + viewBox.height / 2;
  const dataCenterX = minX + width / 2;
  const dataCenterY = minY + height / 2;
  
  return coordinates.map(coord => [
    (coord[0] - dataCenterX) * scale + centerX,
    (coord[1] - dataCenterY) * scale + centerY
  ]);
}

// 좌표를 SVG 경로 문자열로 변환하는 함수
export function coordinatesToPath(coordinates) {
  if (!coordinates || coordinates.length === 0) return '';
  
  let path = `M ${coordinates[0][0]} ${coordinates[0][1]}`;
  
  for (let i = 1; i < coordinates.length; i++) {
    path += ` L ${coordinates[i][0]} ${coordinates[i][1]}`;
  }
  
  path += ' Z';
  return path;
}

// 구별 색상 정의
export const districtColors = {
  '11110': '#FF6B6B', // 종로구
  '11140': '#4ECDC4', // 중구
  '11170': '#45B7D1', // 용산구
  '11200': '#96CEB4', // 성동구
  '11215': '#FFEAA7', // 광진구
  '11230': '#DDA0DD', // 동대문구
  '11260': '#98D8C8', // 중랑구
  '11290': '#F7DC6F', // 성북구
  '11305': '#BB8FCE', // 강북구
  '11320': '#85C1E9', // 도봉구
  '11350': '#F8C471', // 노원구
  '11380': '#82E0AA', // 은평구
  '11410': '#F1948A', // 서대문구
  '11440': '#85C1E9', // 마포구
  '11470': '#F7DC6F', // 양천구
  '11500': '#D7BDE2', // 강서구
  '11530': '#A9CCE3', // 구로구
  '11545': '#FAD7A0', // 금천구
  '11560': '#ABEBC6', // 영등포구
  '11590': '#FDEBD0', // 동작구
  '11620': '#D5A6BD', // 관악구
  '11650': '#A2D9CE', // 서초구
  '11680': '#F9E79F', // 강남구
  '11710': '#D2B4DE', // 송파구
  '11740': '#AED6F1'  // 강동구
};

// 구별 중심점 계산
export function calculateDistrictCenter(coordinates) {
  if (!coordinates || coordinates.length === 0) return { x: 0, y: 0 };
  
  let sumX = 0, sumY = 0;
  coordinates.forEach(coord => {
    sumX += coord[0];
    sumY += coord[1];
  });
  
  return {
    x: sumX / coordinates.length,
    y: sumY / coordinates.length
  };
}
