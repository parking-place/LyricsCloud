# 1.1.7b 수용·DB 호환·되돌림

**24개 수용 기준 중 P1 담당 계약·첫 환경 검증과 P2 담당 AC-01~06/09/10(가사)/12의 최초 통합 인수를 완료했고, 전체 b 최종 수용은 미완료다.** AC-07/08/10(곡)/11/13~16은 P3 로컬 후보에서 검증했지만 원격 CI·signed image·동일 SHA 개발 인수 전에는 P3 완료가 아니다. P4/P5의 심화·교차 검증도 남아 있다. 원격 source의 시험 통과와 이번 b 후보 검증을 구별한다. [통합 맵](SOURCE-MAP.md) · [버전 계약](VERSION-CONTRACT.md) · [차단표](BLOCKERS.md).

| 수용 ID | 대상 | 통과 기준 | 담당 |
|---|---|---|---|
| `AC-RD-117B-01` | metadata 초안·늦은 ACK·계정별 복구 | owner/kind/document/revision별 보관, offline 닫기→재진입·명시 복원·quota·계정 전환·다른 탭 revision/새 입력을 늦은 ACK가 지우지 않는지 확인한다. | P2 / P4 |
| `AC-RD-117B-02` | 자동 저장 timer·가사/공유 IME ChangeSet | 조합 중 timer/flush/retry/dispose가 preedit를 확정 저장하지 않고 remote 내부 삽입·local undo가 보존되는지 확인한다. prompt 제목 잔존 문제와 별도 경로로 인수한다. | P2 / P4 |
| `AC-RD-117B-03` | guarded client navigation·shortcut | 동일 URL no-op·modified click·editor veto를 유지하며 await 뒤 pending 상태를 재확인한다. profile/PWA·back/reload와 page-local 링크까지 누락 경계를 마무리한다. | P2 / P4 |
| `AC-RD-117B-04` | 전역·가사 표시 설정 저장 응답 경쟁 | 제출 snapshot만 ACK하고 대기 중 새 draft/default/theme preview를 유지한다. reset conflict retry는 DELETE 의미와 최신 rowVersion을 보존한다. | P2 / P4 |
| `AC-RD-117B-05` | Suno 수동 workspace 초안·생성 재시도 | owner namespace·legacy key 정리·동기 in-flight lock·응답 뒤 계속 입력 보존·ACK된 생성의 edit 전환을 한 묶음으로 검사한다. 자동 metadata 수집은 포함하지 않는다. | P2 / P4 |
| `AC-RD-117B-06` | prompt 부분 치환·IME 순서·변환 재검사 | ES-02/04 후보를 재사용하되 ES-03 제목, 치환 구간 내부 remote, 복수 update·실제 OS IME·변환 권한/undo 잔여를 인수한다. | P2 / P4 |
| `AC-RD-117B-07` | 목록 응답 세대·검색 표시/키보드 순서 | 4화면 후보와 회귀를 선별한다. items/count/cursor/filterOptions/orderVersion/loading/error가 최신 query 소유인지 확인한다. 미변경 song-link-manager는 UI-03 잔여로 판정하고 1.2.5 확대 범위와 연결한다. | P3 / P4 |
| `AC-RD-117B-08` | 목록 metadata·favorite·최근 검색·수동 순서 경쟁 | 서로 다른 필드/항목의 성공을 실패 rollback이 덮지 않고 빠른 반전·동시 삭제/clear·오래된 move 실패를 처리한다. 비manual view anchor와 duplicate의 lock 순서/replay를 실제 DB로 검사한다. | P3 / P4 |
| `AC-RD-117B-09` | 템플릿 형식별 원문 draft | 형식 왕복 원문과 locked fieldset을 인수하되 type/target/selection 이탈의 입력 손실은 b에서 차단한다. UI-04/05 전체 UX는 1.2.5의 별도 범위다. | P2 / P4 |
| `AC-RD-117B-10` | 곡 부분 저장·가사 복제 응답 유실 | 곡 다단계 저장의 성공 필드/미완료를 구별하고 새 입력을 보존한다. 가사 duplicate는 checkpoint 전 lock·동일 requestId replay·대기 중 metadata 변경 시 중단을 확인한다. | P2 / P4 |
| `AC-RD-117B-11` | 중첩 modal·도구막대·preview·복사 | Escape가 최상단만 닫고 touch focus가 복귀하며 도구가 잘리지 않는지 현행 B1/classic에서 확인하고 1.2.0에 전환 회귀를 넘긴다. Extend 공백 marker·원문/선택 copy와 preview 설정 회귀를 유지한다. UI-07/08 해결로 간주하지 않는다. | P3 / P4 |
| `AC-RD-117B-12` | Service Worker 다중 build·명시 업데이트 | b P2/P4에서 먼저 인수한다. 구 탭 lazy chunk·unknown client/worker restart·탭별 승인·offline activation·private/no-store/Set-Cookie 배제·중복 fetch를 검사한다. b의 guard가 미전송 입력이 있는 reload를 먼저 차단하고, 1.2.1은 확장 상태 계약과 잔여 경계를 담당한다. | P2 / P4 |
| `AC-RD-117B-13` | OAuth/DB 잠금 뒤 만료·beta index key 방어 | provider 왕복과 intent/code/identity lock 뒤 live clock을 확인해 만료 시 session/grant/code 소비가 남지 않는지 시험한다. 다른 kid와 동일 kid bytes 변경의 운영 제약·tombstone을 유지하고 BE-01/02와 구별한다. | P3 / P4 |
| `AC-RD-117B-14` | 협업 projection 재시도 공정성 | 지속 실패 20개 뒤 정상 문서가 굶지 않는 keyset/wrap·trash 제외·timer 재진입 방지·Y.Doc cleanup·timestamp/오류 marker 보존을 검사한다. worker purge M-04 완료와 구별한다. | P3 / P4 |
| `AC-RD-117B-15` | guest 회수 뒤 서버 상태·authoredText 분리 | 회수/epoch-stale 시 서버 수용 body/cache로 복귀하고 작성 원문만 복구함에 둔다. 재연결·재허용 뒤 거절 입력 자동 재생이 없으며 ES-06 실패 보관과 충돌하지 않는지 실제 WS/DB로 인수한다. | P3 / P4 |
| `AC-RD-117B-16` | export v1 검증·휴지통 결과·삭제 영향 | 과거 v1 사진 필드 부재·새 Suno/photo 참조·owner 격리와 실제 export→validator를 검사한다. mutation 성공/refresh 실패를 분리하고 deletion batch 복원 수와 전체 cascade 자식 수를 구별한다. BE-04는 별도다. | P3 / P4 |
| `AC-RD-117B-17` | 환경 값·allowlist 날짜 도구 | 제공된 optional env의 안전 정수/공백·backup 값과 offset deadline의 ISO UTC 정규화를 인수한다. import-safe main guard/test를 함께 가져오며 실제 secret/keyring을 복사하거나 회전하지 않는다. | P1 / P4 |
| `AC-RD-117B-18` | 엄격한 release tag gate·build 설정 | annotated release gate와 fileURLToPath 의도를 검토하되 windows-native needs/assertion·1.1.8 build ID와 분리한다. native 재개 없이 같은 정책 의미를 유지하고 b P1에서 정확한 버전/경로와 가변 Phase 지원을 준비하고 1.2.0 P1은 이를 재사용한다. | P1 / P4 |
| `AC-RD-117B-19` | 정확한 b 버전·CI/manifest 경계 | VERSION-CONTRACT의 정상/invalid 행렬·a 회귀·b 5 Phase/숫자 가변 Phase·dev 후보/require-release 분리가 성공한다. 승인 true를 복사해 dev 검사를 통과시키지 않고 native CI 의존을 도입하지 않는다. | P1/P5 |
| `AC-RD-117B-20` | DB 세 종류·인가·migration 보존 | 새 웹·populated a·기존 1150+1151 환경에서 실제 migration 집합/checksum·RLS/role/FK·원문/사진/export·native API 비노출을 확인한다. 기존 1150/1151 기록과 자료를 변경/삭제하지 않는다. | P1/P4/P5 |
| `AC-RD-117B-21` | 22개 원인·필수 차단 해소 | BLOCKERS의 원인마다 현재 SHA/증거/해결·미확인을 판정한다. 손실/거짓 saved/인가/복구 위반과 적용되는 필수 P1이 남으면 b P4/P5를 완료하지 않으며 후속 번호로 면제하지 않는다. | P1/P4/P5 |
| `AC-RD-117B-22` | 현행 UI·실기기·성능 | 기존 UI의 정상/빈/실패/권한/offline 상태, 320/390/768/1440·양 테마·확대/fallback·실제 OS IME/AT/키보드를 영향 범위로 확인한다. 코발트를 먼저 적용하거나 미실행을 PASS로 바꾸지 않는다. | P2/P3/P4 |
| `AC-RD-117B-23` | 환경별 rollback·구 client/PWA | a 웹과 native 포함 PC의 이전 source/image·DB 유형을 각각 지정한다. 구 build 탭·초안/outbox·권한 epoch를 보존하고 application rollback 후 현재 문서/사진/export·쓰기 인가를 검사한다. | P4/P5 |
| `AC-RD-117B-24` | 동일 SHA 개발 인수·1.2.0 진입 | 원격 branch의 기능 SHA=CI source=image provenance=개발 배포 source가 일치하고 공개 live/ready·핵심 smoke를 통과한다. HANDOFF의 실제 b SHA를 채운 뒤에만 1.2.0 P1을 시작한다. 문서 전용 후속 SHA는 기능 SHA와 별도로 기록한다. | P5 |

