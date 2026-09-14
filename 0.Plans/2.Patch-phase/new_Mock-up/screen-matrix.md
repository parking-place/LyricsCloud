# B-1 화면·상태·플랫폼 행렬

표의 `기본`은 정상·로딩·빈 상태·오류 가운데 해당 화면에 의미 있는 상태를 뜻한다. `안전`은 별도로 시각화해야 하는 원문·권한·복구 경계다. 모든 화면은 light/dark와 320/360/390/tablet/desktop reflow 대상이며 PC는 Windows/Linux/macOS, mobile은 iOS/Android 문맥을 구분한다.

| 화면 | 기본 | 안전·기능 특화 | PC | iOS | Android |
|---|---|---|---|---|---|
| 01 가입 | 정상/로딩/오류 | 코드 만료·미소비 | W/L/M | safe area | back/control |
| 02 곡 목록 | 정상/로딩/빈/오류 | offline·목록/3 grid | W/L/M | bottom nav | bottom nav |
| 03 곡 정보 | 정상/오류 | offline·미전송 원문 | W/L/M | keyboard | keyboard |
| 04 곡 작업공간 | 정상/로딩/빈/오류 | offline·Suno 수동 연결 | W/L/M | next-action | next-action |
| 05 가사 편집 | 정상/로딩/오류 | IME·offline·미전송·복구·Extend | W/L/M | safe area/tools | back/tools |
| 06 라임 목록 | 정상/로딩/빈/오류 | 3 grid·사전 미연결 tooltip | W/L/M | touch tooltip | touch tooltip |
| 07 라임 편집 | 정상/오류 | offline·미전송·cursor 삽입 | W/L/M | keyboard | keyboard |
| 08 프롬프트 목록 | 정상/로딩/빈/오류 | 3 grid·태그/문장형 | W/L/M | bottom nav | bottom nav |
| 09 프롬프트 편집 | 정상/오류 | offline·미전송·원문 복사 | W/L/M | keyboard | keyboard |
| 10 검색 | 정상/로딩/빈/오류 | 자료 유형 구분 | W/L/M | search nav | search nav |
| 11 최근 | 정상/로딩/빈/오류 | 계정별 cursor 재개 | W/L/M | resume | resume |
| 12 즐겨찾기 | 정상/로딩/빈/오류 | 핀/즐겨찾기 분리 | W/L/M | reorder 대안 | reorder 대안 |
| 13 휴지통 | 정상/로딩/빈/오류 | 복원·영구 삭제·공유 비복원 | W/L/M | confirm sheet | confirm sheet |
| 14 템플릿 | 정상/로딩/빈/오류 | 적용 전 원문 보존 | W/L/M | preview | preview |
| 15 설정 | 정상/오류 | theme·font·glyph/fallback | W/L/M | platform font | platform font |
| 16 공유 설정 | 정상/로딩/오류 | read/write·presence·회수 | W/L/M | share sheet | share sheet |
| 17 공유 읽기 | 정상/로딩/오류 | 철회·snapshot 제거 | W/L/M | read only | read only |
| 18 공유 쓰기 | 정상/오류 | IME·offline·미전송·철회·자기 입력 복구 | W/L/M | safe area/tools | back/tools |

W/L/M은 각각 Windows 제목 문맥, Linux Wayland/X11 문맥, macOS 창 문맥을 뜻한다. 이는 HTML 시각 구분이며 실제 OS 동작 검증을 뜻하지 않는다.

## 1.1.7 웹 인수 상태

- PC Chromium/Firefox/WebKit과 Chromium/WebKit mobile viewport에서 가입→목록→곡→가사, 생성 exact 복귀, 목록 query, 공유/Suno, focus·keyboard 대안을 자동 검증했다.
- reduced motion/transparency, increased contrast/forced colors, 720px reflow와 Chromium 4x CPU 입력·서비스 재시작 영속을 개발 공개 환경에서 확인했다.
- iOS/Android 열의 safe area·native back/keyboard/lifecycle과 W/L/M의 OS IME·창/메뉴·보호 저장소는 HTML/browser 결과로 통과시키지 않고 1.1.8~1.1.14의 실제 플랫폼 gate로 넘긴다.
