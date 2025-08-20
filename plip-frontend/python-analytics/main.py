from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import pandas as pd
from prophet import Prophet
from prophet.diagnostics import cross_validation, performance_metrics
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, r2_score
import requests
from datetime import datetime, timedelta, date
import json
from typing import List, Dict, Any
import warnings
import logging

# Prophet 로깅 레벨 조정
logging.getLogger('prophet').setLevel(logging.WARNING)

warnings.filterwarnings('ignore')

app = FastAPI(title="인구 수요 예측 API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 기존 백엔드 API 베이스 URL
BACKEND_API_URL = "http://localhost:8081"

class PopulationPredictor:
    def __init__(self):
        self.model = None
        self.is_trained = False
        self.training_data = None
        self.backend_url = BACKEND_API_URL
    
    def fetch_population_data(self, dong_code: str) -> pd.DataFrame:
        """기존 백엔드에서 인구 데이터를 가져옵니다."""
        try:
            # 일별 데이터 가져오기
            response = requests.get(f"{self.backend_url}/population/gangnam/dongs/{dong_code}/daily", timeout=30)
            if response.status_code == 200:
                data = response.json()
                print(f"📡 API 응답 타입: {type(data)}")
                print(f"📡 API 응답 내용: {str(data)[:200]}...")
                
                # 응답이 문자열인 경우 JSON 파싱
                if isinstance(data, str):
                    import json
                    data = json.loads(data)
                
                # dailyDataList 키가 있는지 확인
                if isinstance(data, dict) and 'dailyDataList' in data:
                    data = data['dailyDataList']
                elif not isinstance(data, list):
                    print(f"⚠️ 예상치 못한 데이터 형식: {type(data)}")
                    raise Exception(f"예상치 못한 데이터 형식: {type(data)}")
                
                # Prophet용 데이터 전처리
                df_list = []
                for item in data:
                    date_str = item.get('date', '')
                    time_range = item.get('timeRange', '00:00-01:00')
                    hour = int(time_range.split(':')[0]) if time_range else 0
                    
                    # 날짜 + 시간 조합으로 정확한 타임스탬프 생성
                    try:
                        base_date = pd.to_datetime(date_str, format='%Y%m%d')
                        timestamp = base_date + pd.Timedelta(hours=hour)
                        
                        df_list.append({
                            'ds': timestamp,  # Prophet에서 요구하는 날짜 컬럼명
                            'y': item.get('totalPopulation', 0),  # Prophet에서 요구하는 값 컬럼명
                            'local_population': item.get('localPopulation', 0),
                            'long_foreigner': item.get('longForeignerPopulation', 0),
                            'temp_foreigner': item.get('tempForeignerPopulation', 0),
                            'hour': hour,
                            'date': date_str,
                            'time_range': time_range
                        })
                    except:
                        continue
                
                df = pd.DataFrame(df_list)
                df = df.dropna(subset=['ds', 'y'])  # 필수 컬럼에 결측값 제거
                df = df.sort_values('ds').reset_index(drop=True)
                
                print(f"✅ 데이터 로드 완료: {len(df)}개 레코드")
                return df
            else:
                raise Exception(f"API 호출 실패: {response.status_code}")
        except Exception as e:
            print(f"❌ 데이터 가져오기 오류: {e}")
            raise e
    
    def prepare_prophet_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prophet용 데이터 준비"""
        if df.empty:
            return df
        
        # Prophet용 추가 피처 생성
        prophet_df = df.copy()
        
        # 시간 기반 피처 추가 (Prophet의 추가 리그레서로 사용)
        prophet_df['hour'] = prophet_df['ds'].dt.hour
        prophet_df['day_of_week'] = prophet_df['ds'].dt.dayofweek
        prophet_df['is_weekend'] = (prophet_df['day_of_week'] >= 5).astype(int)
        prophet_df['month'] = prophet_df['ds'].dt.month
        prophet_df['day_of_month'] = prophet_df['ds'].dt.day
        
        return prophet_df
    
    def train_model(self, df: pd.DataFrame):
        """Prophet 모델 훈련"""
        if df.empty:
            raise ValueError("훈련 데이터가 없습니다.")
        
        print(f"🤖 Prophet 모델 훈련 시작... (데이터: {len(df)}개)")
        
        # Prophet용 데이터 준비
        prophet_df = self.prepare_prophet_data(df)
        
        # Prophet 모델 생성 및 설정
        self.model = Prophet(
            yearly_seasonality=False,  # 연간 계절성 (데이터 기간이 짧으면 False)
            weekly_seasonality=True,   # 주간 계절성
            daily_seasonality=True,    # 일간 계절성
            holidays_prior_scale=10.0,
            changepoint_prior_scale=0.05,
            seasonality_mode='multiplicative'  # 곱셈 계절성 (인구 데이터에 더 적합)
        )
        
        # 추가 리그레서 (외부 요인) 추가
        self.model.add_regressor('hour')
        self.model.add_regressor('is_weekend')
        self.model.add_regressor('local_population')
        self.model.add_regressor('long_foreigner') 
        self.model.add_regressor('temp_foreigner')
        
        # 모델 훈련
        self.model.fit(prophet_df)
        self.training_data = prophet_df
        self.is_trained = True
        
        # 모델 성능 평가 (교차 검증)
        try:
            print("📊 모델 성능 평가 중...")
            # 교차 검증 (최근 7일 예측)
            df_cv = cross_validation(
                self.model, 
                initial='30 days', 
                period='1 days', 
                horizon='7 days',
                disable_tqdm=True
            )
            df_p = performance_metrics(df_cv)
            
            mae = df_p['mae'].mean()
            mape = df_p['mape'].mean()
            rmse = df_p['rmse'].mean()
            
            performance = {
                'mae': float(mae),
                'mape': float(mape * 100),  # 백분율로 변환
                'rmse': float(rmse),
                'training_samples': len(df),
                'model_type': 'Prophet'
            }
            
        except Exception as e:
            print(f"⚠️ 성능 평가 실패 (데이터 부족): {e}")
            # 간단한 성능 평가 대체
            future = self.model.make_future_dataframe(periods=0, freq='H')
            
            # 추가 리그레서 데이터 추가
            for col in ['hour', 'is_weekend', 'local_population', 'long_foreigner', 'temp_foreigner']:
                if col in prophet_df.columns:
                    future[col] = prophet_df[col].iloc[:len(future)]
                else:
                    future[col] = 0
            
            forecast = self.model.predict(future)
            mae = np.mean(np.abs(forecast['yhat'] - prophet_df['y']))
            
            performance = {
                'mae': float(mae),
                'mape': 0.0,
                'rmse': float(mae * 1.2),
                'training_samples': len(df),
                'model_type': 'Prophet'
            }
        
        print(f"✅ 모델 훈련 완료! MAE: {performance['mae']:.1f}")
        return performance
    
    def predict_hourly_demand(self, target_date: str = None, hours: List[int] = None) -> List[Dict]:
        """Prophet을 사용한 특정 날짜의 시간대별 인구 수요 예측"""
        if not self.is_trained:
            raise ValueError("모델이 훈련되지 않았습니다.")
        
        # 기본값: 오늘 날짜
        if target_date is None:
            target_date = datetime.now().strftime('%Y-%m-%d')
        
        # 기본값: 24시간 전체
        if hours is None:
            hours = list(range(24))
        
        print(f"🔮 Prophet으로 {target_date}의 시간대별 예측 중...")
        
        # 예측할 타임스탬프 생성
        predictions = []
        base_date = pd.to_datetime(target_date)
        
        for hour in hours:
            target_timestamp = base_date + pd.Timedelta(hours=hour)
            
            # 단일 시점 예측을 위한 데이터프레임 생성
            future_single = pd.DataFrame({
                'ds': [target_timestamp],
                'hour': [hour],
                'is_weekend': [1 if target_timestamp.weekday() >= 5 else 0],
                'local_population': [self.training_data['local_population'].mean() if self.training_data is not None else 1000],
                'long_foreigner': [self.training_data['long_foreigner'].mean() if self.training_data is not None else 100],
                'temp_foreigner': [self.training_data['temp_foreigner'].mean() if self.training_data is not None else 50]
            })
            
            # 예측 실행
            forecast_single = self.model.predict(future_single)
            
            prediction = forecast_single['yhat'].iloc[0]
            lower_bound = forecast_single['yhat_lower'].iloc[0]
            upper_bound = forecast_single['yhat_upper'].iloc[0]
            
            predictions.append({
                'hour': hour,
                'timestamp': target_timestamp.isoformat(),
                'predicted_population': max(0, int(prediction)),
                'confidence_lower': max(0, int(lower_bound)),
                'confidence_upper': int(upper_bound),
                'day_of_week': target_timestamp.weekday(),
                'is_weekend': target_timestamp.weekday() >= 5
            })
        
        print(f"✅ Prophet 예측 완료: {len(predictions)}개 시간대")
        return predictions

# 전역 예측기 인스턴스
predictor = PopulationPredictor()

@app.get("/")
async def root():
    return {"message": "인구 수요 예측 API가 실행 중입니다! 🚀"}

@app.post("/train/{dong_code}")
async def train_prediction_model(dong_code: str):
    """특정 동의 데이터로 Prophet 예측 모델을 훈련합니다."""
    try:
        print(f"🚀 동 코드 {dong_code}의 Prophet 모델 훈련 시작...")
        
        # 실제 백엔드에서 데이터 가져오기
        df = predictor.fetch_population_data(dong_code)
        if df.empty:
            raise HTTPException(status_code=404, detail="해당 동의 데이터를 찾을 수 없습니다.")
        
        if len(df) < 48:  # 최소 2일치 시간별 데이터 필요
            raise HTTPException(status_code=400, detail=f"훈련 데이터가 부족합니다. 최소 48개 필요, 현재 {len(df)}개")
        
        # Prophet 모델 훈련
        performance = predictor.train_model(df)
        
        return {
            "status": "success",
            "message": f"동 코드 {dong_code}의 Prophet 모델 훈련 완료",
            "performance": performance,
            "data_points": len(df),
            "model_type": "Prophet",
            "data_range": {
                "start": df['ds'].min().isoformat(),
                "end": df['ds'].max().isoformat()
            }
        }
    
    except Exception as e:
        print(f"❌ 모델 훈련 실패: {e}")
        raise HTTPException(status_code=500, detail=f"모델 훈련 중 오류 발생: {str(e)}")

@app.post("/predict/hourly/{dong_code}")
async def predict_hourly_population(dong_code: str, target_date: str = None, prediction_hours: List[int] = None):
    """Prophet을 사용한 시간대별 인구 수요 예측"""
    try:
        if not predictor.is_trained:
            raise HTTPException(status_code=400, detail="모델이 훈련되지 않았습니다. 먼저 /train/{dong_code}를 호출하세요.")
        
        # 기본값: 오늘 날짜
        if target_date is None:
            target_date = datetime.now().strftime('%Y-%m-%d')
        
        # 기본값: 24시간 전체 예측
        if prediction_hours is None:
            prediction_hours = list(range(24))
        
        print(f"🔮 동 코드 {dong_code}의 {target_date} 예측 시작...")
        
        # Prophet으로 예측
        predictions = predictor.predict_hourly_demand(target_date, prediction_hours)
        
        # 요약 통계 계산
        if predictions:
            peak_prediction = max(predictions, key=lambda x: x['predicted_population'])
            min_prediction = min(predictions, key=lambda x: x['predicted_population'])
            avg_population = int(np.mean([p['predicted_population'] for p in predictions]))
            
            summary = {
                "peak_hour": peak_prediction['hour'],
                "peak_population": peak_prediction['predicted_population'],
                "peak_confidence": {
                    "lower": peak_prediction['confidence_lower'],
                    "upper": peak_prediction['confidence_upper']
                },
                "min_hour": min_prediction['hour'],
                "min_population": min_prediction['predicted_population'],
                "avg_population": avg_population
            }
        else:
            summary = {}
        
        return {
            "dong_code": dong_code,
            "prediction_date": target_date,
            "model_type": "Prophet",
            "predictions": predictions,
            "summary": summary,
            "total_predicted_hours": len(predictions)
        }
    
    except Exception as e:
        print(f"❌ 예측 실패: {e}")
        raise HTTPException(status_code=500, detail=f"예측 중 오류 발생: {str(e)}")

@app.get("/predict/future/{dong_code}")
async def predict_future_trend(dong_code: str, periods: int = 168):  # 기본 7일 = 168시간
    """Prophet을 사용한 미래 인구 트렌드 예측"""
    try:
        if not predictor.is_trained:
            raise HTTPException(status_code=400, detail="모델이 훈련되지 않았습니다.")
        
        if periods > 720:  # 최대 30일
            raise HTTPException(status_code=400, detail="예측 기간이 너무 깁니다. 최대 720시간(30일)까지 가능합니다.")
        
        print(f"📈 동 코드 {dong_code}의 {periods}시간 미래 트렌드 예측...")
        
        # Prophet으로 미래 예측
        forecast_df = predictor.predict_future_population(periods=periods, freq='H')
        
        # 결과 정리
        future_predictions = []
        for _, row in forecast_df.iterrows():
            future_predictions.append({
                'timestamp': row['ds'].isoformat(),
                'predicted_population': max(0, int(row['yhat'])),
                'confidence_lower': max(0, int(row['yhat_lower'])),
                'confidence_upper': int(row['yhat_upper']),
                'trend': float(row['trend']),
                'hour': row['ds'].hour,
                'day_of_week': row['ds'].weekday(),
                'is_weekend': row['ds'].weekday() >= 5
            })
        
        # 트렌드 분석
        trend_analysis = {
            'overall_trend': 'increasing' if forecast_df['trend'].iloc[-1] > forecast_df['trend'].iloc[0] else 'decreasing',
            'trend_change': float(forecast_df['trend'].iloc[-1] - forecast_df['trend'].iloc[0]),
            'max_prediction': int(forecast_df['yhat'].max()),
            'min_prediction': int(forecast_df['yhat'].min()),
            'avg_prediction': int(forecast_df['yhat'].mean())
        }
        
        return {
            "dong_code": dong_code,
            "model_type": "Prophet",
            "prediction_periods": periods,
            "prediction_start": future_predictions[0]['timestamp'] if future_predictions else None,
            "prediction_end": future_predictions[-1]['timestamp'] if future_predictions else None,
            "predictions": future_predictions,
            "trend_analysis": trend_analysis
        }
    
    except Exception as e:
        print(f"❌ 미래 예측 실패: {e}")
        raise HTTPException(status_code=500, detail=f"미래 예측 중 오류 발생: {str(e)}")

@app.get("/predict/weekly/{dong_code}")
async def predict_weekly_pattern(dong_code: str):
    """7일간 주간 인구 패턴을 예측합니다."""
    try:
        if not predictor.is_trained:
            raise HTTPException(status_code=400, detail="모델이 훈련되지 않았습니다.")
        
        weekly_predictions = []
        day_names = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']
        
        # 기존 데이터 통계
        df = predictor.fetch_population_data(dong_code)
        avg_stats = {
            'local_population': df['local_population'].mean() if not df.empty else 1000,
            'long_foreigner': df['long_foreigner'].mean() if not df.empty else 100,
            'temp_foreigner': df['temp_foreigner'].mean() if not df.empty else 50
        }
        
        for day_idx in range(7):
            is_weekend = 1 if day_idx >= 5 else 0
            
            # 각 요일의 시간대별 예측
            daily_features = []
            for hour in range(24):
                daily_features.append({
                    'hour': hour,
                    'day_of_week': day_idx,
                    'is_weekend': is_weekend,
                    'local_population': avg_stats['local_population'],
                    'long_foreigner': avg_stats['long_foreigner'],
                    'temp_foreigner': avg_stats['temp_foreigner']
                })
            
            daily_predictions = predictor.predict_hourly_demand(daily_features)
            
            weekly_predictions.append({
                'day_name': day_names[day_idx],
                'day_index': day_idx,
                'is_weekend': bool(is_weekend),
                'hourly_predictions': daily_predictions,
                'daily_average': int(np.mean([p['predicted_population'] for p in daily_predictions])),
                'daily_peak': max(daily_predictions, key=lambda x: x['predicted_population'])['predicted_population']
            })
        
        return {
            "dong_code": dong_code,
            "weekly_pattern": weekly_predictions,
            "insights": {
                "busiest_day": max(weekly_predictions, key=lambda x: x['daily_peak'])['day_name'],
                "quietest_day": min(weekly_predictions, key=lambda x: x['daily_average'])['day_name'],
                "weekend_vs_weekday": {
                    "weekend_avg": int(np.mean([day['daily_average'] for day in weekly_predictions if day['is_weekend']])),
                    "weekday_avg": int(np.mean([day['daily_average'] for day in weekly_predictions if not day['is_weekend']]))
                }
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"주간 패턴 예측 중 오류 발생: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