P2의 최초 통합 판정 근거는 기능 SHA `3915a71f5abd9116bdd097ee4cc45cc6c71eadf0`의 로컬 전체 Chromium 410 PASS/44 skip, 격리 DB 관련 19 PASS, [PR verify](https://github.com/parking-place/LyricsCloud/actions/runs/35866450768)와 [push verify·네 signed dev image](https://github.com/parking-place/LyricsCloud/actions/runs/35866445486) PASS, 같은 SHA 개발 서버·공개 PC/mobile 저장/재진입 smoke다. AC-10은 **가사 복제 부분만** P2 판정이며 곡 부분 저장은 P3이다. AC-20의 개발 DB migration 31건 지문/native 1150/profile 1151 보존은 P2 배포 후에도 동일하지만 세 환경 전체 수용은 아니다. AC-22의 실제 OS IME·물리 기기·AT와 AC-21 22개 원인 최종 판정은 P4/P5에 남는다. 자세한 입력·실패 이력·합성 계정 정리는 [P2 인수 기록](2phase.md)을 따른다.

## DB·환경 인수 행렬

| 출발 환경 | 예상 이력·주의 | 필수 확인 | 중단 조건 |
|---|---|---|---|
| 새 웹 DB | 웹 기준 migration 적용, native 1150 없음 | 빈 설치/반복·1151 profile·RLS·native API 없음 | 예상 밖 native 파일/route가 통합됨 |
| 기존 v1.1.7a 웹 DB | populated 자료·1151, 1150 없음 | b 앱 업데이트/재시작·원문/사진/공유/revision/export·a 앱 rollback | 기존 checksum 수정·누락/권한 확대 |
| 기존 PC/개발 DB | native 1150+1151이 이미 존재할 수 있음 | 실제 schema_migrations 집합/hash·native 객체/FK/role 보존·b 웹 계약·별도 native 기능 미지원 기록 | 알 수 없는 이력·객체 충돌·자동 down/drop 필요 |

현재 migrator는 디스크에 있는 migration 파일을 검사하며 DB에만 있는 1150을 자동 거부/삭제하지 않는다. readiness는 1151 존재 확인이므로 **ready 1151만으로 세 환경이 동일하다고 판정하지 않는다.** P1 개발 배포 전후 migration 31건의 비밀 없는 지문 `42111a6b819fdb3a9a3282fefc566d409be9722342b8e8c5a0762c0fed02914a`와 native 1150 두 테이블은 보존됐다. 이는 개발 DB 한 종류의 read-only 지문/배포 확인이며 populated a DB 및 권한·자료·rollback 전체 PASS가 아니다. 이미 적용된 1150은 보존하고 새 웹 코드에 native API를 추가하지 않는다. 호환 수정이 필요하면 별도 계약과 비파괴 순방향 migration을 설계한다. 기존 1150/1151의 재작성은 금지한다.

기존 PC의 native 클라이언트가 b 웹 API 범위를 초과하면 해당 기능을 활성화하지 않고 영향을 인계한다. 이번 요청은 PC 자동 갱신/릴리스 서버 변경을 포함하지 않는다. 개발 대상도 실제 인수 시 환경별 권한과 runbook을 확인해 선정한다.

## 의미 있는 검증과 실행 환경

착수 시 현행 package scripts와 경로를 대조한다. 로컬 수용은 지원 Node/pnpm·격리 PostgreSQL/Docker와 제품 production browser를 사용한다. 기본 진입점은 `pnpm check`, `pnpm test` 및 해당 package의 기존 집중 시험이다. DB/e2e/script의 정확한 명령은 manifest·fixture를 읽고 환경을 고정한다. 존재하지 않는 b용 script를 이미 실행 가능하다고 안내하지 않는다.

원본 0922 실패 입력 → 동일 입력의 수정 후 결과, 원격 추가 회귀 → 새 b source, 실제 UI → Yjs raw → store/ACK → projection → 재진입을 연결한다. 검사 총개수만으로 완료하지 않고 역사 ID 충돌을 피한다. 실기기·외부 provider·실제 proxy·장기 부하/backup 복원은 대역 시험과 별도 표기한다. 문서만 바꾼 이번 작업에서는 앱 전체 검사·이미지·배포를 수행하지 않는다.

## rollback 계약

1. 환경별 현재 source/image digest·DB 이력·원문/사진/초안·PWA build를 확인하고 되돌릴 대상을 명시한다. 운영 a와 PC의 native 포함 C3를 같은 대상으로 쓰지 않는다.
2. code port는 기능 단위 commit으로 나누되 의존 helper/type/caller/test를 함께 되돌린다. 오래된 앱이 새 초안 형식을 읽지 못하면 호환 reader/복구 동선을 먼저 준비한다.
3. application rollback을 기본으로 하며 DB down/drop·volume 삭제·migration 이력 수정은 하지 않는다. 새 migration이 필요하면 이전 앱 호환/순방향 복구를 먼저 인수한다.
4. 저장 손실·거짓 saved·권한 위반이 있으면 쓰기 노출을 제한하고 원문 복사/다운로드·보존을 우선한다. outbox 폐기·validator 완화·회수된 private snapshot 재전송으로 복구하지 않는다.
5. SW rollback은 구 탭 cache/새 탭 build·탭별 승인을 고려한다. 미전송 입력이 있는 탭에 강제 reload를 보내지 않고 개인 응답 cache를 남기지 않는다.
6. 기존 backup/manifest와 실패 조사 증거를 보존한다. OPS-01 잠금 전환을 수정하면 구·신 잠금의 동시 실행 상호 배제와 TERM/KILL/재부팅 회복을 검사한다. 살아 있는 잠금을 시간만으로 지우지 않는다.

## 증거 양식

```text
수용 ID / source SHA / WC-ID·review ID / 담당:
시험 계층·환경·DB 유형·입력 fixture / 실행 명령:
수정 전 실패·수정 후 결과 / 원문·권한·반영 결과:
CI run/attempt·skip / image digest·서명 / 개발 source·공개 smoke:
실기기·외부 gate 미실행 / rollback 대상·결과 / 잔여:
```
