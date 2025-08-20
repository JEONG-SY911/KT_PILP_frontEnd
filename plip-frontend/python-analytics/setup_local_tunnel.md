# 🌐 로컬 백엔드 Ngrok 터널링 가이드

구글 코랩에서 여러분의 로컬 백엔드(localhost:8081)에 접근하려면 Ngrok 터널을 만들어야 합니다.

## 🚀 방법 1: Ngrok 설치 및 터널 생성

### 1단계: Ngrok 설치
```bash
# Windows (Chocolatey 사용)
choco install ngrok

# 또는 직접 다운로드
# https://ngrok.com/download 에서 다운로드 후 PATH에 추가
```

### 2단계: 로컬 백엔드 터널 생성
```bash
# 터미널에서 실행 (백엔드가 8081 포트에서 실행 중일 때)
ngrok http 8081
```

### 3단계: 출력된 Public URL 복사
```
ngrok by @inconshreveable

Session Status                online
Account                       your-email@example.com
Version                       2.3.40
Region                        United States (us)
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:8081
Forwarding                    http://abc123.ngrok.io -> http://localhost:8081

Connections                   ttl     opn     rt1     rt2     rt3
                              0       0       0.00    0.00    0.00
```

### 4단계: 코랩에서 URL 사용
코랩의 `colab_main.py`에서 다음 부분을 수정:

```python
# 기존 백엔드 API 베이스 URL
BACKEND_API_URL = "https://abc123.ngrok.io"  # 여기에 ngrok URL 입력
```

## 🛠 방법 2: 자동화 스크립트

아래 스크립트를 로컬에서 실행하면 자동으로 터널을 생성합니다:

```bash
# start_tunnel.bat (Windows)
@echo off
echo 🚀 백엔드 Ngrok 터널을 시작합니다...
echo 백엔드가 localhost:8081에서 실행 중인지 확인하세요!
pause
ngrok http 8081
```

```bash
# start_tunnel.sh (Mac/Linux)
#!/bin/bash
echo "🚀 백엔드 Ngrok 터널을 시작합니다..."
echo "백엔드가 localhost:8081에서 실행 중인지 확인하세요!"
read -p "계속하려면 Enter를 누르세요..."
ngrok http 8081
```

## ⚠️ 주의사항

1. **백엔드 먼저 실행**: ngrok 실행 전에 백엔드가 8081 포트에서 실행 중이어야 합니다
2. **무료 계정 제한**: 무료 ngrok 계정은 동시에 1개 터널만 가능
3. **URL 변경**: ngrok을 재시작할 때마다 URL이 바뀝니다
4. **CORS 설정**: 백엔드에서 ngrok URL을 허용하도록 CORS 설정 필요

## 🔄 전체 워크플로우

1. 로컬에서 백엔드 실행 (localhost:8081)
2. 새 터미널에서 `ngrok http 8081` 실행
3. 출력된 ngrok URL을 복사
4. 구글 코랩에서 해당 URL로 설정
5. 코랩에서 예측 API 실행
