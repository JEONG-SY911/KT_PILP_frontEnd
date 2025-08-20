#!/usr/bin/env python3
"""
인구 수요 예측 서버 실행 스크립트
"""

import uvicorn
import subprocess
import sys
import os

def install_requirements():
    """필요한 패키지들을 설치합니다."""
    print("📦 필요한 Python 패키지들을 설치하는 중...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ 패키지 설치 완료!")
    except subprocess.CalledProcessError as e:
        print(f"❌ 패키지 설치 실패: {e}")
        sys.exit(1)

def main():
    print("🚀 인구 수요 예측 API 서버를 시작합니다...")
    print("📊 FastAPI + 머신러닝 기반 인구 예측 시스템")
    print("🌐 서버 주소: http://localhost:8000")
    print("📖 API 문서: http://localhost:8000/docs")
    print("-" * 50)
    
    # requirements.txt가 있으면 패키지 설치
    if os.path.exists("requirements.txt"):
        install_requirements()
    
    # FastAPI 서버 실행
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    main()
