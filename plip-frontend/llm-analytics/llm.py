from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
import torch
import pandas as pd
import numpy as np
import requests
from datetime import datetime
from typing import List, Dict, Any
import json
import logging
import warnings

warnings.filterwarnings('ignore')
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="인구 데이터 LLM 분석 API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 전역 변수로 모델 저장
llm_pipeline = None

@app.on_event("startup")
async def load_model():
    """서버 시작 시 LLM 모델 로드"""
    global llm_pipeline
    try:
        logger.info("DistilGPT-2 모델 로딩 시작...")
        
        model_id = "distilgpt2"  # 작고 빠른 오픈 모델
        
        # 토크나이저 및 모델 불러오기
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        
        # 패딩 토큰 설정 (DistilGPT-2에 필요)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
            
        model = AutoModelForCausalLM.from_pretrained(
            model_id, 
            device_map="auto",
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32
        )
        
        # 파이프라인 생성 (DistilGPT-2 최적화)
        llm_pipeline = pipeline(
            "text-generation", 
            model=model, 
            tokenizer=tokenizer,
            max_new_tokens=128,  # 더 짧게 설정 (1024 제한 고려)
            max_length=512,      # 전체 길이 제한
            temperature=0.8,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
            truncation=True      # 자동 잘림 활성화
        )
        
        logger.info("LLM 모델 로딩 완료!")
        
    except Exception as e:
        logger.error(f"모델 로딩 실패: {e}")
        raise e

@app.get("/")
async def root():
    return {"message": "인구 데이터 LLM 분석 서버가 실행 중입니다", "status": "running"}

@app.get("/health")
async def health_check():
    """서버 상태 확인"""
    return {
        "status": "healthy",
        "model_loaded": llm_pipeline is not None,
        "gpu_available": torch.cuda.is_available(),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/analyze/population-insights")
async def analyze_population_insights(data: Dict[str, Any]):
    """인구 데이터를 분석하여 인사이트 제공"""
    global llm_pipeline
    
    if llm_pipeline is None:
        raise HTTPException(status_code=503, detail="LLM 모델이 아직 로딩되지 않았습니다")
    
    try:
        # 입력 데이터 검증
        dong_name = data.get('dongName', '알 수 없는 동')
        population_data = data.get('populationData', {})
        time_stats = data.get('timeStats', [])
        gender_stats = data.get('genderStats', {})
        age_stats = data.get('ageStats', {})
        
        # 프롬프트 생성
        prompt = create_analysis_prompt(dong_name, population_data, time_stats, gender_stats, age_stats)
        
        # LLM으로 분석 실행
        logger.info(f"{dong_name} 지역 인구 데이터 분석 시작...")
        
        response = llm_pipeline(prompt)
        analysis_result = response[0]['generated_text'][len(prompt):].strip()
        
        logger.info("LLM 분석 완료")
        
        return {
            "status": "success",
            "dong_name": dong_name,
            "analysis": analysis_result,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"인구 데이터 분석 실패: {e}")
        raise HTTPException(status_code=500, detail=f"분석 중 오류 발생: {str(e)}")

@app.post("/analyze/trend-prediction")
async def analyze_trend_prediction(data: Dict[str, Any]):
    """인구 트렌드 예측 결과를 분석하여 해석 제공"""
    global llm_pipeline
    
    if llm_pipeline is None:
        raise HTTPException(status_code=503, detail="LLM 모델이 아직 로딩되지 않았습니다")
    
    try:
        dong_name = data.get('dongName', '알 수 없는 동')
        prediction_data = data.get('predictionData', [])
        current_stats = data.get('currentStats', {})
        
        # 예측 결과 분석 프롬프트 생성
        prompt = create_prediction_prompt(dong_name, prediction_data, current_stats)
        
        logger.info(f"{dong_name} 지역 인구 예측 데이터 분석 시작...")
        
        response = llm_pipeline(prompt)
        prediction_analysis = response[0]['generated_text'][len(prompt):].strip()
        
        logger.info("예측 데이터 분석 완료")
        
        return {
            "status": "success",
            "dong_name": dong_name,
            "prediction_analysis": prediction_analysis,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"예측 데이터 분석 실패: {e}")
        raise HTTPException(status_code=500, detail=f"분석 중 오류 발생: {str(e)}")

def create_analysis_prompt(dong_name: str, population_data: dict, time_stats: list, gender_stats: dict, age_stats: dict) -> str:
    """인구 데이터 분석을 위한 짧은 프롬프트 생성"""
    
    total_pop = population_data.get('total', 0)
    local_pop = population_data.get('local', 0)
    foreign_ratio = round((total_pop - local_pop) / total_pop * 100, 1) if total_pop > 0 else 0
    
    male = gender_stats.get('male', 0)
    female = gender_stats.get('female', 0)
    gender_ratio = round(male / (male + female) * 100, 1) if (male + female) > 0 else 50
    
    prompt = f"""{dong_name} 인구 분석:
총인구 {total_pop:,}명, 외국인비율 {foreign_ratio}%, 남성비율 {gender_ratio}%

분석 요청:
1. 지역 특성 (주거/상업/업무지역)
2. 인구 구성의 특징
3. 개발 방향 제안

간단명료하게 분석해주세요:"""

    return prompt

def create_prediction_prompt(dong_name: str, prediction_data: list, current_stats: dict) -> str:
    """인구 예측 데이터 분석을 위한 짧은 프롬프트 생성"""
    
    if prediction_data:
        peak_hour = max(prediction_data, key=lambda x: x.get('population', 0))
        lowest_hour = min(prediction_data, key=lambda x: x.get('population', 0))
        
        peak_pop = peak_hour.get('population', 0)
        low_pop = lowest_hour.get('population', 0)
        peak_time = peak_hour.get('hour', 0)
        low_time = lowest_hour.get('hour', 0)
    else:
        peak_pop = low_pop = peak_time = low_time = 0

    current_pop = current_stats.get('total', 0)

    prompt = f"""{dong_name} 내일 예측:
현재 {current_pop:,}명
최대 {peak_pop:,}명({peak_time}시), 최소 {low_pop:,}명({low_time}시)

분석 요청:
1. 피크시간 의미
2. 비즈니스 영향
3. 대응 방안

간단히 분석해주세요:"""

    return prompt

# 포맷 함수들을 제거하고 프롬프트 내에서 직접 처리

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
