# ####### 인구 데이터 분석용 LangGraph Agent #######
# ## 1. 라이브러리 로딩 ---------------------------------------------
# import pandas as pd
# import numpy as np
# import os
# import openai
# import random
# import ast
# from fastapi import FastAPI, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from datetime import datetime
# from typing import List, Dict, Any, Literal, TypedDict
# import json
# import logging
# import warnings
# from dotenv import load_dotenv

# # .env 파일 로드
# load_dotenv()

# warnings.filterwarnings("ignore", category=DeprecationWarning)

# from typing import Annotated, Literal, Sequence, TypedDict, List, Dict
# from langchain import hub
# from langchain_core.messages import BaseMessage, HumanMessage
# from langchain_core.output_parsers import StrOutputParser
# from langchain_core.prompts import PromptTemplate, ChatPromptTemplate
# from langchain_openai import ChatOpenAI
# from langchain_community.embeddings import OpenAIEmbeddings
# from langchain_community.vectorstores import Chroma
# from langchain.output_parsers import CommaSeparatedListOutputParser
# from langgraph.graph import StateGraph, END

# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# # 환경변수에서 설정 로드
# OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
# HOST = os.getenv("HOST", "0.0.0.0")
# PORT = 8004  # Population LangGraph 전용 포트
# ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# # API 키 확인
# if not OPENAI_API_KEY:
#     logger.error("OPENAI_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.")
#     raise ValueError("OPENAI_API_KEY가 필요합니다.")

# logger.info(f"서버 환경: {ENVIRONMENT}")
# logger.info(f"OpenAI API 키 설정됨: {'*' * 10}{OPENAI_API_KEY[-4:] if OPENAI_API_KEY else 'None'}")

# app = FastAPI(title="인구 데이터 LangGraph Agent 분석 API", version="1.0.0")

# # CORS 설정
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:3000"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# ## ---------------- 1단계 : 사전준비 ----------------------

# # 1) State 선언 --------------------
# class PopulationAnalysisState(TypedDict):
#     # 고정 정보
#     dong_name: str
#     population_data: Dict[str, float]  # Double 타입 처리
#     time_stats: List[Dict]
#     gender_stats: Dict[str, float]     # Double 타입 처리
#     age_stats: Dict[str, float]        # Double 타입 처리
#     data_summary: str
#     analysis_strategy: Dict[str, Dict]

#     # 분석 로그
#     current_analysis: str
#     current_result: str
#     current_step: str
#     analysis_log: List[Dict[str, str]]
#     evaluation: List[Dict[str, str]]
#     next_step: str
#     final_report: str

# # 2) 데이터 분석 --------------------
# def analyze_population_data(state: PopulationAnalysisState) -> PopulationAnalysisState:
#     """인구 데이터를 분석하여 요약 생성"""
#     dong_name = state.get("dong_name", "")
#     population_data = state.get("population_data", {})
#     time_stats = state.get("time_stats", [])
#     gender_stats = state.get("gender_stats", {})
#     age_stats = state.get("age_stats", {})
    
#     if not population_data:
#         logger.warning("population_data가 비어 있습니다. 기본값으로 진행합니다.")
#         population_data = {"total": 0.0, "local": 0.0, "longForeigner": 0.0, "tempForeigner": 0.0}
    
#     # 데이터 유효성 검사 (Double 타입 처리)
#     total_pop = float(population_data.get('total', 0))
#     local_pop = float(population_data.get('local', 0))
#     logger.info(f"분석할 데이터 - 총인구: {int(total_pop):,}명, 내국인: {int(local_pop):,}명")

#     llm = ChatOpenAI(model="gpt-4o-mini")

#     # 요약 프롬프트 구성
#     summary_prompt = ChatPromptTemplate.from_template(
#         '''당신은 인구 데이터를 바탕으로 분석을 수행하는 AI입니다.
#         다음 {dong_name}의 인구 데이터에서 분석을 위한 중요한 내용을 5문장 정도로 요약해주세요:

#         인구 데이터:
#         - 총 인구: {total}명
#         - 내국인: {local}명  
#         - 장기 외국인: {long_foreigner}명
#         - 단기 외국인: {temp_foreigner}명
#         - 남성: {male}명
#         - 여성: {female}명

