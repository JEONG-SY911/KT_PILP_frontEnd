'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// 강남구 중심점 좌표
const GANGNAM_CENTER = [37.5172, 127.0473];

// 동별 중심점 좌표 (실제 강남구 동별 중심점)
const dongCenters = {
  "11680510": [37.5167, 127.0200], // 신사동
  "11680521": [37.5167, 127.0300], // 논현1동
  "11680531": [37.5167, 127.0400], // 논현2동
  "11680545": [37.5300, 127.0250], // 압구정동
  "11680565": [37.5200, 127.0400], // 청담동
  "11680580": [37.5100, 127.0600], // 삼성1동
  "11680590": [37.5100, 127.0700], // 삼성2동
  "11680600": [37.5000, 127.0600], // 대치1동
  "11680610": [37.5000, 127.0700], // 대치2동
  "11680631": [37.5000, 127.0500], // 대치4동
  "11680640": [37.5000, 127.0300], // 역삼1동
  "11680650": [37.5000, 127.0400], // 역삼2동
  "11680655": [37.4900, 127.0500], // 도곡1동
  "11680656": [37.4900, 127.0600], // 도곡2동
  "11680660": [37.4900, 127.0700], // 개포1동
  "11680670": [37.4900, 127.0800], // 개포2동
  "11680740": [37.4900, 127.0900], // 개포3동
  "11680690": [37.4900, 127.1000], // 개포4동
  "11680700": [37.4700, 127.0800], // 세곡동
  "11680720": [37.4900, 127.0900], // 일원본동
  "11680730": [37.4900, 127.1000], // 일원1동
  "11680750": [37.4800, 127.1000]  // 수서동
};

