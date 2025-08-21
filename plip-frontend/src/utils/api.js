const API_BASE_URL = 'http://localhost:8081';
const PYTHON_API_BASE_URL = 'http://localhost:8000';

export const apiClient = {
  // 기본 API 호출 함수
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error(`API Error (${response.status}):`, errorText);
        const err = new Error(`HTTP ${response.status}: ${errorText}`);
        err.status = response.status;
        throw err;
      }
      
      // 빈 바디 또는 JSON이 아닌 응답 처리
      if (response.status === 204) return null;
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return null;
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },

  // 홈 데이터 가져오기
  async getHomeData() {
    return this.request('/');
  },

  // 헬스 체크
  async getHealth() {
    return this.request('/health');
  },

  // 로그인
  async login(credentials) {
    console.log('로그인 요청:', credentials);
    console.log('요청 URL:', `${API_BASE_URL}/auth/login`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      console.log('응답 상태:', response.status);
      console.log('응답 헤더:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('로그인 실패:', errorText);
        throw new Error(errorText);
      }

      const data = await response.json();
      console.log('로그인 성공:', data);
      return data;
    } catch (error) {
      console.error('로그인 요청 실패:', error);
      throw error;
    }
  },

  // 회원가입
  async signup(userData) {
    console.log('회원가입 요청:', userData);
    console.log('요청 URL:', `${API_BASE_URL}/auth/signup`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      });

      console.log('응답 상태:', response.status);
      console.log('응답 헤더:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('회원가입 실패:', errorText);
        throw new Error(errorText);
      }

      const data = await response.json();
      console.log('회원가입 성공:', data);
      return data;
    } catch (error) {
      console.error('회원가입 요청 실패:', error);
      throw error;
    }
  },

  // 로그아웃
  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  },

  // 인증 상태 확인
  async checkAuth() {
    return this.request('/auth/check');
  },

  // 내 정보 가져오기
  async getMyInfo() {
    return this.request('/auth/me');
  },

  // 프로필 업데이트
  async updateProfile(profileData) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // 즐겨찾기 목록 가져오기
  async getMyFavorites() {
    return this.request('/api/favorites/my');
  },

  // 즐겨찾기 추가
  async addFavorite(favoriteData) {
    return this.request('/api/favorites/add', {
      method: 'POST',
      body: JSON.stringify(favoriteData),
    });
  },

  // 즐겨찾기 상태 확인
  async checkFavoriteStatus(adstrdCodeSe) {
    return this.request(`/api/favorites/check/${adstrdCodeSe}`);
  },

  // 즐겨찾기 삭제
  async deleteFavorite(adstrdCodeSe) {
    return this.request(`/api/favorites/remove/${adstrdCodeSe}`, {
      method: 'DELETE',
    });
  },

  // 서울시 구 목록 가져오기
  async getSeoulDistricts() {
    return this.request('/districts');
  },

  // 구별 정보 가져오기
  async getDistrictByName(districtName) {
    return this.request(`/districts/${encodeURIComponent(districtName)}`);
  },

  // 인구 데이터 관련 API 함수들
  // 일별 데이터 (새로운 DailyPopulationDto 구조)
  async getDailyPopulation(dongCode, date = null) {
    const endpoint = date 
      ? `/population/gangnam/dongs/${dongCode}/daily?date=${date}`
      : `/population/gangnam/dongs/${dongCode}/daily`;
    return this.request(endpoint);
  },



  // 일일 통계
  async getDailyStats(dongCode) {
    return this.request(`/population/gangnam/dongs/${dongCode}/stats/daily`);
  },

  // 주간/야간 통계
  async getDayNightStats(dongCode) {
    return this.request(`/population/gangnam/dongs/${dongCode}/stats/day-night`);
  },

  // 성별별 시간대 분포
  async getGenderTimeStats(dongCode) {
    return this.request(`/population/gangnam/dongs/${dongCode}/stats/gender-time`);
  },

  // 시간대/요일별 통계
  async getTimeWeekStats(dongCode) {
    return this.request(`/population/gangnam/dongs/${dongCode}/stats/time-week`);
  },

  // 주중/주말 통계
  async getWeekdayWeekendStats(dongCode) {
    return this.request(`/population/gangnam/dongs/${dongCode}/stats/weekday-weekend`);
  },

  // 성별/연령별 통계
  async getGenderAgeStats(dongCode) {
    return this.request(`/population/gangnam/dongs/${dongCode}/stats/gender-age`);
  },

  // 성별별 총 인구수
  async getGenderStats(dongCode) {
    return this.request(`/population/gangnam/dongs/${dongCode}/stats/gender`);
  },

  // 국내 인구 데이터
  async getLocalPeopleData(dongCode) {
    return this.request(`/population/local-people/code/${dongCode}`);
  },

  // 한달 전 대비 인구 변화 조회
  async getPopulationChange(dongCode, date) {
    return this.request(`/population/gangnam/dongs/${dongCode}/stats/population-change?date=${date}`);
  },

  // 여러 동의 인구 변화 데이터 조회
  async getMultiplePopulationChange(dongCodes, date) {
    const promises = dongCodes.map(dongCode => 
      this.getPopulationChange(dongCode, date).catch(err => {
        console.error(`동 ${dongCode} 인구 변화 데이터 조회 실패:`, err);
        return null;
      })
    );
    
    const results = await Promise.all(promises);
    return results.filter(result => result !== null);
  },
};