#         시간대별 패턴: {time_pattern}
#         '''
#     )
    
#     # 시간대별 패턴 요약
#     time_pattern = "데이터 없음"
#     if time_stats and len(time_stats) > 0:
#         # 올바른 키 사용: totalPopulation, timeRange (Double 타입 처리)
#         peak_time = max(time_stats, key=lambda x: float(x.get('totalPopulation', 0)))
#         low_time = min(time_stats, key=lambda x: float(x.get('totalPopulation', 0)))
#         peak_pop = int(float(peak_time.get('totalPopulation', 0)))
#         low_pop = int(float(low_time.get('totalPopulation', 0)))
#         time_pattern = f"피크: {peak_time.get('timeRange', 'N/A')}시 ({peak_pop:,}명), 최저: {low_time.get('timeRange', 'N/A')}시 ({low_pop:,}명)"
    
#     formatted_summary_prompt = summary_prompt.format(
#         dong_name=dong_name,
#         total=int(float(population_data.get('total', 0))),
#         local=int(float(population_data.get('local', 0))),
#         long_foreigner=int(float(population_data.get('longForeigner', 0))),  # Double 타입 처리
#         temp_foreigner=int(float(population_data.get('tempForeigner', 0))),  # Double 타입 처리
#         male=int(float(gender_stats.get('male', 0))),
#         female=int(float(gender_stats.get('female', 0))),
#         time_pattern=time_pattern
#     )
    
#     summary_response = llm.invoke(formatted_summary_prompt)
#     data_summary = summary_response.content.strip()

#     return {
#         **state,
#         "data_summary": data_summary,
#     }

# # 3) 분석 전략 수립 --------------------
# def generate_analysis_strategy(state: PopulationAnalysisState) -> PopulationAnalysisState:
#     """분석 전략 수립"""
#     data_summary = state.get("data_summary", "")
#     dong_name = state.get("dong_name", "")

#     prompt = ChatPromptTemplate.from_template("""
# 당신은 인구 데이터 분석 전문가입니다. 주어진 {dong_name}의 '데이터 요약'을 기반으로, 가장 효과적인 분석 전략을 수립해야 합니다.
# 다음 세 가지 분석 부문별로 심층적인 분석 방향과 핵심 질문을 제시해 주세요.
# 모든 답변은 **제공된 데이터 요약 내용에 근거**하여 작성해야 합니다.

# - 데이터 요약:
# {data_summary}

# 아래 **명시된 딕셔너리 형식**을 정확히 준수하여 출력해 주세요. 다른 서식(예: JSON, 마크다운)은 사용하지 마세요.

# {{
# "인구구성분석": {{
# "분석전략": "총 인구 대비 내외국인 비율, 남녀 성비, 연령대별 분포 등 인구 구성의 특징을 심층적으로 분석하여 지역의 핵심적인 인구 프로파일을 정의합니다.",
# "핵심질문": [
# "내국인과 외국인 생활인구의 시간대별 활동 반경 차이는 지역 상권의 업종 구성과 밀접하게 연관되어 있는가?",
# "남녀 성비와 연령대별 인구 분포가 지역 내 편의시설 및 서비스 업종에 어떤 시사점을 주는가?"
# ]
# }},
# "시간패턴분석": {{
# "분석전략": "요일별, 시간대별 인구 변동 패턴을 분석하여 특정 시간대에 인구가 급증하거나 감소하는 원인을 파악하고, 주요 활동 시간대를 정의합니다.",
# "핵심질문": [
# "특정 시간대에 유입되는 생활인구의 주요 활동 목적(쇼핑, 출퇴근, 여가 등)은 무엇이며, 이는 지역 편의시설의 운영 시간 및 서비스 구성에 어떤 시사점을 주는가?",
# "특정 시간대의 인구 급증이 교통량, 대중교통 이용률에 어떤 영향을 미치는가?"
# ]
# }},
# "지역특성분석": {{
# "분석전략": "주변 지역과의 인구 이동 패턴, 외부 유입 요인(관광, 상업시설 등)을 분석하여 해당 지역이 가진 고유한 특성(상업지, 주거지, 복합지 등)을 규명합니다.",
# "핵심질문": [
# "이 지역의 주요 인구 유입 및 유출 원인은 무엇이며, 이는 지역 경제 활성화에 어떤 영향을 미치는가?",
# "인구 변화 패턴과 외부 유입 요인(예: 대형 쇼핑몰, 공원) 간의 상관관계는 어떻게 나타나는가?"
# ]
# }}
# }}
# """
# )

