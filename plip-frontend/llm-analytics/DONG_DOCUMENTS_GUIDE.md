# 동별 RAG 정보 관리 가이드

## 📋 개요

Overview Insights Agent는 각 동별로 개발자가 직접 코드에서 RAG 정보를 관리할 수 있습니다. 이를 통해 더 정확하고 지역화된 분석을 제공할 수 있습니다.

## 🗂️ 시스템 구조

```
llm-analytics/
├── overview_insights_agent.py    # 메인 서버 파일
└── DONG_DOCUMENTS_GUIDE.md       # 이 가이드 파일
```

## 📝 동별 정보 추가 방법

### 1. 기본 정보 (DONG_SPECIFIC_KNOWLEDGE)

이미 정의된 5개 동의 기본 정보입니다:
- 신사동, 역삼동, 청담동, 삼성동, 압구정동

### 2. 커스텀 정보 추가 (CUSTOM_DONG_KNOWLEDGE)

새로운 동을 추가하려면 `CUSTOM_DONG_KNOWLEDGE` 딕셔너리에 정보를 추가하면 됩니다:

```python
CUSTOM_DONG_KNOWLEDGE = {
    "개포동": {
        "location": "강남구 서부, 대치동과 인접",
        "characteristics": "주거지역, 교육열 높음",
        "business_environment": "학원가, 주거시설, 편의점",
        "transportation": "지하철 2호선 개포동역",
        "demographics": "학생, 학부모, 30-50대",
        "popular_areas": "개포동역, 학원가",
        "dining_trends": "학생식당, 분식, 카페",
        "business_opportunities": "학원, 과외, 학생 대상 서비스"
    },
    "대치동": {
        "location": "강남구 서부, 개포동과 인접",
        "characteristics": "고급 주거지역, 교육열 높음",
        "business_environment": "학원가, 고급 주거시설, 편의점",
        "transportation": "지하철 2호선 대치역",
        "demographics": "고소득층, 학생, 학부모",
        "popular_areas": "대치역, 학원가, 주거지",
        "dining_trends": "고급 한식, 카페, 분식",
        "business_opportunities": "고급 학원, 과외, 프리미엄 서비스"
    }
}
```

## 🔧 API 사용법

### 1. 모든 동 정보 조회
```bash
curl http://localhost:8003/dong-knowledge
```

### 2. 특정 동 정보 조회
```bash
curl http://localhost:8003/dong-knowledge/신사동
```

### 3. 서버 상태 확인
```bash
curl http://localhost:8003/health
```

## 📊 필드 설명

| 필드명 | 설명 | 예시 |
|--------|------|------|
| `location` | 지리적 위치 및 인접 지역 | "강남구 북부, 압구정동과 인접" |
| `characteristics` | 지역의 주요 특징 | "고급 주거지역, 명품 쇼핑가" |
| `business_environment` | 주요 업종 및 시설 | "명품 브랜드 매장, 고급 카페" |
| `transportation` | 교통수단 및 접근성 | "지하철 3호선 신사역, 버스 정류장" |
| `demographics` | 주요 연령대 및 직업군 | "고소득층, 30-50대 비중 높음" |
| `popular_areas` | 주요 상권 및 명소 | "가로수길, 신사역 주변" |
| `dining_trends` | 인기 음식점 유형 | "고급 한식, 이탈리안, 프렌치" |
| `business_opportunities` | 추천 사업 아이템 | "명품 리셀, 고급 미용실" |

## 🔄 우선순위

1. **커스텀 정보** (CUSTOM_DONG_KNOWLEDGE)
2. **기본 정보** (DONG_SPECIFIC_KNOWLEDGE)
3. **기본 정보** (매칭되지 않는 동)

## 💡 활용 예시

### 역삼동 IT 특화 정보 예시
```python
"역삼동": {
    "location": "강남구 중심부, 강남역과 인접",
    "characteristics": "IT 업계 중심지, 스타트업 밀집지역, 24시간 활성화",
    "business_environment": "IT 기업, 스타트업, 공유오피스, 교육기관, 해외 기업 지사",
    "transportation": "지하철 2호선 강남역, 9호선 신논현역, 버스 정류장 다수",
    "demographics": "20-30대 IT 종사자, 외국인 비중 높음, 1인 가구 많음",
    "popular_areas": "강남역, 테헤란로, 스타트업 거리, IT 회사 밀집지",
    "dining_trends": "분식, 커피, 샐러드, 다국적 요리, 24시간 편의점",
    "business_opportunities": "IT 교육, 공유오피스, 외국인 대상 서비스, 건강식, 24시간 서비스"
}
```

### 청담동 엔터테인먼트 특화 정보 예시
```python
"청담동": {
    "location": "강남구 동부, 삼성동과 인접",
    "characteristics": "고급 주거지역, 엔터테인먼트 업계 중심, 밤문화 활성",
    "business_environment": "엔터테인먼트 기업, 고급 레스토랑, 클럽, 방송국",
    "transportation": "지하철 7호선 청담역, 버스 정류장, 택시 정류장",
    "demographics": "고소득층, 엔터테인먼트 종사자, 외국인, 20-40대",
    "popular_areas": "청담역, 엔터테인먼트 거리, 고급 레스토랑가, 클럽가",
    "dining_trends": "고급 한식, 일본식, 이탈리안, 클럽, 바",
    "business_opportunities": "엔터테인먼트 관련, 고급 레스토랑, 클럽, 미용실, 스튜디오"
}
```

## ⚠️ 주의사항

1. **동 이름**: 동 이름에서 '동'을 제거한 형태로 매칭됩니다.
   - `신사동` → `신사`로 매칭
   - `역삼동` → `역삼`으로 매칭

2. **코드 수정**: 새로운 동을 추가하려면 코드를 직접 수정해야 합니다.

3. **서버 재시작**: 코드 수정 후 서버를 재시작해야 변경사항이 적용됩니다.

## 🚀 시작하기

1. 서버 실행:
```bash
cd llm-analytics
python overview_insights_agent.py
```

2. 동 정보 확인:
```bash
curl http://localhost:8003/dong-knowledge
```

3. 특정 동 정보 확인:
```bash
curl http://localhost:8003/dong-knowledge/신사동
```

## 🔧 새로운 동 추가하기

1. `overview_insights_agent.py` 파일을 열어서 `CUSTOM_DONG_KNOWLEDGE` 딕셔너리에 새로운 동 정보를 추가합니다.

2. 서버를 재시작합니다.

3. API를 통해 추가된 동 정보를 확인합니다.

이제 각 동의 특성에 맞는 맞춤형 분석을 받을 수 있습니다! 🎯