// 파이썬 예측 API 클라이언트
export const pythonApiClient = {
  // 파이썬 API 호출 함수
  async request(endpoint, options = {}) {
    const url = `${PYTHON_API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Python API Error (${response.status}): ${JSON.stringify(errorData)}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Python API 요청 실패:', error);
      throw error;
    }
  },

  // 예측 모델 훈련
  async trainModel(dongCode) {
    return this.request(`/train/${dongCode}`, {
      method: 'POST',
    });
  },

  // 시간대별 인구 수요 예측 (Prophet)
  async predictHourlyPopulation(dongCode, targetDate = null, hours = null) {
    const params = new URLSearchParams();
    if (targetDate) params.append('target_date', targetDate);
    
    const endpoint = `/predict/hourly/${dongCode}${params.toString() ? '?' + params.toString() : ''}`;
    const body = hours ? JSON.stringify(hours) : null;
    return this.request(endpoint, {
      method: 'POST',
      body,
    });
  },

  // 예측 결과와 실제 데이터 비교
  async predictWithComparison(dongCode, targetDate = null) {
    const params = new URLSearchParams();
    if (targetDate) params.append('target_date', targetDate);
    
    const endpoint = `/predict/compare/${dongCode}${params.toString() ? '?' + params.toString() : ''}`;
    return this.request(endpoint, {
      method: 'POST',
    });
  },

  // 미래 트렌드 예측 (Prophet 전용)
  async predictFutureTrend(dongCode, periods = 168) {
    return this.request(`/predict/future/${dongCode}?periods=${periods}`);
  },

  // 주간 패턴 예측
  async predictWeeklyPattern(dongCode) {
    return this.request(`/predict/weekly/${dongCode}`);
  },

  // 파이썬 서버 상태 확인
  async checkStatus() {
    return this.request('/');
  }
};



// AI Agent API 클라이언트 (단계별 분석용)
const AGENT_API_BASE_URL = 'http://localhost:8002';

export const agentApiClient = {
  // 공통 요청 함수
  async request(endpoint, options = {}) {
    const url = `${AGENT_API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`Agent API 요청 실패: ${response.status}`);
    }
    
    return response.json();
  },

  // 서버 상태 확인
  async healthCheck() {
    return this.request('/health');
  },

  // 단계별 전체 분석
  async analyzeStepByStep(dongName, populationData, timeStats, genderStats, ageStats) {
    return this.request('/analyze/step-by-step', {
      method: 'POST',
      body: JSON.stringify({
        dongName,
        populationData,
        timeStats,
        genderStats,
        ageStats
      }),
    });
  },

  // 개별 단계 분석 (점진적 로딩용)
  async analyzeSingleStep(step, state) {
    return this.request('/analyze/single-step', {
      method: 'POST',
      body: JSON.stringify({
        step,
        state
      }),
    });
  }
};