#     llm = ChatOpenAI(model="gpt-4o-mini")
#     formatted_prompt = prompt.format(dong_name=dong_name, data_summary=data_summary)
#     response = llm.invoke(formatted_prompt)

#     # 딕셔너리로 변환
#     dict_value = response.content.strip()
#     if isinstance(dict_value, str):
#         try:
#             strategy_dict = ast.literal_eval(dict_value)
#         except Exception as e:
#             raise ValueError("analysis_strategy를 딕셔너리로 변환하는 데 실패했습니다.") from e

#     return {
#         **state,
#         "analysis_strategy": strategy_dict
#     }

# # 4) 1단계 하나로 묶기 --------------------
# def preProcessing_Analysis(dong_name: str, population_data: dict, time_stats: list, gender_stats: dict, age_stats: dict) -> PopulationAnalysisState:
#     """전처리 단계"""
#     # state 초기화
#     initial_state: PopulationAnalysisState = {
#         "dong_name": dong_name,
#         "population_data": population_data,
#         "time_stats": time_stats,
#         "gender_stats": gender_stats,
#         "age_stats": age_stats,
#         "data_summary": '',
#         "analysis_strategy": {},

#         "current_analysis": '',
#         "current_result": '',
#         "current_step": '',
#         "analysis_log": [],
#         "evaluation": [],
#         "next_step": '',
#         "final_report": ''
#     }

#     # 데이터 분석
#     state = analyze_population_data(initial_state)

#     # 분석 전략 수립
#     state = generate_analysis_strategy(state)

#     # 첫번째 분석 시작
#     analysis_strategy = state["analysis_strategy"]
#     first_analysis = "인구구성분석"
#     strategy_text = analysis_strategy[first_analysis]["분석전략"]
#     core_questions = analysis_strategy[first_analysis]["핵심질문"]
#     selected_question = random.choice(core_questions)

#     return {
#             **state,
#             "current_analysis": selected_question,
#             "current_step": first_analysis
#             }

# ## ---------------- 2단계 : 분석 Agent ----------------------

# # 1) 분석 실행 --------------------
# def execute_analysis(state: PopulationAnalysisState) -> PopulationAnalysisState:
#     """현재 분석 실행"""
#     llm = ChatOpenAI(model="gpt-4o-mini")

#     current_analysis = state.get("current_analysis", "")
#     current_step = state.get("current_step", "")
#     analysis_strategy = state.get("analysis_strategy", "")
#     data_summary = state.get("data_summary", "")
#     dong_name = state.get("dong_name", "")

#     # 분석 전략 추출
#     strategy_block = ""
#     if isinstance(analysis_strategy, dict):
#         strategy_block = analysis_strategy.get(current_step, {}).get("분석전략", "")
#     elif isinstance(analysis_strategy, str):
#         try:
#             parsed = ast.literal_eval(analysis_strategy)
#             strategy_block = parsed.get(current_step, {}).get("분석전략", "")
#         except Exception:
#             strategy_block = ""

#     # 프롬프트 구성
#     prompt = ChatPromptTemplate.from_template("""
# 당신은 인구 데이터 분석 전문가입니다.
# 다음의 참조 정보를 확인하고 분석을 수행해주세요.

# [참고 정보]
# - 지역: {dong_name}
# - 데이터 요약: {data_summary}
# - 분석 전략({current_step}): {strategy}
# - 분석 질문: {analysis}

# 위 정보를 바탕으로 분석 질문에 대해 구체적이고 실용적인 답변을 제공해주세요.
# 답변은 3-4문장으로 간결하게 작성해주세요.
# """)

