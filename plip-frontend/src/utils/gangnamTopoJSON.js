import * as topojson from 'topojson-client';

// 강남구 동별 TopoJSON 데이터를 가져오는 함수
export const fetchGangnamDongsTopoJSON = async () => {
  try {
    const response = await fetch('/data/topomap_dong.json');
    const topoJsonData = await response.json();
    return topoJsonData;
  } catch (error) {
    console.error('강남구 동별 TopoJSON 데이터 로드 실패:', error);
    return null;
  }
};

// 강남구 동별 경계만 추출하는 함수
export const extractGangnamDongs = (topoJsonData) => {
  try {
    if (!topoJsonData || !topoJsonData.objects) {
      throw new Error('유효하지 않은 TopoJSON 데이터입니다.');
    }

    // 강남구 동별 코드 (실제 데이터 기반)
    const gangnamDongCodes = [
      "11680510", // 신사동
      "11680521", // 논현1동
      "11680531", // 논현2동
      "11680545", // 압구정동
      "11680565", // 청담동
      "11680580", // 삼성1동
      "11680590", // 삼성2동
      "11680600", // 대치1동
      "11680610", // 대치2동
      "11680631", // 대치4동
      "11680640", // 역삼1동
      "11680650", // 역삼2동
      "11680655", // 도곡1동
      "11680656", // 도곡2동
      "11680660", // 개포1동
      "11680670", // 개포2동
      "11680740", // 개포3동
      "11680690", // 개포4동
      "11680700", // 세곡동
      "11680720", // 일원본동
      "11680730", // 일원1동
      "11680750"  // 수서동
    ];

    // 강남구 동별 지오메트리 찾기
    const gangnamDongs = [];
    
    // TopoJSON의 모든 객체를 순회하면서 강남구 동별 데이터 찾기
    Object.keys(topoJsonData.objects).forEach(objectKey => {
      const object = topoJsonData.objects[objectKey];
      
      if (object.geometries) {
        object.geometries.forEach(geometry => {
          if (geometry.properties && geometry.properties.ADM_CD) {
            const dongCode = geometry.properties.ADM_CD;
            if (gangnamDongCodes.includes(dongCode)) {
              gangnamDongs.push({
                ...geometry,
                properties: {
                  ...geometry.properties,
                  id: dongCode,
                  name: geometry.properties.ADM_NM || getDongName(dongCode)
                }
              });
            }
          }
        });
      }
    });

    if (gangnamDongs.length === 0) {
      throw new Error('강남구 동별 데이터를 찾을 수 없습니다.');
    }

    // 강남구 동별만 포함하는 새로운 TopoJSON 객체 생성
    const gangnamTopoJSON = {
      type: "Topology",
      arcs: topoJsonData.arcs,
      transform: topoJsonData.transform,
      objects: {
        "강남구동별": {
          type: "GeometryCollection",
          geometries: gangnamDongs
        }
      }
    };

    return gangnamTopoJSON;
  } catch (error) {
    console.error('강남구 동별 추출 중 오류:', error);
    return null;
  }
};

// 동 코드로 동 이름을 가져오는 함수
const getDongName = (dongCode) => {
  const dongNames = {
    "11680510": "신사동",
    "11680521": "논현1동",
    "11680531": "논현2동",
    "11680545": "압구정동",
    "11680565": "청담동",
    "11680580": "삼성1동",
    "11680590": "삼성2동",
    "11680600": "대치1동",
    "11680610": "대치2동",
    "11680631": "대치4동",
    "11680640": "역삼1동",
    "11680650": "역삼2동",
    "11680655": "도곡1동",
    "11680656": "도곡2동",
    "11680660": "개포1동",
    "11680670": "개포2동",
    "11680740": "개포3동",
    "11680690": "개포4동",
    "11680700": "세곡동",
    "11680720": "일원본동",
    "11680730": "일원1동",
    "11680750": "수서동"
  };
  return dongNames[dongCode] || "알 수 없는 동";
};

// 강남구 동별 TopoJSON을 GeoJSON으로 변환
export const convertGangnamDongsToGeoJSON = (gangnamTopoJSON) => {
  try {
    if (!gangnamTopoJSON) return null;
    
    const geoJson = topojson.feature(gangnamTopoJSON, gangnamTopoJSON.objects['강남구동별']);
    return geoJson;
  } catch (error) {
    console.error('GeoJSON 변환 중 오류:', error);
    return null;
  }
};

// 강남구 동별 경계를 생성하는 함수 (실제 데이터가 없을 때 사용)
export const createGangnamDongsGeoJSON = () => {
  // 강남구 중심점: [37.5172, 127.0473]
  const center = [37.5172, 127.0473];
  
  // 동별 상대적 위치 (실제 경계가 아니므로 근사치)
  const dongPositions = {
    "11680510": { offset: [-0.005, -0.015], name: "신사동" },
    "11680521": { offset: [-0.005, -0.005], name: "논현1동" },
    "11680531": { offset: [-0.005, 0.005], name: "논현2동" },
    "11680545": { offset: [0.010, -0.010], name: "압구정동" },
    "11680565": { offset: [0.000, 0.000], name: "청담동" },
    "11680580": { offset: [-0.010, 0.010], name: "삼성1동" },
    "11680590": { offset: [-0.010, 0.020], name: "삼성2동" },
    "11680600": { offset: [-0.020, 0.010], name: "대치1동" },
    "11680610": { offset: [-0.020, 0.020], name: "대치2동" },
    "11680631": { offset: [-0.020, 0.000], name: "대치4동" },
    "11680640": { offset: [-0.020, -0.005], name: "역삼1동" },
    "11680650": { offset: [-0.020, -0.015], name: "역삼2동" },
    "11680655": { offset: [-0.030, 0.005], name: "도곡1동" },
    "11680656": { offset: [-0.030, 0.015], name: "도곡2동" },
    "11680660": { offset: [-0.030, 0.025], name: "개포1동" },
    "11680670": { offset: [-0.030, 0.035], name: "개포2동" },
    "11680740": { offset: [-0.030, 0.045], name: "개포3동" },
    "11680690": { offset: [-0.030, 0.055], name: "개포4동" },
    "11680700": { offset: [-0.050, 0.025], name: "세곡동" },
    "11680720": { offset: [-0.030, 0.035], name: "일원본동" },
    "11680730": { offset: [-0.030, 0.045], name: "일원1동" },
    "11680750": { offset: [-0.040, 0.045], name: "수서동" }
  };

  const features = Object.entries(dongPositions).map(([id, pos]) => {
    const lat = center[0] + pos.offset[0];
    const lng = center[1] + pos.offset[1];
    
    // 각 동을 작은 사각형으로 표현
    const size = 0.003; // 약 300m x 300m
    
    return {
      type: "Feature",
      properties: {
        id: id,
        name: pos.name,
        population: Math.floor(Math.random() * 20000) + 10000 // 임시 인구 데이터
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [lng - size, lat - size],
          [lng + size, lat - size],
          [lng + size, lat + size],
          [lng - size, lat + size],
          [lng - size, lat - size]
        ]]
      }
    };
  });

  return {
    type: "FeatureCollection",
    features: features
  };
};
