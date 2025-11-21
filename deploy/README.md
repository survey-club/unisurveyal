# UniSurveyal 설치 가이드

## Docker Hub 이미지
- `dlarbdus/unisurveyal-npm:latest` - Nginx Proxy Manager (프록시 설정 포함)
- `dlarbdus/unisurveyal-frontend:latest` - React 프론트엔드
- `dlarbdus/unisurveyal-backend-auth:latest` - 인증 마이크로서비스
- `dlarbdus/unisurveyal-backend-survey:latest` - 설문 마이크로서비스

---

## 방법 A: 로컬 컴퓨터에서 직접 실행

Docker가 로컬 컴퓨터에서 실행되는 경우

### 1. Docker Compose 실행
```bash
docker compose pull
docker compose up -d
```

### 2. hosts 파일 수정
**Mac/Linux:**
```bash
sudo sh -c 'echo "127.0.0.1 unisurveyal.com auth.unisurveyal.com survey.unisurveyal.com" >> /etc/hosts'
```

**Windows:**
관리자 권한으로 메모장 실행 후 `C:\Windows\System32\drivers\etc\hosts` 파일에 추가:
```
127.0.0.1 unisurveyal.com auth.unisurveyal.com survey.unisurveyal.com
```

### 3. 서비스 접속
브라우저에서 `http://unisurveyal.com` 접속

---

## 방법 B: VM/원격 서버에서 실행

Docker가 Ubuntu VM (UTM 등) 또는 원격 서버에서 실행되고, 로컬 브라우저에서 접속하는 경우

### 1. VM/서버에서 Docker Compose 실행
```bash
docker compose pull
docker compose up -d
```

### 2. VM/서버 IP 확인
```bash
# Linux
ip addr | grep inet
# 또는
hostname -I
```
예: `192.168.64.8`

### 3. 로컬 PC에서 hosts 파일 수정
**Mac/Linux:**
```bash
sudo sh -c 'echo "192.168.64.8 unisurveyal.com auth.unisurveyal.com survey.unisurveyal.com" >> /etc/hosts'
```
(192.168.64.8을 실제 VM IP로 변경)

**Windows:**
관리자 권한으로 메모장 실행 후 `C:\Windows\System32\drivers\etc\hosts` 파일에 추가:
```
192.168.64.8 unisurveyal.com auth.unisurveyal.com survey.unisurveyal.com
```

### 4. 서비스 접속
로컬 브라우저에서 `http://unisurveyal.com` 접속

---

## DNS 캐시 초기화 (선택)
hosts 파일 수정 후 적용이 안 되면:
```bash
# Mac
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder

# Windows
ipconfig /flushdns
```

## 캐시 문제 발생 시
```bash
docker rm -f $(docker ps -aq)
docker system prune -a -f
docker volume prune -f
docker compose pull
docker compose up -d
```

## 컨테이너 구성 (6개)
| 컨테이너 | 역할 |
|---------|------|
| nginx-proxy-manager | 리버스 프록시 |
| mysql-db | 데이터베이스 |
| redis-session | 세션 저장소 |
| backend-auth | 인증 마이크로서비스 |
| backend-survey | 설문 마이크로서비스 |
| frontend-react | React 프론트엔드 |
