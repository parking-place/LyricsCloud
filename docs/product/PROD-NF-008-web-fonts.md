# PROD-NF-008 — 무료 폰트 선택·다국어 표시

- 상태: **Accepted for 1.0.14**
- 작성일: 2026-09-09
- 최초 결정/소비: 1.0.14 P1
- 승인자/시각: Codex, 2026-09-12 05:50 KST. Noto Sans KR 선택·미리보기·영속·fallback 계약을 확정했다.

## 질문·대안·결정 gate

기존 `기본 산세리프`, `명조`, `고정폭`에 `Noto Sans KR`을 추가한다. 설정 화면의 대표 미리보기는 `한글 가사 · bright rhyme · 光 ひかり · ♫`이며 option 이름과 fallback 안내를 연결한다. 선택은 기존 사용자 표시 설정 API와 DB에 저장하고 새로고침·다른 탭·서비스 재시작 뒤 복원한다.

선택은 가사 CodeMirror 본문, 라임 노트 편집 textarea, 프롬프트 편집 textarea와 표시 미리보기에 같은 font stack으로 적용한다. 폰트는 표시 속성일 뿐 title/body/raw mode·Unicode code point·copy/export/search/revision 값을 변경하지 않는다. 교체 전후 cursor·selection·undo·scroll·IME composition을 보존한다. font download 실패나 지원되지 않는 일본어/Han glyph는 기존 system sans로 fallback하며 빈 글자나 저장 차단을 만들지 않는다.

## 영향과 수용

[세부 계약](../../0.Plans/2.Patch-phase/contracts/DICTIONARY-FONTS.md)의 언어/OS/권한·실패 사례와 [요구 추적](../../0.Plans/2.Patch-phase/Requirements-Traceability.md)을 소비한다. P2는 자산·lazy loading·cache/fallback, P3는 domain/DB/API·설정/편집 UI, P4는 glyph·원문·성능·브라우저 회귀를 담당한다.

## 되돌림·미실행

신규 표시/제공 기능을 중단해도 기존 창작물을 보존한다. 기술 전환은 호환/rollback을 검증한 뒤 적용한다. SDK/외부 서비스·권리·실제 OS/기기·배포 승인이 없으면 해당 결과를 미완료로 남긴다. 새 문서가 기존 Accepted 결정을 자동 대체하지 않으며 원문 이력은 보존한다.

[결정 색인](../../0.Plans/2.Patch-phase/Decision-Ownership.md)에서 승인자·시각·선택·대안·근거·영향받는 Phase·보류 이유를 연결한다.
