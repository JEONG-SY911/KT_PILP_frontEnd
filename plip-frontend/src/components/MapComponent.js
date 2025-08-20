import { MapContainer, TileLayer, GeoJSON, Marker, useMap } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

function MapComponent({ geoJsonData, selectedDistrict, onDistrictClick, favoriteStatuses = {} }) {
  // 서울시 자치구 중심점 데이터
  const districtCenters = {
    '11110': [37.59491732, 126.9773213], // 종로구
    '11140': [37.56014356, 126.9959681], // 중구
    '11170': [37.53138497, 126.979907], // 용산구
    '11200': [37.55102969, 127.0410585], // 성동구
    '11215': [37.54670608, 127.0857435], // 광진구
    '11230': [37.58195655, 127.0548481], // 동대문구
    '11260': [37.59780259, 127.0928803], // 중랑구
    '11290': [37.6057019, 127.0175795], // 성북구
    '11305': [37.64347391, 127.011189], // 강북구
    '11320': [37.66910208, 127.0323688], // 도봉구
    '11350': [37.65251105, 127.0750347], // 노원구
    '11380': [37.61921128, 126.9270229], // 은평구
    '11410': [37.57778531, 126.9390631], // 서대문구
    '11440': [37.55931349, 126.90827], // 마포구
    '11470': [37.52478941, 126.8554777], // 양천구
    '11500': [37.56123543, 126.822807], // 강서구
    '11530': [37.49440543, 126.8563006], // 구로구
    '11545': [37.46056756, 126.9008202], // 금천구
    '11560': [37.52230829, 126.9101695], // 영등포구
    '11590': [37.49887688, 126.9516415], // 동작구
    '11620': [37.46737569, 126.9453372], // 관악구
    '11650': [37.47329547, 127.0312203], // 서초구
    '11680': [37.49664389, 127.0629852], // 강남구
    '11710': [37.50561924, 127.115295], // 송파구
    '11740': [37.55045024, 127.1470118]  // 강동구
  };

  const onEachFeature = (feature, layer) => {
    const districtName = feature.properties.SIG_KOR_NM;
    
    // 클릭 이벤트: 부모로 메시지 전달 (상태 의존성 문제 방지)
    layer.on('click', () => {
      // 클릭 시 시각적 피드백
      layer.setStyle({
        fillOpacity: 0.8,
        weight: 4,
        color: '#1f2937'
      });
      
      // 잠시 후 원래 스타일로 복원
      setTimeout(() => {
        layer.setStyle({
          fillOpacity: 0.4,
          weight: 2,
          color: '#374151'
        });
      }, 200);
      
      window.postMessage({ type: 'districtClick', districtName }, '*');
    });
    
    // 호버 이벤트 추가
    layer.on('mouseover', () => {
      console.log('MapComponent: 구 호버됨 -', districtName);
      
      layer.setStyle({
        fillOpacity: 0.6, // 호버 시 더 진하게
        weight: 3,
        color: '#1f2937'
      });
      
      // 커서 스타일 변경
      layer.getElement().style.cursor = 'pointer';
      
      // 부모 컴포넌트에 호버 이벤트 전달
      window.postMessage({
        type: 'districtHover',
        districtName: districtName
      }, '*');
      
      console.log('MapComponent: postMessage 전송됨 -', districtName);
    });
    
    layer.on('mouseout', () => {
      layer.setStyle({
        fillOpacity: 0.4, // 기본 상태로 복원
        weight: 2,
        color: '#374151'
      });
      
      // 커서 스타일 복원
      layer.getElement().style.cursor = 'default';
      
      // 부모 컴포넌트에 마우스 아웃 이벤트 전달
      window.postMessage({
        type: 'districtLeave',
        districtName: districtName
      }, '*');
    });
    
    // 팝업 추가 (상세 정보 보기만)
    if (districtName) {
      layer.bindPopup(`
        <div class="text-center p-3 min-w-[200px]">
          <h3 class="font-bold text-lg mb-3 text-gray-800">${districtName}</h3>
          <div class="flex flex-col gap-2">
            <button 
              onclick="window.postMessage({type: 'districtClick', districtName: '${districtName}'}, '*')"
              class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              상세 정보 보기
            </button>
            <p class="text-xs text-gray-500 mt-2">
              💡 마우스를 올리면 우측 상단에 즐겨찾기 버튼이 나타납니다
            </p>
          </div>
        </div>
      `);
    }
  };

  const getStyle = (feature) => {
    const districtCode = feature.properties.SIG_CD;
    const districtName = feature.properties.SIG_KOR_NM;
    
    // 구별 색상 정의
    const districtColors = {
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

    return {
      fillColor: selectedDistrict === districtName ? districtColors[districtCode] : '#e2e8f0',
      weight: selectedDistrict === districtName ? 3 : 2,
      opacity: 1,
      color: '#374151',
      dashArray: '3',
      fillOpacity: selectedDistrict === districtName ? 0.1 : 0.4, // 선택된 구는 투명하게, 기본은 약간 불투명
    };
  };

  return (
    <MapContainer 
      center={[37.5665, 126.9780]} // 서울시청 좌표
      zoom={11}
      style={{ height: '85vh', width: '100%' }}
      scrollWheelZoom={true}
      className="rounded-lg"
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
      
      {/* 구별 이름 라벨 - CSV 데이터 사용 */}
      {geoJsonData && geoJsonData.features.map((feature, index) => {
        const districtCode = feature.properties.SIG_CD;
        const districtName = feature.properties.SIG_KOR_NM;
        const center = districtCenters[districtCode];
        
        if (!center) {
          console.warn(`중심점 데이터가 없습니다: ${districtName} (${districtCode})`);
          return null;
        }
        
        const icon = new DivIcon({
          className: 'district-label',
          html: `<div style="
            font-size: 11px;
            font-weight: bold;
            color: #1f2937;
            text-shadow: 2px 2px 4px rgba(255, 255, 255, 0.9);
            white-space: nowrap;
            pointer-events: none;
            z-index: 1000;
          ">${districtName}</div>`,
          iconSize: [100, 20],
          iconAnchor: [50, 10]
        });
        
        return (
          <Marker
            key={`label-${index}`}
            position={center}
            icon={icon}
            interactive={false}
          />
        );
      })}
    </MapContainer>
  );
}

export default MapComponent;
