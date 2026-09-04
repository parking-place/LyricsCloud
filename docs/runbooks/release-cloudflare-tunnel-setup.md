# 릴리스 서버 Cloudflare Tunnel과 HTTPS

이 문서는 LyricsCloud 릴리스 서버의 Cloudflare Tunnel 운영 절차를 다룬다. 실제 호스트명, SSH 주소, Tunnel UUID와 자격 증명 경로는 Git에서 제외된 `.private/server-inventory.local.md` 및 `.private/server-credentials.local.md`에서 확인한다. 릴리스 서버는 사용자가 현재 요청에서 명시적으로 승인한 경우에만 변경한다.

## 현재 확인 상태

2026-09-05 기준으로 실제 신규 릴리스 서버에 `cloudflared`를 설치하고 `lyricscloud-release` Tunnel을 생성했다. Tunnel 전용 자격 증명은 `/etc/cloudflared`에 `0600`으로 배치했으며 계정 전체 Tunnel 관리 권한을 가진 `/root/.cloudflared/cert.pem`과 중복 자격 증명은 제거했다.

릴리스 공개 hostname이 확정되지 않아 ingress, DNS route와 systemd 서비스는 아직 구성하지 않았다. 이 세 항목과 외부 TLS·health 검증을 마치기 전에는 릴리스 Tunnel 구성이 완료된 것으로 기록하지 않는다.

## 구성 계약

`/etc/cloudflared/config.yml`은 다음 구조를 유지한다. 대괄호 값은 비공개 인벤토리에서 읽으며 저장소 문서에 실제 값을 넣지 않는다.

```yaml
tunnel: <RELEASE-TUNNEL-UUID>
credentials-file: /etc/cloudflared/<RELEASE-TUNNEL-UUID>.json

ingress:
  - hostname: <RELEASE-HOSTNAME>
    service: http://127.0.0.1:8080
  - service: http_status:404
```

catch-all `http_status:404`는 등록하지 않은 hostname이 origin으로 전달되는 것을 차단한다. 릴리스 앱을 다른 loopback 포트에 배포했다면 비공개 인벤토리의 내부 URL과 ingress를 함께 바꾸고 검증한다.

## 검증 절차

서버에서 다음을 확인한다.

```bash
cloudflared --config /etc/cloudflared/config.yml tunnel ingress validate
systemctl is-enabled cloudflared
systemctl is-active cloudflared
journalctl -u cloudflared --since '10 minutes ago' --no-pager
```

`Registered tunnel connection`이 하나 이상 있어야 한다. 로컬 관리 자격 증명 권한도 확인한다.

```bash
stat -c '%a %n' /etc/cloudflared/config.yml
stat -c '%a %n' /etc/cloudflared/<RELEASE-TUNNEL-UUID>.json
test ! -e /root/.cloudflared/cert.pem
```

외부에서는 비공개 인벤토리의 상태 확인 URL을 사용한다. 앱 배포 전에는 TLS handshake 성공과 `502`를, 앱 배포 후에는 `/api/health/live`와 `/api/health/ready`의 `200`을 기대한다.

## DNS 또는 hostname 변경

DNS 관리가 필요할 때만 서버에서 `cloudflared tunnel login`을 실행하고 출력된 일회성 URL을 계정 소유자가 승인한다.

```bash
install -d -m 0700 /root/.cloudflared
cloudflared tunnel login
cloudflared tunnel route dns <RELEASE-TUNNEL-UUID> <RELEASE-HOSTNAME>
```

DNS와 ingress를 검증한 뒤 계정 범위 인증서를 제거한다. Tunnel 서비스는 `/etc/cloudflared`의 Tunnel 전용 JSON으로 계속 실행된다.

```bash
unlink /root/.cloudflared/cert.pem
```

기존 hostname을 제거하거나 Tunnel 자체를 삭제하는 작업은 별도의 명시적 승인을 받고, 정확한 DNS 레코드와 Tunnel UUID를 다시 확인한 뒤 수행한다.

## Google OAuth 후속 설정

릴리스 앱 배포 전 Google Cloud Console의 릴리스용 Web application client에 다음 관계를 적용한다.

```text
APP_ORIGIN=https://<RELEASE-HOSTNAME>
Authorized JavaScript origin=https://<RELEASE-HOSTNAME>
Authorized redirect URI=https://<RELEASE-HOSTNAME>/api/auth/callback
Authorized domain=parkingp.kr
```

실제 값은 `.private/server-inventory.local.md`의 릴리스 서버 Google OAuth 항목을 따른다. 개발용 OAuth client와 릴리스용 client secret을 재사용하지 않는다. Google Console의 Test users와 릴리스 서버의 `.test_users`는 자동 동기화되지 않으므로 각각 확인한다.

## 변경 기록과 되돌리기

모든 릴리스 변경은 비공개 인벤토리의 `릴리스 서버 승인·변경 기록`에 요청, 대상, 배포 식별자, 검증 결과와 되돌리기 방법을 남긴다. 앱 배포 없이 Tunnel 설정만 변경했을 때도 동일하다.

Tunnel 장애 시 설정 파일과 DNS를 임의로 재생성하지 않는다. 마지막으로 검증된 ingress와 Tunnel 전용 JSON의 존재·권한을 확인하고, 설정 변경이었다면 직전 hostname과 origin으로 복원한 뒤 서비스를 재시작한다.

## 공식 참고 자료

- <https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/>
- <https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/dns/>
- <https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/>
