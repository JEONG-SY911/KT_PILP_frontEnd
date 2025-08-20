import * as topojson from 'topojson-client';

// topomap_dong.json에서 행정동 데이터 추출 및 변환
export const processDongTopoJSON = (topoData) => {
  try {
    // TopoJSON에서 행정동 객체 찾기 (실제 키는 파일에 따라 다를 수 있음)
    const dongObject = topoData.objects.admdong_seoul_codeEdit_1 || topoData.objects.dongs || topoData.objects.admdong || topoData.objects.dong;
    
    if (!dongObject) {
      console.error('행정동 객체를 찾을 수 없습니다. 사용 가능한 객체:', Object.keys(topoData.objects));
      return null;
    }

    // TopoJSON을 GeoJSON으로 변환
    const geoJsonData = topojson.feature(topoData, dongObject);
    
    console.log('행정동 GeoJSON 데이터:', geoJsonData);
    
    return geoJsonData;
  } catch (error) {
    console.error('행정동 TopoJSON 처리 중 오류:', error);
    return null;
  }
};

// 특정 구의 행정동만 필터링
export const filterDongsByDistrict = (geoJsonData, districtName) => {
  if (!geoJsonData || !geoJsonData.features) {
    return null;
  }

  const filteredFeatures = geoJsonData.features.filter(feature => {
    const properties = feature.properties;
    // 행정동 코드나 이름으로 구 필터링
    const dongCode = properties.ADM_CD || properties.adm_cd || properties.dongCode;
    const dongName = properties.ADM_NM || properties.adm_nm || properties.dongName;
    
    if (districtName === '강남구') {
      // 강남구는 11680으로 시작하는 행정동 코드
      return dongCode && dongCode.startsWith('11680');
    } else if (districtName === '강동구') {
      return dongCode && dongCode.startsWith('11740');
    } else if (districtName === '강북구') {
      return dongCode && dongCode.startsWith('11305');
    } else if (districtName === '강서구') {
      return dongCode && dongCode.startsWith('11500');
    } else if (districtName === '관악구') {
      return dongCode && dongCode.startsWith('11620');
    } else if (districtName === '광진구') {
      return dongCode && dongCode.startsWith('11215');
    } else if (districtName === '구로구') {
      return dongCode && dongCode.startsWith('11530');
    } else if (districtName === '금천구') {
      return dongCode && dongCode.startsWith('11545');
    } else if (districtName === '노원구') {
      return dongCode && dongCode.startsWith('11350');
    } else if (districtName === '도봉구') {
      return dongCode && dongCode.startsWith('11320');
    } else if (districtName === '동대문구') {
      return dongCode && dongCode.startsWith('11230');
    } else if (districtName === '동작구') {
      return dongCode && dongCode.startsWith('11590');
    } else if (districtName === '마포구') {
      return dongCode && dongCode.startsWith('11440');
    } else if (districtName === '서대문구') {
      return dongCode && dongCode.startsWith('11410');
    } else if (districtName === '서초구') {
      return dongCode && dongCode.startsWith('11650');
    } else if (districtName === '성동구') {
      return dongCode && dongCode.startsWith('11200');
    } else if (districtName === '성북구') {
      return dongCode && dongCode.startsWith('11290');
    } else if (districtName === '송파구') {
      return dongCode && dongCode.startsWith('11710');
    } else if (districtName === '양천구') {
      return dongCode && dongCode.startsWith('11470');
    } else if (districtName === '영등포구') {
      return dongCode && dongCode.startsWith('11560');
    } else if (districtName === '용산구') {
      return dongCode && dongCode.startsWith('11170');
    } else if (districtName === '은평구') {
      return dongCode && dongCode.startsWith('11380');
    } else if (districtName === '종로구') {
      return dongCode && dongCode.startsWith('11110');
    } else if (districtName === '중구') {
      return dongCode && dongCode.startsWith('11140');
    } else if (districtName === '중랑구') {
      return dongCode && dongCode.startsWith('11260');
    }
    
    // 기본적으로 모든 행정동 반환
    return true;
  });

  return {
    type: 'FeatureCollection',
    features: filteredFeatures
  };
};

// 행정동 중심점 계산
export const calculateDongCenter = (feature) => {
  try {
    const coordinates = feature.geometry.coordinates;
    
    if (feature.geometry.type === 'Polygon') {
      // 단일 폴리곤의 중심점 계산
      const coords = coordinates[0]; // 외곽 경계
      let sumX = 0, sumY = 0;
      
      coords.forEach(coord => {
        sumX += coord[0];
        sumY += coord[1];
      });
      
      return [sumY / coords.length, sumX / coords.length]; // [lat, lng]
    } else if (feature.geometry.type === 'MultiPolygon') {
      // 다중 폴리곤의 중심점 계산
      let sumX = 0, sumY = 0, totalPoints = 0;
      
      coordinates.forEach(polygon => {
        const coords = polygon[0]; // 각 폴리곤의 외곽 경계
        coords.forEach(coord => {
          sumX += coord[0];
          sumY += coord[1];
          totalPoints++;
        });
      });
      
      return [sumY / totalPoints, sumX / totalPoints]; // [lat, lng]
    }
    
    return null;
  } catch (error) {
    console.error('행정동 중심점 계산 중 오류:', error);
    return null;
  }
};

// 행정동 데이터 로드
export const loadDongTopoJSON = async () => {
  try {
    const response = await fetch('/data/topomap_dong.json');
    if (!response.ok) {
      throw new Error('행정동 데이터를 불러올 수 없습니다.');
    }
    
    const topoData = await response.json();
    return processDongTopoJSON(topoData);
  } catch (error) {
    console.error('행정동 TopoJSON 로드 중 오류:', error);
    return null;
  }
};
