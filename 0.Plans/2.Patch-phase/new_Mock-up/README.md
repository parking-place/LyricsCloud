# new_Mock-up 작업 공간 — 아직 실제 화면안 없음

이 폴더는 **제품 버전 없는 UX에서 만들 새 설계의 위치와 범위**만 정의한다. 이번 계획 패키지에 실제 목업/로고 이미지가 생성된 것은 아니다. 기존 `0.Plans/Mock-up/**`는 수정하지 않는다.

각 화면에 README(목적/정보/동선/상태/PC·mobile/접근성)와 light/dark 자산, prototype인지 정적 화면인지 표시를 둔다. 이후 index와 디자인 토큰, 승인 manifest를 만든다. 파일명/프레임 ID는 안정적으로 관리해 요구 추적과 visual test를 연결한다.

## 화면 범위

01 로그인/가입·beta code, 02 곡 목록, 03 곡 정보, 04 곡 대시보드/Suno 링크, 05 가사 편집, 06 라임 목록, 07 라임 편집, 08 prompt 목록, 09 prompt 모드 편집, 10 검색, 11 최근 작업, 12 즐겨찾기/핀, 13 휴지통, 14 템플릿, 15 설정/계정, 16 공유 설정, 17 공유 읽기, 18 공유 쓰기/권한 철회·자기 초안 복구.

각 화면은 정상/빈/오류/권한 없음/로딩을 기본으로 하고 해당하는 offline·저장중·IME·코드만료·공유철회·삭제 상태를 추가한다. 320/360/390px·tablet·desktop과 200% 확대를 검토한다. 모든 상태를 동일 수의 이미지로 억지 생성하지 않고 해당 여부/증거 위치를 screen matrix에 표시한다.

[UX 계획](../design/UX/README.md), [디자인/native 계약](../contracts/DESIGN-NATIVE.md), [도구 계획](../TOOLS-AND-SKILLS.md)을 따른다. 사용자 승인 manifest 없이는 1.1.5 구현에 사용하지 않는다.


## 시안 선택과 플랫폼 범위

UX P2에서 약 5개 morphism 대안을 비교하고 사용자가 선택한 뒤 P3에 이 공간을 채운다. PC(Windows/Linux/macOS 차이), iOS, Android 목업을 각각 계획하며 동일 화면을 크기만 바꿔 플랫폼 인수로 대신하지 않는다. 현재 실제 시안·로고 파일은 없다.

공유의 현재 참가자/cursor·selection·권한 철회, 라임 세 언어 사전 tooltip과 키보드/터치·실패, 폰트 설정·다국어 glyph/fallback을 포함한다. glass/blur/saturation/shadow·SVG distortion·motion은 접근성/reduced-motion·불투명 fallback·저사양 성능과 함께 검토한다.