#     formatted_prompt = prompt.format(
#         dong_name=dong_name,
#         data_summary=data_summary,
#         strategy=strategy_block,
#         current_step=current_step,
#         analysis=current_analysis
#     )

#     response = llm.invoke(formatted_prompt)
#     analysis_result = response.content.strip()

#     # (1) 분석 로그 저장 (질문/답변 1쌍)
#     state["analysis_log"].append({"analysis": current_analysis, "result": analysis_result})

#     return {
#         **state,
#         "current_result": analysis_result
#     }

# # 2) 분석 평가 --------------------
# def evaluate_analysis(state: PopulationAnalysisState) -> PopulationAnalysisState:
#     """분석 결과 평가"""
#     llm = ChatOpenAI(model="gpt-4o-mini")

#     current_analysis = state.get("current_analysis", "")
#     current_result = state.get("current_result", "")
#     current_step = state.get("current_step", "")

#     # 프롬프트 구성
#     prompt = ChatPromptTemplate.from_template("""
# 당신은 인구 데이터 분석 평가자입니다.
# 다음 분석 결과를 평가해주세요.

# [분석 정보]
# - 분석 단계: {current_step}
# - 분석 질문: {analysis}
# - 분석 결과: {result}

# 위 정보를 바탕으로 아래 두 가지 항목에 따라 분석 결과를 평가해주세요.
# - 분석의 구체성: 분석이 얼마나 구체적이고 실질적인 내용을 포함하고 있는지
# - 실용성: 분석 결과가 실제 활용 가능한 인사이트를 제공하는지

# 각 항목에 대해 '상', '중', '하' 중 하나로 평가해주세요.

# 최종 결과는 아래 형식의 딕셔너리로만 출력해주세요:
# {{
#   "분석의 구체성": "상",
#   "실용성": "중"
# }}
# """)

#     formatted_prompt = prompt.format(
#         current_step=current_step,
#         analysis=current_analysis,
#         result=current_result
#     )

#     response = llm.invoke(formatted_prompt)
    
#     # 딕셔너리로 변환
#     eval_dict = response.content.strip()
#     if isinstance(eval_dict, str):
#         try:
#             eval_dict = ast.literal_eval(eval_dict)
#         except Exception as e:
#             eval_dict = {"분석의 구체성": "중", "실용성": "중"}

#     # (2) 평가 저장 (인덱스 포함)
#     evaluation = state.get("evaluation", [])
#     eval_dict["analysis_index"] = len(state["analysis_log"]) - 1
#     evaluation.append(eval_dict)

#     return {
#         **state,
#         "evaluation": evaluation
#     }

# # 3) 다음 단계 결정 --------------------
# def decide_next_step(state: PopulationAnalysisState) -> PopulationAnalysisState:
#     """다음 분석 단계 결정"""
#     evaluation = state.get("evaluation", [])
#     analysis_log = state.get("analysis_log", [])
#     current_step = state.get("current_step", "")

#     # (1) 분석이 3회를 초과하면 종료
#     if len(analysis_log) >= 3:
#         next_step = "end"
#     # (2) 현재 단계에 따라 다음 단계 결정
#     elif current_step == "인구구성분석":
#         next_step = "시간패턴분석"
#     elif current_step == "시간패턴분석":
#         next_step = "지역특성분석"
#     else:
#         next_step = "end"

#     return {
#         **state,
#         "next_step": next_step
#     }

# # 4) 다음 분석 생성 --------------------
# def generate_next_analysis(state: PopulationAnalysisState) -> PopulationAnalysisState:
#     """다음 분석 질문 생성"""
#     analysis_strategy = state.get("analysis_strategy", {})
#     next_step = state.get("next_step", "")
    
#     if next_step in analysis_strategy:
#         core_questions = analysis_strategy[next_step]["핵심질문"]
#         selected_question = random.choice(core_questions)
        
#         return {
#             **state,
#             "current_analysis": selected_question,
#             "current_step": next_step,
#             "current_result": ""
#         }
    
#     return state

