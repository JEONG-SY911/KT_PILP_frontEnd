# LLM 인구 데이터 분석 서버

Hugging Face Transformers와 DistilGPT-2 모델을 활용한 인구 데이터 분석 서버입니다.

## 🚀 설치 및 실행

### 1. 가상환경 생성 및 활성화

```bash
# 가상환경 생성
python -m venv llm_env

# 가상환경 활성화 (Windows)
llm_env\Scripts\activate

# 가상환경 활성화 (Linux/Mac)
source llm_env/bin/activate
```

### 2. 의존성 설치

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. 환경변수 설정

```bash
# .env 파일 생성 (env.example을 복사)
cp env.example .env

# .env 파일에 OpenAI API 키 설정
# OPENAI_API_KEY=your-actual-api-key-here
```

### 4. 서버 실행

```bash
# LangGraph Agent 서버 (GPT-4o-mini) - 포트 8003
python population_langgraph_agent.py

# Overview Insights Agent 서버 (실용적 인사이트) - 포트 8004
python overview_insights_agent.py
```

- **LangGraph Agent**: `http://localhost:8003` (종합 분석)
- **Overview Insights Agent**: `http://localhost:8004` (실용적 인사이트)

## 📊 API 엔드포인트

### 상태 확인
- `GET /health` - 서버 상태 및 모델 로딩 상태 확인

### 인구 데이터 분석
- `POST /analyze/population-insights` - 종합적인 인구 데이터 분석
- `POST /analyze/trend-prediction` - 예측 결과 해석 및 인사이트 제공

## 🎯 주요 기능

1. **인구 구성 분석**: 내외국인 비율, 성별 균형 분석
2. **시간대별 패턴 해석**: 출퇴근 시간, 주야간 변화 의미 분석
3. **연령대 분포 분석**: 주요 연령층과 지역 특성 파악
4. **지역 특성 진단**: 주거/상업/업무지역 성격 분석
5. **정책적 시사점**: 데이터 기반 지역 발전 방안 제안
6. **예측 결과 해석**: Prophet 예측 데이터의 비즈니스 인사이트 제공

## 🔧 시스템 요구사항

- Python 3.8+
- 최소 2GB RAM (DistilGPT-2는 가벼움)
- CUDA (GPU 가속 시, 선택사항)

## 📝 사용 예시

```python
# 프론트엔드에서 사용
import { llmApiClient } from '../utils/api.js';

// 인구 데이터 분석
const analysis = await llmApiClient.analyzePopulationInsights(
  '역삼동', 
  { total: 50000, local: 45000, longForeigner: 3000, tempForeigner: 2000 },
  timeStats, 
  genderStats, 
  ageStats
);

console.log(analysis.analysis); // AI 분석 결과
```

## ⚠️ 주의사항

- 첫 실행 시 DistilGPT-2 모델 다운로드(~350MB)로 인해 시간이 소요될 수 있습니다
- GPU가 있는 경우 자동으로 GPU를 사용합니다
- 모델 로딩에 시간이 걸리므로 서버 시작 후 `/health` 엔드포인트로 상태를 확인하세요
- 내일 다른 LLM API로 교체 예정이므로 임시 테스트용입니다
