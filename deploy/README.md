# UniSurveyal 설치 가이드

## Docker Hub 이미지
- `dlarbdus/unisurveyal-npm:latest` - Nginx Proxy Manager (프록시 설정 포함)
- `dlarbdus/unisurveyal-frontend:latest` - React 프론트엔드
- `dlarbdus/unisurveyal-backend-auth:latest` - 인증 마이크로서비스
- `dlarbdus/unisurveyal-backend-survey:latest` - 설문 마이크로서비스

## 설치 방법

### 1. hosts 파일 수정

**Mac/Linux:**
```bash
sudo sh -c 'echo "127.0.0.1 unisurveyal.com auth.unisurveyal.com survey.unisurveyal.com" >> /etc/hosts'
```

**Windows:**
관리자 권한으로 메모장 실행 후 `C:\Windows\System32\drivers\etc\hosts` 파일에 추가:
```
127.0.0.1 unisurveyal.com auth.unisurveyal.com survey.unisurveyal.com
```

### 2. Docker Compose 실행
```bash
# 최신 이미지 다운로드 및 실행
docker-compose pull
docker-compose up -d
```

**캐시 문제 발생 시:**
```bash
docker-compose down
docker system prune -a -f
docker-compose pull
docker-compose up -d
```

### 3. 서비스 접속
브라우저에서 `http://unisurveyal.com` 접속

## 컨테이너 구성 (6개)
| 컨테이너 | 역할 |
|---------|------|
| nginx-proxy-manager | 리버스 프록시 |
| mysql-db | 데이터베이스 |
| redis-session | 세션 저장소 |
| backend-auth | 인증 마이크로서비스 |
| backend-survey | 설문 마이크로서비스 |
| frontend-react | React 프론트엔드 |
