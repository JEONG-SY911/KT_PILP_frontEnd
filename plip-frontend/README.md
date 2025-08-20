# PLIP Population Frontend

강남구 인구 데이터 관리 시스템의 프론트엔드 애플리케이션입니다.

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: JavaScript
- **Styling**: Tailwind CSS
- **Backend**: Spring Boot API

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 3. 카카오맵 API 설정

1. [카카오 개발자 센터](https://developers.kakao.com/)에서 애플리케이션을 생성
2. JavaScript 키를 복사
3. `src/app/layout.js` 파일에서 `YOUR_KAKAO_MAP_API_KEY`를 실제 API 키로 교체

```javascript
src="//dapi.kakao.com/v2/maps/sdk.js?appkey=실제_API_키&libraries=services,clusterer"
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 애플리케이션을 확인하세요.

## API 엔드포인트

이 프론트엔드는 다음 스프링부트 API 엔드포인트들과 연동됩니다:

### 홈 API
- `GET /` - 서버 정보 및 사용 가능한 엔드포인트 목록
- `GET /health` - 서버 상태 확인

### 강남구 인구 데이터 API
- `GET /population/gangnam/dongs` - 강남구 동 목록 조회
- `GET /population/gangnam/dongs/name/{dongName}` - 동 이름으로 상세 생활인구 현황 조회
- `GET /population/gangnam/dongs/{adstrdCode}` - 행정동 코드로 상세 생활인구 현황 조회

### 사용자 관리 API
- `POST /users/signup` - 사용자 회원가입
- `GET /users/{userId}` - 사용자 정보 조회

### 즐겨찾기 API
- `POST /favorites/{userId}` - 즐겨찾기 추가
- `GET /favorites/{userId}` - 즐겨찾기 목록
- `DELETE /favorites/{userId}/{adstrdCode}` - 즐겨찾기 삭제

## 프로젝트 구조

```
src/
├── app/                 # Next.js App Router
│   ├── page.js         # 메인 페이지
│   ├── layout.js       # 레이아웃
│   └── globals.css     # 전역 스타일
└── utils/
    └── api.js          # API 통신 유틸리티
```

## 주요 기능

- 🏠 **메인 대시보드**: 서버 상태 및 API 엔드포인트 정보 표시
- 🏘️ **동 목록 조회**: 강남구 동별 인구 데이터 조회
- 👥 **사용자 관리**: 회원가입 및 사용자 정보 관리
- ⭐ **즐겨찾기**: 관심 지역 즐겨찾기 기능
- 🔍 **실시간 상태**: 서버 연결 상태 실시간 모니터링

## 개발 가이드

### 백엔드 서버 실행

스프링부트 백엔드 서버가 `http://localhost:8080`에서 실행 중이어야 합니다.

### 빌드 및 배포

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

## 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다.