# # 5) 최종 보고서 생성 --------------------
# def generate_final_report(state: PopulationAnalysisState) -> PopulationAnalysisState:
#     """최종 분석 보고서 생성"""
#     dong_name = state.get("dong_name", "")
#     analysis_log = state.get("analysis_log", [])
    
#     report_sections = []
#     for i, log in enumerate(analysis_log):
#         report_sections.append(f"""
# {i+1}. {log['analysis']}
#    → {log['result']}
# """)
    
#     final_report = f"""
# 🏙️ {dong_name} 인구 데이터 종합 분석 보고서

# {''.join(report_sections)}

# 📊 분석 완료: {len(analysis_log)}개 항목
# ⏰ 분석 일시: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
# """
    
#     return {
#         **state,
#         "final_report": final_report
#     }

# # 6) Agent --------------------
# # 분기 판단 함수
# def route_next(state: PopulationAnalysisState) -> Literal["generate", "summarize"]:
#     return "summarize" if state["next_step"] == "end" else "generate"

# # 그래프 정의 시작
# builder = StateGraph(PopulationAnalysisState)

# # 노드 추가
# builder.add_node("execute", execute_analysis)
# builder.add_node("evaluate", evaluate_analysis)
# builder.add_node("decide", decide_next_step)
# builder.add_node("generate", generate_next_analysis)
# builder.add_node("summarize", generate_final_report)

# # 노드 연결
# builder.set_entry_point("execute")
# builder.add_edge("execute", "evaluate")
# builder.add_edge("evaluate", "decide")
# builder.add_conditional_edges("decide", route_next)
# builder.add_edge("generate", "execute")      # 루프
# builder.add_edge("summarize", END)           # 종료

# # 컴파일
# graph = builder.compile()

# ## ---------------- FastAPI 엔드포인트 ----------------------

# @app.get("/")
# async def root():
#     return {"message": "인구 데이터 LangGraph Agent 분석 서버가 실행 중입니다", "status": "running"}

# @app.get("/health")
# async def health_check():
#     return {
#         "status": "healthy",
#         "model": "gpt-4o-mini",
#         "timestamp": datetime.now().isoformat()
#     }

# @app.post("/analyze/langgraph")
# async def analyze_with_langgraph(data: Dict[str, Any]):
#     """LangGraph Agent를 사용한 인구 데이터 분석"""
    
#     try:
#         dong_name = data.get('dongName', '알 수 없는 동')
#         population_data = data.get('populationData', {})
#         time_stats = data.get('timeStats', [])
#         gender_stats = data.get('genderStats', {})
#         age_stats = data.get('ageStats', {})
        
#         logger.info(f"{dong_name} LangGraph 분석 시작...")
#         logger.info(f"받은 인구 데이터: {population_data}")
#         logger.info(f"받은 시간대 데이터 개수: {len(time_stats) if time_stats else 0}")
#         logger.info(f"받은 성별 데이터: {gender_stats}")
#         logger.info(f"받은 연령 데이터 타입: {type(age_stats)}, 내용: {age_stats}")
        
#         # 전처리 단계
#         initial_state = preProcessing_Analysis(
#             dong_name, population_data, time_stats, gender_stats, age_stats
#         )
        
#         # LangGraph 실행
#         final_state = graph.invoke(initial_state)
        
#         logger.info("LangGraph 분석 완료")
        
#         return {
#             "status": "success",
#             "dong_name": dong_name,
#             "data_summary": final_state.get("data_summary", ""),
#             "analysis_strategy": final_state.get("analysis_strategy", {}),
#             "analysis_log": final_state.get("analysis_log", []),
#             "evaluation": final_state.get("evaluation", []),
#             "final_report": final_state.get("final_report", ""),
#             "timestamp": datetime.now().isoformat()
#         }
        
#     except Exception as e:
#         logger.error(f"LangGraph 분석 실패: {e}")
#         raise HTTPException(status_code=500, detail=f"분석 중 오류 발생: {str(e)}")

# if __name__ == "__main__":
#     import uvicorn
#     logger.info(f"서버 시작: {HOST}:{PORT}")
#     uvicorn.run(app, host=HOST, port=PORT)
