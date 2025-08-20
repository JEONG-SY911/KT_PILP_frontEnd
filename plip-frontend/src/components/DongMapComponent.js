'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, Popup } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 행정동 레이어 컴포넌트
function DongLayer({ geoJsonData, selectedDong, onDongClick, onDongHover }) {
  const map = useMap();

  useEffect(() => {
    if (geoJsonData && geoJsonData.features) {
      // 지도 범위를 행정동 데이터에 맞게 조정
      const bounds = [];
      geoJsonData.features.forEach(feature => {
        if (feature.geometry && feature.geometry.coordinates) {
          // 좌표를 bounds에 추가
          if (feature.geometry.type === 'Polygon') {
            feature.geometry.coordinates[0].forEach(coord => {
              bounds.push([coord[1], coord[0]]); // [lat, lng]
            });
          } else if (feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach(polygon => {
              polygon[0].forEach(coord => {
                bounds.push([coord[1], coord[0]]); // [lat, lng]
              });
            });
          }
        }
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [geoJsonData, map]);

  const onEachFeature = (feature, layer) => {
    const properties = feature.properties;
    let dongName = properties.ADM_NM || properties.adm_nm || properties.dongName || '알 수 없음';
    
    // "서울특별시 강남구" 부분 제거하고 동 이름만 추출
    if (dongName && dongName.includes('서울특별시 강남구')) {
      dongName = dongName.replace('서울특별시 강남구 ', '');
    }
    
    const dongCode = properties.ADM_CD || properties.adm_cd || properties.dongCode || '';

    // 팝업 내용
    const popupContent = `
      <div style="text-align: center;">
        <h3 style="margin: 0 0 10px 0; color: #333;">${dongName}</h3>
        <p style="margin: 5px 0; color: #666;">행정동 코드: ${dongCode}</p>
        <button 
          onclick="window.parent.postMessage({type: 'dongClick', dongName: '${dongName}', dongCode: '${dongCode}'}, '*')"
          style="background: #0070f3; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 10px;">
          상세 정보 보기
        </button>
      </div>
    `;

    layer.bindPopup(popupContent);

    // 클릭 이벤트
    layer.on('click', () => {
      if (onDongClick) {
        onDongClick(feature);
      }
    });

    // 호버 이벤트
    layer.on('mouseover', () => {
      layer.setStyle({
        fillOpacity: 0.3,
        weight: 3
      });
      if (onDongHover) {
        onDongHover(feature, true);
      }
    });

    layer.on('mouseout', () => {
      layer.setStyle({
        fillOpacity: 0.7,
        weight: 2
      });
      if (onDongHover) {
        onDongHover(feature, false);
      }
    });
  };

  const style = (feature) => {
    const properties = feature.properties;
    let dongName = properties.ADM_NM || properties.adm_nm || properties.dongName;
    
    // "서울특별시 강남구" 부분 제거하고 동 이름만 추출
    if (dongName && dongName.includes('서울특별시 강남구')) {
      dongName = dongName.replace('서울특별시 강남구 ', '');
    }
    
    const isSelected = selectedDong && selectedDong === dongName;

    return {
      fillColor: isSelected ? '#ff6b6b' : '#0070f3',
      weight: isSelected ? 3 : 2,
      opacity: 1,
      color: isSelected ? '#ff4757' : '#0056b3',
      dashArray: isSelected ? '5, 5' : '3',
      fillOpacity: isSelected ? 0.8 : 0.7,
    };
  };

  return geoJsonData ? (
    <GeoJSON
      data={geoJsonData}
      onEachFeature={onEachFeature}
      style={style}
    />
  ) : null;
}

// 행정동 라벨 컴포넌트
function DongLabels({ geoJsonData, selectedDong }) {
  const map = useMap();

  useEffect(() => {
    if (!geoJsonData || !geoJsonData.features) return;

    // 기존 라벨 제거
    map.eachLayer((layer) => {
      if (layer._icon && layer._icon.className && layer._icon.className.includes('dong-label')) {
        map.removeLayer(layer);
      }
    });

    // 새로운 라벨 추가
    geoJsonData.features.forEach(feature => {
      const properties = feature.properties;
      let dongName = properties.ADM_NM || properties.adm_nm || properties.dongName;
      
      // "서울특별시 강남구" 부분 제거하고 동 이름만 추출
      if (dongName && dongName.includes('서울특별시 강남구')) {
        dongName = dongName.replace('서울특별시 강남구 ', '');
      }
      
      if (!dongName) return;

      // 중심점 계산
      let center = null;
      if (feature.geometry.type === 'Polygon') {
        const coords = feature.geometry.coordinates[0];
        let sumX = 0, sumY = 0;
        coords.forEach(coord => {
          sumX += coord[0];
          sumY += coord[1];
        });
        center = [sumY / coords.length, sumX / coords.length];
      } else if (feature.geometry.type === 'MultiPolygon') {
        let sumX = 0, sumY = 0, totalPoints = 0;
        feature.geometry.coordinates.forEach(polygon => {
          polygon[0].forEach(coord => {
            sumX += coord[0];
            sumY += coord[1];
            totalPoints++;
          });
        });
        center = [sumY / totalPoints, sumX / totalPoints];
      }

      if (center) {
        const isSelected = selectedDong && selectedDong === dongName;
        
        const icon = new DivIcon({
          className: `dong-label ${isSelected ? 'selected' : ''}`,
          html: `<div style="
            background: ${isSelected ? '#ff6b6b' : 'rgba(0, 112, 243, 0.9)'};
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            border: 2px solid ${isSelected ? '#ff4757' : '#0056b3'};
          ">${dongName}</div>`,
          iconSize: [100, 30],
          iconAnchor: [50, 15]
        });

        const marker = L.marker(center, { icon }).addTo(map);
      }
    });
  }, [geoJsonData, selectedDong, map]);

  return null;
}

// 메인 행정동 지도 컴포넌트
export default function DongMapComponent({ 
  geoJsonData, 
  selectedDong, 
  onDongClick, 
  onDongHover,
  height = '600px',
  width = '100%'
}) {
  const mapRef = useRef(null);

  if (!geoJsonData) {
    return (
      <div style={{ 
        height, 
        width, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
          <p style={{ color: '#6c757d', margin: 0 }}>행정동 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height, width, borderRadius: '8px', overflow: 'hidden' }}>
             <MapContainer
         ref={mapRef}
         center={[37.5665, 126.9780]} // 서울시청 좌표
         zoom={12}
         style={{ height: '100%', width: '100%' }}
         scrollWheelZoom={true}
         zoomControl={true}
         attributionControl={true}
       >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <DongLayer
          geoJsonData={geoJsonData}
          selectedDong={selectedDong}
          onDongClick={onDongClick}
          onDongHover={onDongHover}
        />
        
        <DongLabels
          geoJsonData={geoJsonData}
          selectedDong={selectedDong}
        />
      </MapContainer>
    </div>
  );
}
