# 개발 서버 Cloudflare Tunnel과 HTTPS

이 문서는 LyricsCloud 개발 서버만 다룬다. 릴리스 서버와 릴리스 DNS·Tunnel·OAuth 설정은 사용자의 현재 요청에 명시적인 변경 지시가 있을 때만 변경한다. 서버 주소, SSH 계정, 비밀번호와 Tunnel 자격 증명은 저장소에 기록하지 않는다.

## 현재 개발 구성

| 항목 | 값 |
|---|---|
| 공개 주소 | `https://lyrics-dev.parkingp.kr` |
| Tunnel 이름 | `lyricscloud-dev` |
| origin | `http://127.0.0.1:8080` |
| 서버 | Debian 13 LXC |
| 설정 파일 | `/etc/cloudflared/config.yml` |
| 서비스 | `cloudflared.service` |
| TLS | Cloudflare Universal SSL 자동 발급·갱신 |

Cloudflare Tunnel은 서버에서 Cloudflare로 outbound 연결하므로 애플리케이션의 `8080` 포트를 외부에 열지 않는다. Cloudflare가 방문자 측 HTTPS를 종료하고 origin에는 LXC loopback HTTP로 연결한다.

무료 Universal SSL을 사용할 때 `parkingp.kr`의 apex와 한 단계 서브도메인인 `*.parkingp.kr`만 인증서에 포함된다. `dev.lyrics.parkingp.kr`처럼 두 단계인 이름은 사용하지 않는다. 깊은 서브도메인은 Advanced Certificate Manager, Total TLS 또는 별도 인증서가 필요하다.

## 설치

Cloudflare 공식 APT 저장소를 사용한다.

```bash
apt-get update
apt-get install -y ca-certificates curl
install -d -m 0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  -o /usr/share/keyrings/cloudflare-main.gpg
printf '%s\n' \
  'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' \
  > /etc/apt/sources.list.d/cloudflared.list
apt-get update
apt-get install -y cloudflared
```

설치 후 버전을 확인한다.

```bash
cloudflared --version
```

## Tunnel 생성

로컬 관리 Tunnel을 새로 만들 때만 다음 인증을 실행한다. 출력되는 URL은 계정 권한을 부여하는 일회성 링크이므로 공개 기록에 남기지 않는다.

```bash
install -d -m 0700 /root/.cloudflared
cloudflared tunnel login
cloudflared tunnel create lyricscloud-dev
```

생성된 Tunnel UUID의 자격 증명을 서비스 전용 경로로 복사하고 권한을 제한한다.

```bash
install -d -m 0750 /etc/cloudflared
install -m 0600 /root/.cloudflared/<TUNNEL-UUID>.json \
  /etc/cloudflared/<TUNNEL-UUID>.json
```

`/etc/cloudflared/config.yml`은 다음 구조로 작성하고 권한을 `0640`으로 제한한다.

```yaml
tunnel: <TUNNEL-UUID>
credentials-file: /etc/cloudflared/<TUNNEL-UUID>.json

ingress:
  - hostname: lyrics-dev.parkingp.kr
    service: http://127.0.0.1:8080
  - service: http_status:404
```

마지막 `http_status:404` 규칙은 등록하지 않은 호스트 요청을 origin으로 전달하지 않는 필수 catch-all이다.

## DNS와 systemd

Tunnel CNAME을 만들고 설정을 검증한 뒤 부팅 자동 시작 서비스를 설치한다.

```bash
cloudflared tunnel route dns <TUNNEL-UUID> lyrics-dev.parkingp.kr
cloudflared --config /etc/cloudflared/config.yml tunnel ingress validate
cloudflared --config /etc/cloudflared/config.yml service install
systemctl enable --now cloudflared
```

계정 `cert.pem`은 Tunnel 생성·DNS 관리가 가능한 계정 범위 자격 증명이고 실행 서비스에는 필요하지 않다. 초기 구성을 마친 뒤 Tunnel 전용 JSON이 `/etc/cloudflared`에 존재하고 서비스가 정상임을 확인한 다음 서버의 `cert.pem`과 `/root/.cloudflared`에 남은 중복 JSON을 제거한다. 이후 관리 작업은 `cloudflared tunnel login`으로 다시 인증한다.

## 검증

```bash
systemctl is-enabled cloudflared
systemctl is-active cloudflared
journalctl -u cloudflared --since '10 minutes ago' --no-pager
curl -I https://lyrics-dev.parkingp.kr
```

`Registered tunnel connection`이 하나 이상 있고 TLS handshake가 성공해야 한다. 앱을 아직 배포하지 않았거나 `127.0.0.1:8080`이 준비되지 않았다면 Cloudflare의 `502` 응답은 정상이다. 앱 배포 후에는 다음 두 경로가 `200`이어야 한다.

```bash
curl -fsS https://lyrics-dev.parkingp.kr/api/health/live
curl -fsS https://lyrics-dev.parkingp.kr/api/health/ready
```

## Google OAuth 후속 설정

개발 서버에 앱을 배포할 때 다음 값을 문자 단위로 일치시킨다.

```text
APP_ORIGIN=https://lyrics-dev.parkingp.kr
Authorized JavaScript origin=https://lyrics-dev.parkingp.kr
Authorized redirect URI=https://lyrics-dev.parkingp.kr/api/auth/callback
Authorized domain=parkingp.kr
```

Google Cloud Console 변경은 [`Google OAuth 개발 설정`](./google-oauth-setup.md)을 따른다. 서버 `.test_users`의 메일과 Google Auth Platform의 Test users는 자동 동기화되지 않으므로 각각 확인한다.

## 중단과 제거

일시 중단은 다음과 같이 수행한다.

```bash
systemctl stop cloudflared
```

Tunnel, DNS 레코드 또는 자격 증명 삭제는 복구가 필요한 변경이다. 정확한 개발 대상을 다시 확인하고 사용자가 삭제를 명시적으로 지시한 경우에만 실행한다. 릴리스 환경에는 이 절차를 적용하지 않는다.

## 공식 참고 자료

- <https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/>
- <https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/dns/>
- <https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/>
