# RAG 통합 LangGraph Agent 사용 가이드 (문서 지원 포함)

## 🚀 새로운 기능: RAG (Retrieval-Augmented Generation) + 문서 지원

기존 LangGraph Agent에 RAG 기능과 Word/PDF 문서 지원이 통합되어 더욱 정확하고 맥락적인 인구 분석을 제공합니다.

## 📚 RAG 시스템 구성

### 1. 기본 지식 베이스
- **서울시 인구 현황** (2024년 기준)
- **강남구 지역 특성**
- **한국 인구 정책 및 트렌드**
- **인구 분석 지표 해석 가이드**
- **강남구 행정동별 특성**

### 2. 문서 지원 기능
- **PDF 문서**: 정책 문서, 보고서, 연구 자료
- **Word 문서 (.docx)**: 정책 백서, 계획서, 분석 보고서
- **자동 텍스트 추출**: 단락, 표, 메타데이터 포함
- **스마트 청킹**: 의미 단위로 문서 분할

### 3. 기술 스택
- **벡터 데이터베이스**: ChromaDB
- **임베딩 모델**: Sentence Transformers (all-MiniLM-L6-v2)
- **검색 방식**: 유사도 기반 검색 (Top-K)
- **문서 처리**: python-docx, PyMuPDF

## 🔧 설치 및 실행

### 1. 의존성 설치
```bash
cd llm-analytics
pip install -r requirements.txt
```

### 2. 환경 변수 설정
```bash
# .env 파일 생성
OPENAI_API_KEY=your_openai_api_key_here
HOST=0.0.0.0
PORT=8004
ENVIRONMENT=development
```

### 3. 서버 실행
```bash
python population_langgraph_agent.py
```

## 📡 API 엔드포인트

### 1. 기본 분석 API
```http
POST http://localhost:8004/analyze/langgraph
```

**요청 예시:**
```json
{
  "dongName": "역삼동",
  "populationData": {
    "total": 1000,
    "local": 800,
    "longForeigner": 150,
    "tempForeigner": 50
  },
  "timeStats": [...],
  "genderStats": {...},
  "ageStats": {...}
}
```

**응답에 추가된 필드:**
```json
{
  "status": "success",
  "rag_context_count": 5,  // RAG에서 검색된 컨텍스트 수
  ...
}
```

### 2. 문서 업로드 API
```http
POST http://localhost:8004/rag/upload-document
Content-Type: multipart/form-data
```

**요청 예시:**
```bash
curl -X POST http://localhost:8004/rag/upload-document \
  -F "file=@policy_document.docx" \
  -F "title=서울시 인구 정책 백서 2024" \
  -F "category=policy" \
  -F "description=서울시 인구 정책 관련 문서"
```

**응답 예시:**
```json
{
  "status": "success",
  "message": "문서가 성공적으로 추가되었습니다.",
  "filename": "policy_document.docx",
  "metadata": {
    "title": "서울시 인구 정책 백서 2024",
    "category": "policy",
    "description": "서울시 인구 정책 관련 문서",
    "upload_date": "2024-01-01T12:00:00"
  }
}
```

### 3. 문서 목록 조회
```http
GET http://localhost:8004/rag/documents
```

**응답 예시:**
```json
{
  "status": "success",
  "documents": [
    {
      "file_name": "policy_document.docx",
      "title": "서울시 인구 정책 백서 2024",
      "author": "서울시청",
      "upload_date": "2024-01-01T12:00:00",
      "category": "policy",
      "chunk_count": 15
    }
  ],
  "count": 1
}
```

### 4. 문서 삭제
```http
DELETE http://localhost:8004/rag/documents/{filename}
```

### 5. 사용자 정의 지식 추가
```http
POST http://localhost:8004/rag/add-knowledge
```

**요청 예시:**
```json
{
  "content": "역삼동은 강남구에서 가장 많은 IT 기업이 집중된 지역으로, 구글, 네이버, 카카오 등 글로벌 IT 기업들이 위치해 있습니다. 이로 인해 외국인 전문가들의 비율이 높고, 20-30대 젊은 층이 주를 이루고 있습니다.",
  "metadata": {
    "source": "user_defined",
    "type": "regional_detail",
    "dong": "역삼동"
  }
}
```

### 6. RAG 시스템 상태 확인
```http
GET http://localhost:8004/rag/status
```

**응답 예시:**
```json
{
  "status": "success",
  "rag_initialized": true,
  "vectorstore_ready": true,
  "embeddings_ready": true,
  "supported_formats": [".pdf", ".docx"],
  "timestamp": "2024-01-01T12:00:00"
}
```

## 🎯 문서 지원 기능의 효과

### 1. 분석 정확도 향상
- **기존**: 단순한 데이터 기반 추측
- **문서 지원 후**: 실제 정책 문서, 보고서 기반 분석

