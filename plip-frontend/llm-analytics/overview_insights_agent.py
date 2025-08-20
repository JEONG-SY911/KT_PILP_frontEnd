####### Overview 실용적 인사이트 생성 Agent #######
## LangGraph를 활용한 단계별 분석 및 실용적 조언 생성

import pandas as pd
import numpy as np
import os
import random
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import List, Dict, Any, Literal, TypedDict
import json
import logging
import warnings
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

warnings.filterwarnings("ignore", category=DeprecationWarning)

from typing import Annotated, Literal, Sequence, TypedDict, List, Dict
from langchain import hub
from langchain_core.messages import BaseMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_community.embeddings import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.output_parsers import CommaSeparatedListOutputParser
from langgraph.graph import StateGraph, END

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 환경변수에서 설정 로드
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8003"))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# API 키 확인
if not OPENAI_API_KEY:
    logger.error("OPENAI_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.")
    raise ValueError("OPENAI_API_KEY가 필요합니다.")

logger.info(f"Overview Insights Agent 서버 환경: {ENVIRONMENT}")
logger.info(f"OpenAI API 키 설정됨: {'*' * 10}{OPENAI_API_KEY[-4:] if OPENAI_API_KEY else 'None'}")

app = FastAPI(title="Overview 실용적 인사이트 생성 API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 임시로 모든 origin 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

## 1. State 정의 ---------------------------------------------
class OverviewInsightsState(TypedDict):
    dong_name: str
    population_data: Dict[str, Any]
    time_stats: List[Dict[str, Any]]
    gender_stats: Dict[str, Any] 
    age_stats: Dict[str, Any]
    
    # 단계별 분석 결과
    traffic_analysis: str      # 교통 혼잡 시간대 분석
    dining_analysis: str       # 식당 메뉴 추천 분석
    business_analysis: str     # 사업 아이템 추천 분석
    lifestyle_analysis: str    # 생활 패턴 분석
    
    # 최종 결과
    overview_insights: List[Dict[str, str]]  # [{type: "traffic", content: "..."}, ...]
    current_step: str

## 2. LangGraph Agent 노드들 ---------------------------------------------

def analyze_traffic_patterns(state: OverviewInsightsState) -> OverviewInsightsState:
    """교통 혼잡 시간대 분석"""
    dong_name = state.get("dong_name", "")
    time_stats = state.get("time_stats", [])
    
    llm = ChatOpenAI(model="gpt-4o-mini")
    
    # 시간대별 인구 데이터 준비 (Double 타입 처리)
    time_data_text = ""
    if time_stats and len(time_stats) > 0:
        sorted_times = sorted(time_stats, key=lambda x: float(x.get('totalPopulation', 0)), reverse=True)
        top_3_busy = sorted_times[:3]
        time_data_text = ", ".join([f"{t.get('timeRange', 'N/A')}시({int(float(t.get('totalPopulation', 0))):,}명)" for t in top_3_busy])
    
    prompt = ChatPromptTemplate.from_template("""
당신은 도시 교통 패턴 분석 전문가입니다.
{dong_name}의 시간대별 인구 데이터를 바탕으로 교통 혼잡 시간대를 분석해주세요.

시간대별 인구 데이터 (상위 3개): {time_data}

구체적인 이유 예시:
- 출근/퇴근 러시아워
- 상업지역 특성상 쇼핑객 유입
- 인근 사무빌딩/학교의 활동 시간
- 식당가 이용객 집중 시간

다음 형식으로 **5줄 이내**로 간결하게 답변해주세요:
"교통이 가장 혼잡한 시간대는 "XX"시 입니다. 이는 [구체적인 이유 1-2가지]로 인해 대중교통 이용량과 도로 교통량이 급증하는 시간대입니다."
""")
    
    formatted_prompt = prompt.format(
        dong_name=dong_name,
        time_data=time_data_text or "데이터 없음"
    )
    
    response = llm.invoke(formatted_prompt)
    traffic_analysis = response.content.strip()
    
    logger.info(f"교통 분석 완료: {traffic_analysis[:50]}...")
    
    return {
        **state,
        "traffic_analysis": traffic_analysis,
        "current_step": "traffic_completed"
    }

def analyze_dining_recommendations(state: OverviewInsightsState) -> OverviewInsightsState:
    """식당 메뉴 추천 분석"""
    dong_name = state.get("dong_name", "")
    time_stats = state.get("time_stats", [])
    gender_stats = state.get("gender_stats", {})
    age_stats = state.get("age_stats", [])
    
    llm = ChatOpenAI(model="gpt-4o-mini")
    
    # 점심/저녁 시간대 데이터 추출 (Double 타입 처리)
    lunch_data = [t for t in time_stats if any(hour in t.get('timeRange', '') for hour in ['11', '12', '13'])]
    dinner_data = [t for t in time_stats if any(hour in t.get('timeRange', '') for hour in ['17', '18', '19', '20', '21', '22'])]
    
    lunch_population = sum([float(t.get('totalPopulation', 0)) for t in lunch_data])
    dinner_population = sum([float(t.get('totalPopulation', 0)) for t in dinner_data])
    
    # 성별/연령 정보 (Double 타입 처리)
    male_count = float(gender_stats.get('male', 0))
    female_count = float(gender_stats.get('female', 0))
    total_count = float(gender_stats.get('total', 1)) if gender_stats.get('total', 0) > 0 else 1
    
    male_ratio = round(male_count / total_count * 100, 1)
    female_ratio = round(female_count / total_count * 100, 1)
    
    prompt = ChatPromptTemplate.from_template("""
당신은 외식업계 트렌드 분석 전문가입니다.
{dong_name}의 인구 구성과 식사 시간대 데이터를 바탕으로 인기 메뉴를 예측해주세요.

데이터:
- 점심시간(11-13시) 유동인구: {lunch_pop:,}명
- 저녁시간(17-22시) 유동인구: {dinner_pop:,}명  
- 성별 비율: 남성 {male_ratio}%, 여성 {female_ratio}%
- 지역 특성: {dong_name}

메뉴 선택 시 고려사항:
- 성별 비율에 따른 선호도
- 직장인/학생/주부 등 주 고객층
- 지역 특성 (상업지/주거지/오피스가)
- 가격대와 접근성
- 배달/포장 가능성

다음 형식으로 **5줄 이내**로 간결하게 답변해주세요:
"(성별, 나이대를 고려하여) 가장 인기있을 것 같은 점심(11시~13시) 메뉴는 "XXX"이고 저녁(17시~22시) 메뉴는 "XXX"입니다. 점심 메뉴 선택 이유는 [구체적 이유 1-2가지], 저녁 메뉴 선택 이유는 [구체적 이유 1-2가지]입니다."
""")
    
    formatted_prompt = prompt.format(
        dong_name=dong_name,
        lunch_pop=int(lunch_population),
        dinner_pop=int(dinner_population),
        male_ratio=male_ratio,
        female_ratio=female_ratio
    )
    
    response = llm.invoke(formatted_prompt)
    dining_analysis = response.content.strip()
    
    logger.info(f"식당 메뉴 분석 완료: {dining_analysis[:50]}...")
    
    return {
        **state,
        "dining_analysis": dining_analysis,
        "current_step": "dining_completed"
    }

def analyze_business_opportunities(state: OverviewInsightsState) -> OverviewInsightsState:
    """사업 아이템 추천 분석"""
    dong_name = state.get("dong_name", "")
    population_data = state.get("population_data", {})
    time_stats = state.get("time_stats", [])
    gender_stats = state.get("gender_stats", {})
    
    llm = ChatOpenAI(model="gpt-4o-mini")
    
    # 피크 시간대 분석 (Double 타입 처리)
    peak_times = sorted(time_stats, key=lambda x: float(x.get('totalPopulation', 0)), reverse=True)[:2]
    peak_info = ", ".join([f"{t.get('timeRange', 'N/A')}시" for t in peak_times])
    
    # 외국인 비율 (Double 타입 처리)
    total_pop = float(population_data.get('total', 1)) if population_data.get('total', 0) > 0 else 1
    long_foreigner = float(population_data.get('longForeigner', 0))
    temp_foreigner = float(population_data.get('tempForeigner', 0))
    foreigner_ratio = round((long_foreigner + temp_foreigner) / total_pop * 100, 1)
    
    prompt = ChatPromptTemplate.from_template("""
당신은 창업 컨설팅 전문가입니다.
{dong_name}의 인구 데이터를 바탕으로 유망한 사업 아이템을 추천해주세요.

데이터:
- 총 인구: {total:,}명
- 외국인 비율: {foreigner_ratio}%
- 성별 비율: 남성 {male_ratio}%, 여성 {female_ratio}%
- 주요 활동 시간대: {peak_times}
- 지역: {dong_name}

고려 요소:
- 인구 밀도와 유동인구
- 성별/연령 구성
- 외국인 비율 (다문화 서비스 필요성)
- 피크 시간대 (서비스 시간 최적화)
- 지역 특성 (상업/주거/업무)

다음 형식으로 **5줄 이내**로 간결하게 답변해주세요:
"이 지역에서 가장 유망한 사업 아이템은 "XXX업종"입니다. 추천 이유는 [구체적 근거 2-3가지]이며, 특히 [타겟 고객층]을 대상으로 한 [구체적 서비스/상품]이 성공 가능성이 높습니다."
""")
    
    male_ratio = round(float(gender_stats.get('male', 0)) / total_pop * 100, 1)
    female_ratio = round(float(gender_stats.get('female', 0)) / total_pop * 100, 1)
    
    formatted_prompt = prompt.format(
        dong_name=dong_name,
        total=int(total_pop),
        foreigner_ratio=foreigner_ratio,
        male_ratio=male_ratio,
        female_ratio=female_ratio,
        peak_times=peak_info
    )
    
    response = llm.invoke(formatted_prompt)
    business_analysis = response.content.strip()
    
    logger.info(f"사업 아이템 분석 완료: {business_analysis[:50]}...")
    
    return {
        **state,
        "business_analysis": business_analysis,
        "current_step": "business_completed"
    }

def analyze_lifestyle_patterns(state: OverviewInsightsState) -> OverviewInsightsState:
    """생활 패턴 분석"""
    dong_name = state.get("dong_name", "")
    time_stats = state.get("time_stats", [])
    population_data = state.get("population_data", {})
    
    llm = ChatOpenAI(model="gpt-4o-mini")
    
    # 시간대별 패턴 분석 (Double 타입 처리)
    morning_pop = sum([float(t.get('totalPopulation', 0)) for t in time_stats if any(h in t.get('timeRange', '') for h in ['06', '07', '08', '09'])])
    afternoon_pop = sum([float(t.get('totalPopulation', 0)) for t in time_stats if any(h in t.get('timeRange', '') for h in ['14', '15', '16'])])
    night_pop = sum([float(t.get('totalPopulation', 0)) for t in time_stats if any(h in t.get('timeRange', '') for h in ['22', '23', '00', '01'])])
    
    prompt = ChatPromptTemplate.from_template("""
당신은 도시 생활 패턴 분석 전문가입니다.
{dong_name}의 시간대별 인구 변화를 바탕으로 주민들의 생활 패턴을 분석해주세요.

데이터:
- 아침 시간대(06-09시) 인구: {morning:,}명
- 오후 시간대(14-16시) 인구: {afternoon:,}명  
- 심야 시간대(22-01시) 인구: {night:,}명
- 총 상주인구: {total:,}명

분석 관점:
- 주거지역 vs 상업지역 vs 업무지역 특성
- 직장인 vs 학생 vs 주부 중심 지역
- 유동인구 vs 상주인구 비율
- 활동 시간대 패턴
- 지역 내 주요 시설/인프라 영향

다음 형식으로 **5줄 이내**로 간결하게 답변해주세요:
"이 지역의 주요 생활 패턴은 "XXX형 지역"입니다. 특징으로는 [패턴 설명 2-3가지]이며, 이는 [지역 특성과 주민 구성에 대한 분석]을 보여줍니다."
""")
    
    formatted_prompt = prompt.format(
        dong_name=dong_name,
        morning=int(morning_pop),
        afternoon=int(afternoon_pop),
        night=int(night_pop),
        total=int(float(population_data.get('total', 0)))
    )
    
    response = llm.invoke(formatted_prompt)
    lifestyle_analysis = response.content.strip()
    
    logger.info(f"생활 패턴 분석 완료: {lifestyle_analysis[:50]}...")
    
    return {
        **state,
        "lifestyle_analysis": lifestyle_analysis,
        "current_step": "lifestyle_completed"
    }

def generate_overview_insights(state: OverviewInsightsState) -> OverviewInsightsState:
    """최종 Overview 인사이트 생성"""
    traffic_analysis = state.get("traffic_analysis", "")
    dining_analysis = state.get("dining_analysis", "")
    business_analysis = state.get("business_analysis", "")
    lifestyle_analysis = state.get("lifestyle_analysis", "")
    
    # 각 분석을 구조화된 형태로 변환
    overview_insights = [
        {
            "type": "traffic",
            "title": "🚦 교통 혼잡 시간대",
            "content": traffic_analysis,
            "icon": "🚗"
        },
        {
            "type": "dining", 
            "title": "🍽️ 인기 메뉴 예측",
            "content": dining_analysis,
            "icon": "🥘"
        },
        {
            "type": "business",
            "title": "💼 유망 사업 아이템", 
            "content": business_analysis,
            "icon": "🏪"
        },
        {
            "type": "lifestyle",
            "title": "🏠 생활 패턴 분석",
            "content": lifestyle_analysis,
            "icon": "⏰"
        }
    ]
    
    logger.info(f"Overview 인사이트 생성 완료: {len(overview_insights)}개 항목")
    
    return {
        **state,
        "overview_insights": overview_insights,
        "current_step": "completed"
    }

## 3. LangGraph 구성 ---------------------------------------------

def create_overview_insights_graph():
    """Overview Insights 생성 그래프 구성"""
    
    # StateGraph 생성
    workflow = StateGraph(OverviewInsightsState)
    
    # 노드 추가
    workflow.add_node("traffic_analysis", analyze_traffic_patterns)
    workflow.add_node("dining_analysis", analyze_dining_recommendations) 
    workflow.add_node("business_analysis", analyze_business_opportunities)
    workflow.add_node("lifestyle_analysis", analyze_lifestyle_patterns)
    workflow.add_node("generate_insights", generate_overview_insights)
    
    # 엣지 설정 (순차 실행)
    workflow.set_entry_point("traffic_analysis")
    workflow.add_edge("traffic_analysis", "dining_analysis")
    workflow.add_edge("dining_analysis", "business_analysis") 
    workflow.add_edge("business_analysis", "lifestyle_analysis")
    workflow.add_edge("lifestyle_analysis", "generate_insights")
    workflow.add_edge("generate_insights", END)
    
    return workflow.compile()

# 그래프 인스턴스 생성
overview_graph = create_overview_insights_graph()

## 4. FastAPI 엔드포인트 ---------------------------------------------

@app.get("/health")
async def health_check():
    """서버 상태 확인"""
    return {
        "status": "healthy",
        "service": "Overview Insights Agent",
        "model": "gpt-4o-mini",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/analyze/overview-insights")
async def generate_overview_insights_endpoint(data: Dict[str, Any]):
    """Overview 실용적 인사이트 생성"""
    
    try:
        dong_name = data.get('dongName', '알 수 없는 동')
        population_data = data.get('populationData', {})
        time_stats = data.get('timeStats', [])
        gender_stats = data.get('genderStats', {})
        age_stats = data.get('ageStats', [])
        
        logger.info(f"{dong_name} Overview 인사이트 생성 시작...")
        logger.info(f"받은 인구 데이터: {population_data}")
        logger.info(f"받은 시간대 데이터 개수: {len(time_stats) if time_stats else 0}")
        
        # 초기 상태 설정
        initial_state: OverviewInsightsState = {
            "dong_name": dong_name,
            "population_data": population_data,
            "time_stats": time_stats,
            "gender_stats": gender_stats,
            "age_stats": age_stats,
            "traffic_analysis": "",
            "dining_analysis": "",
            "business_analysis": "",
            "lifestyle_analysis": "",
            "overview_insights": [],
            "current_step": "started"
        }
        
        # LangGraph 실행
        final_state = overview_graph.invoke(initial_state)
        
        logger.info(f"{dong_name} Overview 인사이트 생성 완료")
        
        return {
            "dong_name": dong_name,
            "insights": final_state["overview_insights"],
            "status": "completed",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Overview 인사이트 생성 실패: {e}")
        raise HTTPException(status_code=500, detail=f"분석 중 오류 발생: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Overview Insights Agent 서버 시작: {HOST}:{PORT}")
    uvicorn.run(app, host=HOST, port=PORT)
