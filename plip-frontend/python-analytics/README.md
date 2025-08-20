# 🔮 인구 수요 예측 API

머신러닝을 활용한 강남구 행정동별 인구 수요 예측 시스템입니다.

## 🚀 빠른 시작

### 1. Python 환경 설정
```bash
cd python-analytics
python -m pip install -r requirements.txt
```

### 2. 서버 실행
```bash
python run_server.py
```

### 3. API 문서 확인
- 서버: http://localhost:8000
- API 문서: http://localhost:8000/docs

## 📊 주요 기능

### 🤖 머신러닝 모델
- **Random Forest Regressor**: 높은 정확도와 안정성
- **시계열 피처 엔지니어링**: 시간, 요일, 주말/평일 패턴 분석
- **신뢰구간 제공**: 예측 불확실성 정량화

### 📈 예측 기능
1. **시간대별 예측**: 24시간 인구 수요 패턴
2. **주간 패턴 예측**: 요일별 인구 변화 분석
3. **실시간 훈련**: 최신 데이터로 모델 업데이트

## 🔗 API 엔드포인트

### 모델 훈련
```http
POST /train/{dong_code}
```
- 특정 동의 데이터로 예측 모델 훈련
- 모델 성능 지표 반환 (MAE, R² Score)

### 시간대별 예측
```http
POST /predict/hourly/{dong_code}
```
- 24시간 인구 수요 예측
- 신뢰구간 포함
- 피크/최저 시간대 분석

### 주간 패턴 예측
```http
GET /predict/weekly/{dong_code}
```
- 7일간 시간대별 예측
- 주말/평일 패턴 비교
- 요일별 인사이트 제공

## 🎯 사용 예시

### 1. 모델 훈련
```javascript
import { pythonApiClient } from '@/utils/api';

// 역삼1동 데이터로 모델 훈련
const result = await pythonApiClient.trainModel('11680640');
console.log('훈련 완료:', result.performance);
```

### 2. 인구 수요 예측
```javascript
// 오늘 24시간 예측
const prediction = await pythonApiClient.predictHourlyPopulation('11680640');
console.log('피크 시간:', prediction.summary.peak_hour);
console.log('최대 인구:', prediction.summary.peak_population);
```

### 3. 주간 패턴 분석
```javascript
// 주간 패턴 예측
const weekly = await pythonApiClient.predictWeeklyPattern('11680640');
console.log('가장 바쁜 요일:', weekly.insights.busiest_day);
```

## 🛠 기술 스택

- **FastAPI**: 고성능 웹 API 프레임워크
- **scikit-learn**: 머신러닝 라이브러리
- **pandas**: 데이터 처리 및 분석
- **numpy**: 수치 계산
- **uvicorn**: ASGI 서버

## 📊 모델 특징

### 입력 피처
- `hour`: 시간대 (0-23)
- `day_of_week`: 요일 (0-6)
- `is_weekend`: 주말 여부
- `local_population`: 국내인구
- `long_foreigner`: 장기체류 외국인
- `temp_foreigner`: 단기체류 외국인

### 출력 결과
- `predicted_population`: 예측 인구수
- `confidence_lower`: 신뢰구간 하한
- `confidence_upper`: 신뢰구간 상한

## 🔄 프론트엔드 연동

React 애플리케이션에서 다음과 같이 사용:

```javascript
// 상세 통계 페이지에서 예측 기능 추가
const [predictions, setPredictions] = useState(null);

const handlePredict = async () => {
  try {
    // 1. 모델 훈련
    await pythonApiClient.trainModel(selectedDong);
    
    // 2. 예측 실행
    const result = await pythonApiClient.predictHourlyPopulation(selectedDong);
    setPredictions(result);
  } catch (error) {
    console.error('예측 실패:', error);
  }
};
```

## 🎯 활용 분야

- **상권 분석**: 시간대별 유동인구 예측
- **교통 계획**: 출퇴근 시간 인구 이동 패턴
- **공공서비스**: 시설 이용 수요 예측
- **마케팅**: 타겟 시간대 광고 전략