### 2. 맥락적 인사이트
- **기존**: 절대적 수치만 분석
- **문서 지원 후**: 정책 배경, 연구 결과, 트렌드와 연계 분석

### 3. 실용적 제안
- **기존**: 일반적인 제안
- **문서 지원 후**: 정책 방향과 일치하는 구체적 제안

## 📊 분석 예시

### 기존 분석
```
역삼동의 총 인구는 1,000명이며, 외국인 비율은 20%입니다.
```

### 문서 지원 RAG 분석
```
역삼동의 총 인구는 1,000명이며, 외국인 비율은 20%로 강남구 평균(15%)보다 높습니다. 
이는 IT 업계 중심지로서의 특성과 맞물려 있으며, 구글, 네이버 등 글로벌 IT 기업들의 
외국인 전문가 유치 정책의 성과로 보입니다. 서울시 전체 외국인 비율(3.5%)과 비교하면 
약 6배 높은 수치로, 명확한 지역 특성을 보여줍니다.

최근 서울시 인구 정책 백서(2024)에 따르면, IT 업계 집중 지역의 외국인 비율 증가는 
글로벌 인재 유치 정책의 성공 지표로 활용되고 있으며, 이는 지역 경제 활성화와 
혁신 생태계 구축에 긍정적 영향을 미치고 있습니다.
```

## 🔄 워크플로우

1. **문서 업로드**: PDF/DOCX 문서 업로드 및 자동 처리
2. **텍스트 추출**: 문서에서 텍스트, 표, 메타데이터 추출
3. **스마트 청킹**: 의미 단위로 문서 분할
4. **RAG 컨텍스트 검색**: 분석 대상과 관련된 지식 검색
5. **데이터 요약**: RAG 컨텍스트를 활용한 맥락적 데이터 요약
6. **분석 전략 수립**: 관련 지식을 고려한 분석 방향 설정
7. **단계별 분석**: 각 분석 단계에서 RAG 컨텍스트 활용
8. **최종 보고서**: 종합적인 지식 기반 보고서 생성

## 🛠️ 커스터마이징

### 1. 문서 업로드
```bash
# PDF 문서 업로드
curl -X POST http://localhost:8004/rag/upload-document \
  -F "file=@research_report.pdf" \
  -F "title=인구학 연구 보고서" \
  -F "category=research"

# Word 문서 업로드
curl -X POST http://localhost:8004/rag/upload-document \
  -F "file=@policy_document.docx" \
  -F "title=정책 문서" \
  -F "category=policy"
```

### 2. 추가 지식 문서
```python
# 직접 코드에서 추가
rag_system.add_custom_knowledge(
    content="새로운 지식 내용",
    metadata={"source": "custom", "type": "user_defined"}
)
```

### 3. API를 통한 추가
```bash
curl -X POST http://localhost:8004/rag/add-knowledge \
  -H "Content-Type: application/json" \
  -d '{"content": "새로운 지식", "metadata": {"source": "api"}}'
```

## 📄 지원 문서 형식

### PDF 문서
- **정책 문서**: 서울시 인구 정책 백서, 강남구 개발 계획
- **연구 보고서**: 인구학 연구 논문, 통계청 보고서
- **분석 자료**: 지역 특성 분석, 상권 분석 보고서

### Word 문서 (.docx)
- **정책 백서**: 인구 정책 관련 문서
- **계획서**: 지역 개발 계획, 인프라 계획
- **분석 보고서**: 연구 결과, 조사 보고서
- **업무 자료**: 행정 문서, 업무 매뉴얼

## 🚨 주의사항

1. **첫 실행 시**: 임베딩 모델 다운로드로 인한 지연 발생 가능
2. **메모리 사용량**: ChromaDB, 임베딩 모델, 문서 처리로 인한 메모리 사용량 증가
3. **API 키**: OpenAI API 키가 필요합니다
4. **네트워크**: Sentence Transformers 모델 다운로드 시 인터넷 연결 필요
5. **파일 크기**: 대용량 문서 업로드 시 처리 시간 증가
6. **임시 파일**: 업로드된 파일은 처리 후 자동 삭제됩니다

## 🔍 문제 해결

### 문서 업로드 실패
```bash
# 로그 확인
tail -f population_langgraph_agent.log

# 파일 형식 확인
file policy_document.docx

# 파일 크기 확인
ls -lh policy_document.docx
```

### RAG 초기화 실패
```bash
# 로그 확인
tail -f population_langgraph_agent.log

# 수동 재시작
python population_langgraph_agent.py
```

### 메모리 부족
```bash
# 가상환경에서 실행
source llm_env/bin/activate
python population_langgraph_agent.py
```

### API 키 오류
```bash
# .env 파일 확인
cat .env
# OPENAI_API_KEY가 올바르게 설정되어 있는지 확인
```

### 문서 처리 오류
```bash
# 임시 디렉토리 확인
ls -la ./temp_documents/

# 임시 디렉토리 정리
rm -rf ./temp_documents/*
```