// LangGraph Agent API 클라이언트 (GPT-4o-mini + LangGraph)
const LANGGRAPH_API_BASE_URL = 'http://localhost:8004';

export const langGraphApiClient = {
  // 공통 요청 함수
  async request(endpoint, options = {}) {
    const url = `${LANGGRAPH_API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`LangGraph API 요청 실패: ${response.status}`);
    }
    
    return response.json();
  },

  // 서버 상태 확인
  async healthCheck() {
    return this.request('/health');
  },

  // LangGraph를 사용한 종합 분석
  async analyzeWithLangGraph(dongName, populationData, timeStats, genderStats, ageStats) {
    return this.request('/analyze/langgraph', {
      method: 'POST',
      body: JSON.stringify({
        dongName,
        populationData,
        timeStats,
        genderStats,
        ageStats
      }),
    });
  }
};

// Overview Insights Agent API 클라이언트 (실용적 인사이트 생성)
const OVERVIEW_INSIGHTS_API_BASE_URL = 'http://localhost:8003';

// 새로운 백엔드 AI Bundle API 클라이언트
const AI_BUNDLE_API_BASE_URL = 'http://localhost:8081'; // 백엔드 서버 주소

export const overviewInsightsApiClient = {
  // 공통 요청 함수
  async request(endpoint, options = {}) {
    const url = `${OVERVIEW_INSIGHTS_API_BASE_URL}${endpoint}`;
    console.log(`Overview Insights API 호출: ${url}`);
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Overview Insights API 요청 실패:
          - URL: ${url}
          - Status: ${response.status}
          - StatusText: ${response.statusText}
          - Response: ${errorText}`);
        throw new Error(`Overview Insights API 요청 실패: ${response.status} - ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Overview Insights API fetch 에러:', error);
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Overview Insights Agent 서버에 연결할 수 없습니다. 서버가 http://localhost:8004에서 실행 중인지 확인해주세요.');
      }
      throw error;
    }
  },

  // 서버 상태 확인
  async healthCheck() {
    return this.request('/health');
  },

  // Overview 실용적 인사이트 생성
  async generateOverviewInsights(dongName, populationData, timeStats, genderStats, ageStats) {
    return this.request('/analyze/overview-insights', {
      method: 'POST',
      body: JSON.stringify({
        dongName,
        populationData,
        timeStats,
        genderStats,
        ageStats
      }),
    });
  }
};

// 새로운 백엔드 AI Bundle API 클라이언트
export const aiBundleApiClient = {
  // 공통 요청 함수
  async request(endpoint, options = {}) {
    const url = `${AI_BUNDLE_API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI Bundle API 요청 실패:
        - URL: ${url}
        - Status: ${response.status}
        - StatusText: ${response.statusText}
        - Response: ${errorText}`);
      throw new Error(`AI Bundle API 요청 실패: ${response.status} - ${response.statusText}`);
    }
    
    return response.json();
  },

  // AI Bundle 데이터 조회 및 인사이트 생성 (새로운 엔드포인트)
  async getAiBundle(adstrdCode, date = null) {
    const dateParam = date ? `?date=${date}` : '';
    return this.request(`/population/ai/bundle/${adstrdCode}${dateParam}`, {
      method: 'GET'
    });
  },

  // AI Bundle 데이터를 Overview Insights Agent로 전달
  async generateInsightsFromBundle(aiBundleData) {
    // AI Bundle DTO를 Overview Insights Agent 형식으로 변환
    const {
      dongName,
      populationData,
      timeStats,
      genderStats,
      ageStats,
      ageGenderStats
    } = aiBundleData;

    return overviewInsightsApiClient.generateOverviewInsights(
      dongName,
      populationData,
      timeStats,
      genderStats,
      ageGenderStats?.totalAgeGroup || ageStats
    );
  }
};