function GangnamMapComponent({ geoJsonData, selectedDong, onDongClick }) {
  const mapRef = useRef();

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.invalidateSize();
    }
  }, []);

  const onEachFeature = (feature, layer) => {
    if (feature.properties && feature.properties.name) {
      // 팝업 추가
      layer.bindPopup(`
        <div class="text-center p-2">
          <h3 class="font-bold text-lg mb-2 text-gray-900">${feature.properties.name}</h3>
          <div class="space-y-1 text-sm">
            <p class="text-gray-600">인구: <span class="font-semibold text-blue-600">${feature.properties.population?.toLocaleString()}명</span></p>
            <p class="text-gray-600">면적: <span class="font-semibold text-green-600">${feature.properties.area || 'N/A'}㎢</span></p>
            <p class="text-gray-600">인구밀도: <span class="font-semibold text-purple-600">${feature.properties.density?.toLocaleString() || 'N/A'}명/㎢</span></p>
          </div>
        </div>
      `);

      // 클릭 이벤트
      layer.on('click', () => {
        onDongClick(feature.properties.id);
      });

      // 호버 이벤트
      layer.on('mouseover', function() {
        this.setStyle({
          fillOpacity: 0.6,
          weight: 3,
          color: '#1f2937'
        });
        
        // 호버 시 라벨 강조
        const labelElement = document.querySelector(`[data-dong-id="${feature.properties.id}"]`);
        if (labelElement) {
          labelElement.style.transform = 'scale(1.1)';
          labelElement.style.zIndex = '1000';
        }
      });

      layer.on('mouseout', function() {
        this.setStyle({
          fillOpacity: selectedDong === feature.properties.id ? 0.3 : 0.4,
          weight: selectedDong === feature.properties.id ? 3 : 1,
          color: '#374151'
        });
        
        // 호버 해제 시 라벨 원래대로
        const labelElement = document.querySelector(`[data-dong-id="${feature.properties.id}"]`);
        if (labelElement) {
          labelElement.style.transform = 'scale(1)';
          labelElement.style.zIndex = 'auto';
        }
      });
    }
  };

  const getStyle = (feature) => {
    const isSelected = selectedDong === feature.properties.id;
    const isHovered = false; // 호버 상태는 별도로 관리
    
    // 동별로 다른 색상 적용
    const colorMap = {
      "11680510": "#3B82F6", // 신사동 - 파랑
      "11680521": "#10B981", // 논현1동 - 초록
      "11680531": "#059669", // 논현2동 - 진초록
      "11680545": "#F59E0B", // 압구정동 - 주황
      "11680565": "#8B5CF6", // 청담동 - 보라
      "11680580": "#EF4444", // 삼성1동 - 빨강
      "11680590": "#DC2626", // 삼성2동 - 진빨강
      "11680600": "#06B6D4", // 대치1동 - 청록
      "11680610": "#0891B2", // 대치2동 - 진청록
      "11680631": "#0E7490", // 대치4동 - 진청록
      "11680640": "#84CC16", // 역삼1동 - 연두
      "11680650": "#65A30D", // 역삼2동 - 진연두
      "11680655": "#F97316", // 도곡1동 - 주황
      "11680656": "#EA580C", // 도곡2동 - 진주황
      "11680660": "#EC4899", // 개포1동 - 분홍
      "11680670": "#DB2777", // 개포2동 - 진분홍
      "11680740": "#BE185D", // 개포3동 - 진분홍
      "11680690": "#A21CAF", // 개포4동 - 진보라
      "11680700": "#6366F1", // 세곡동 - 인디고
      "11680720": "#14B8A6", // 일원본동 - 틸
      "11680730": "#0D9488", // 일원1동 - 진틸
      "11680750": "#F43F5E"  // 수서동 - 로즈
    };
    
    const baseColor = colorMap[feature.properties.id] || "#6B7280";
    
    return {
      fillColor: isSelected ? '#1F2937' : baseColor,
      weight: isSelected ? 3 : 1,
      opacity: 1,
      color: isSelected ? '#1F2937' : '#374151',
      dashArray: isSelected ? '0' : '3',
      fillOpacity: isSelected ? 0.3 : 0.4,
    };
  };

  return (
    <MapContainer
      center={GANGNAM_CENTER}
      zoom={14}
      style={{ height: '85vh', width: '100%' }}
      scrollWheelZoom={false}
      ref={mapRef}
      className="gangnam-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {geoJsonData && (
        <GeoJSON
          data={geoJsonData}
          onEachFeature={onEachFeature}
          style={getStyle}
        />
      )}

      {/* 동별 라벨 마커 */}
      {geoJsonData && geoJsonData.features.map((feature) => {
        const center = dongCenters[feature.properties.id];
        if (!center) return null;

        return (
          <Marker
            key={feature.properties.id}
            position={center}
            icon={L.divIcon({
              className: 'custom-div-icon',
              html: `<div 
                data-dong-id="${feature.properties.id}"
                style="
                  background: rgba(255, 255, 255, 0.95);
                  border: 2px solid #374151;
                  border-radius: 6px;
                  padding: 4px 8px;
                  font-weight: bold;
                  font-size: 11px;
                  color: #1f2937;
                  white-space: nowrap;
                  text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8);
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                  transition: all 0.2s ease;
                  cursor: pointer;
                  ${selectedDong === feature.properties.id ? 'background: rgba(59, 130, 246, 0.9); color: white; border-color: #1f2937;' : ''}
                "
              >${feature.properties.name}</div>`,
              iconSize: [40, 24],
              iconAnchor: [20, 12]
            })}
            eventHandlers={{
              click: () => onDongClick(feature.properties.id)
            }}
          />
        );
      })}

      {/* 범례 */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
        <h4 className="font-semibold text-gray-900 mb-2 text-sm">동별 구분</h4>
        <div className="space-y-1 text-xs">
          {geoJsonData && geoJsonData.features.slice(0, 6).map((feature) => (
            <div key={feature.properties.id} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded"
                style={{ backgroundColor: getStyle(feature).fillColor }}
              ></div>
              <span className="text-gray-700">{feature.properties.name}</span>
            </div>
          ))}
          {geoJsonData && geoJsonData.features.length > 6 && (
            <div className="text-gray-500 text-xs">... 및 {geoJsonData.features.length - 6}개 동</div>
          )}
        </div>
      </div>
    </MapContainer>
  );
}

export default GangnamMapComponent;
