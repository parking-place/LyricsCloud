# 1.2.0 목업 207기능 → 실제 제품 대응표

기준: 1.1.7b 기능 SHA `acd2bd99876740debf426c401fe7157713f8b854`, 목업 원본 `mockup/base/feature-data.js`의 **고유 207 ID 전수**. 표의 컴포넌트명은 `apps/web/src/components/` 기준이며 경로는 현행 제품 route다. `현행 계약→시각 이식`은 목업의 로컬 시연 코드를 제품 구현으로 간주하지 않는다는 뜻이다. 각 행의 `목업 한계`는 원본 기능 설명의 한계를 보존한다. 실제 서버·권한·CodeMirror/Yjs는 현행 제품 구현을 사용하고 P2/P3에서 외형만 안전하게 전환한다. `시연 시험상태`는 독립 제품 기능이 아니라 P4 검증 입력이다.

| ID | 목업 기능 | 현행 route | 실제 제품 지점 | 판정/담당 | 목업 한계·차이 |
|---|---|---|---|---|---|
| `F-SH-01` | 데스크톱 브랜드/홈 | `전역` | `app-shell.tsx` | 현행 계약→시각 이식 · P2 | 이미 홈 재클릭 별도 알림은 없음 |
| `F-SH-02` | 레일 접기/펼치기 | `전역` | `app-shell.tsx` | 레일→도크 재배치 · P2 | 좌측 레일 대신 도크 재배치 제안 |
| `F-SH-03` | 주 메뉴 10개 | `전역` | `app-shell.tsx` | 현행 계약→시각 이식 · P2 | 없음 |
| `F-SH-04` | B1 작업 문맥 | `전역` | `app-shell.tsx` | 현행 계약→시각 이식 · P2 | 원 제품 B1 상단 탭 복제 아님 |
| `F-SH-05` | 상단 기능 | `전역` | `app-shell.tsx` | 현행 계약→시각 이식 · P2 | 상단/더보기/계정 도구에 재배치 |
| `F-SH-06` | 프로필 요약 | `전역` | `app-shell.tsx` | 현행 계약→시각 이식 · P2 | R 실제 계정 정보 미연결 |
| `F-SH-07` | 모바일 헤더 | `전역` | `app-shell.tsx` | 현행 계약→시각 이식 · P2 | 일부 유틸은 더보기 재배치 |
| `F-SH-08` | 모바일 주 메뉴 | `전역` | `app-shell.tsx` | 현행 계약→시각 이식 · P2 | 없음 |
| `F-SH-09` | 모바일 더보기 | `전역` | `app-shell.tsx` | 현행 계약→시각 이식 · P2 | 없음 |
| `F-SH-10` | 빠른 추가 진입 | `전역` | `quick-add.tsx` | 현행 계약→시각 이식 · P2 | 없음 |
| `F-SH-11` | 빠른 아이디어 | `전역` | `quick-add.tsx` | 현행 계약→시각 이식 · P2 | 현재 곡 문맥 표시는 합성; R 오프라인 서버 전환 없음 |
| `F-SH-12` | 빠른 추가 오류 | `전역` | `quick-add.tsx` | 현행 계약→시각 이식 · P2 | R 실제 자동 생성 중복·실패 재시도 미연결 |
| `F-SH-13` | 세션 만료 | `전역` | `app-shell.tsx` | 현행 계약→시각 이식 · P2 | 실제 세션·재인증 없음 |
| `F-SH-14` | 로그아웃 차단 | `전역` | `app-shell.tsx` | 현행 계약→시각 이식 · P2 | 실제 계정 세션 종료 없음 |
| `F-SH-15` | PWA | `전역` | `pwa-manager.tsx` | 현행 계약→시각 이식 · P2 | 실제 설치·서비스워커·업데이트 없음 |
| `F-SH-16` | 공통 접근성 | `전역` | `app-shell.tsx` | 현행 계약→시각 이식 · P2 | 정식 접근성/스크린리더 전체 감사 아님 |
| `F-SH-17` | 공통 복사 | `전역` | `copy-feedback.tsx` | 현행 계약→시각 이식 · P2 | 운영체제 클립보드 성공은 브라우저 권한에 의존 |
| `F-SH-18` | 단축키 도움말 | `전역` | `shortcut-help.tsx` | 현행 계약→시각 이식 · P2 | 무결과 전용 문구·OS별 자동 표기 미구현 |
| `F-AU-01` | 로그인 `/auth` | `/auth` | `auth-screen.tsx` | 현행 계약→시각 이식 · P3 | 실제 OAuth 없음 |
| `F-AU-02` | 초대 가입 | `/auth` | `auth-screen.tsx` | 현행 계약→시각 이식 · P3 | 코드 사용·계정 생성 없음 |
| `F-AU-03` | 인증 오류 | `/auth` | `auth-screen.tsx` | 현행 계약→시각 이식 · P3 | 실제 인증 오류 재현 아님 |
| `F-AU-04` | 약관·개인정보 | `/terms·/privacy` | `legal-page.tsx` | 현행 계약→시각 이식 · P3 | 정식 법적 문서가 아닌 합성 설명 |
| `F-HO-01` | 홈 | `/workspace` | `app-shell.tsx` | 현행 계약→시각 이식 · P2 | 이어쓰기는 개선 제안 |
| `F-HO-02` | 제안 홈 | `/workspace` | `app-shell.tsx` | 코발트 홈 제안 · P2 | 홈 전용 조회 실패/첫 이용 분기는 계약 탐색기로 설명 |
| `F-CR-01` | 새 곡/곡 수정 | `/songs/new·/songs/[id]/edit` | `song-form.tsx` | 현행 계약→시각 이식 · P3 | 실제 서버 저장 없음 |
| `F-CR-02` | 곡 폼 상태 | `/songs/new·/songs/[id]/edit` | `song-form.tsx` | 현행 계약→시각 이식 · P3 | busy 중복·세션·서버 실패는 계약 설명 |
| `F-CR-03` | 새 가사 | `/lyrics/new` | `lyric-new-screen.tsx` | 현행 계약→시각 이식 · P3 | 부모 검색 입력은 별도 제공하지 않음 |
| `F-CR-04` | 새 가사 예외 | `/lyrics/new` | `lyric-new-screen.tsx` | 현행 계약→시각 이식 · P3 | 삭제·권한·템플릿 만료는 계약 설명 |
| `F-CR-05` | 새 라임 | `/rhymes/new` | `rhyme-new-screen.tsx` | 현행 계약→시각 이식 · P3 | 현행 자동 생성 대신 명시 버튼 개선안임을 표기 |
| `F-CR-06` | 새 라임 취소/실패 | `/rhymes/new` | `rhyme-new-screen.tsx` | 현행 계약→시각 이식 · P3 | 준비 실패·결과 미확인·동일 요청 재시도는 계약 설명 |
| `F-CR-07` | 새 프롬프트 | `/prompts/new` | `prompt-new-screen.tsx` | 현행 계약→시각 이식 · P3 | 현행 자동 생성은 계약 안내; 명시 버튼 개선안 |
| `F-CR-08` | 새 프롬프트 보호 | `/prompts/new` | `prompt-new-screen.tsx` | 현행 계약→시각 이식 · P3 | IME/생성 잠금/서버 경합 수명주기 미구현 |
| `F-SO-01` | 내 곡 제목/새 곡 | `/songs` | `song-list-screen.tsx` | 현행 계약→시각 이식 · P2 | 없음 |
| `F-SO-02` | 곡 검색 | `/songs` | `song-list-screen.tsx` | 현행 계약→시각 이식 · P2 | 없음 |
| `F-SO-03` | 상태 필터 | `/songs` | `song-list-screen.tsx` | 현행 계약→시각 이식 · P2 | 없음 |
| `F-SO-04` | 작업 필터 | `/songs` | `song-list-screen.tsx` | 현행 계약→시각 이식 · P2 | 없음 |
| `F-SO-05` | 정렬 | `/songs` | `song-list-screen.tsx` | 현행 계약→시각 이식 · P2 | 합성 날짜를 사용해 최근 생성/수정/사용 구분 없음 |
| `F-SO-06` | 보기 4종 | `/songs` | `song-list-screen.tsx` | 현행 계약→시각 이식 · P2 | 없음 |
| `F-SO-07` | 곡 카드/행 | `/songs` | `song-list-screen.tsx` | 현행 계약→시각 이식 · P2 | 수정 시각은 합성 |
| `F-SO-08` | 사용자 정렬 | `/songs` | `song-list-screen.tsx` | 현행 계약→시각 이식 · P2 | 드래그·맨앞/맨뒤·경계 비활성·실패 재시도는 계약 설명 |
| `F-SO-09` | 목록 상태 | `/songs` | `song-list-screen.tsx` | 현행 계약→시각 이식 · P2 | 실제 페이지 요청·더보기 없음 |
| `F-SD-01` | 대시보드 헤더 | `/songs/[id]` | `song-dashboard.tsx` | 현행 계약→시각 이식 · P2 | 수정 시각 합성 |
| `F-SD-02` | 자료 요약 | `/songs/[id]` | `song-dashboard.tsx` | 현행 계약→시각 이식 · P2 | 독립 새로고침/부분 조회 실패는 계약 설명 |
| `F-SD-03` | 가사 버전 목록 | `/songs/[id]` | `song-dashboard.tsx` | 현행 계약→시각 이식 · P2 | 시각 합성 |
| `F-SD-04` | 가사 카드 액션 | `/songs/[id]` | `song-dashboard.tsx` | 현행 계약→시각 이식 · P2 | 카드내 모든 액션 대신 편집기 경유 |
| `F-SD-05` | 작업 메모 | `/songs/[id]` | `song-dashboard.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-SD-06` | 연결 자료 2탭 | `/songs/[id]` | `song-link-manager.tsx` | 현행 계약→시각 이식 · P3 | 독립 새로고침/오류·라이브러리 바로가기는 계약 설명 |
| `F-SD-07` | 연결 관리 | `/songs/[id]` | `song-link-manager.tsx` | 현행 계약→시각 이식 · P3 | 연결/미연결 필터·별도 해제 확인 추가 필요 |
| `F-SD-08` | 곡 관리 | `/songs/[id]` | `song-dashboard.tsx` | 현행 계약→시각 이식 · P3 | 실제 삭제 없음 |
| `F-SD-09` | 부분 실패 | `/songs/[id]` | `song-dashboard.tsx` | 현행 계약→시각 이식 · P3 | 실제 비동기 부분 실패 미구현 |
| `F-SU-01` | 사용 모델 | `/songs/[id]` | `suno-workspace-panel.tsx` | 현행 계약→시각 이식 · P3 | 시연 데이터의 모델 선택지; 최신 Suno 사양 주장 아님 |
| `F-SU-02` | 링크 목록 | `/songs/[id]` | `suno-workspace-panel.tsx` | 현행 계약→시각 이식 · P3 | 합성 URL은 외부 열기 대신 설명; 실제 링크 상한 enforce 없음 |
| `F-SU-03` | 링크 추가/수정 | `/songs/[id]` | `suno-workspace-panel.tsx` | 현행 계약→시각 이식 · P3 | 자수 상한·서버 실패는 계약 설명 |
| `F-SU-04` | 링크 순서 | `/songs/[id]` | `suno-workspace-panel.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-SU-05` | 링크 제거 | `/songs/[id]` | `suno-workspace-panel.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-SU-06` | 빈/오류 | `/songs/[id]` | `suno-workspace-panel.tsx` | 현행 계약→시각 이식 · P3 | 서버 조회 실패·초안 재시도는 계약 설명 |
| `F-SU-07` | 범위 안내 | `/songs/[id]` | `suno-workspace-panel.tsx` | 현행 계약→시각 이식 · P3 | 실제 Suno API 호출 없음 |
| `F-LY-01` | 문맥·가사 이동 | `/lyrics/[id]` | `lyric-editor.tsx` | 현행 계약→시각 이식 · P3 | 경계는 숨김; disabled 제안 미적용 |
| `F-LY-02` | 제목 | `/lyrics/[id]` | `lyric-editor.tsx` | 현행 계약→시각 이식 · P3 | 빈 제목 안내·CodeMirror IME 검증 없음 |
| `F-LY-03` | 본문 | `/lyrics/[id]` | `lyric-editor.tsx` | 현행 계약→시각 이식 · P3 | 전체 제품 길이 상한·CodeMirror 미구현 |
| `F-LY-04` | 저장 스트립 | `/lyrics/[id]` | `lyric-editor.tsx` | 현행 계약→시각 이식 · P3 | 서버 저장·검색 투영 상태를 실제로 만들지 않음 |
| `F-LY-05` | 저장 실패 | `/lyrics/[id]` | `lyric-editor.tsx` | 현행 계약→시각 이식 · P3 | 실제 서버 권한/초안 비교 없음 |
| `F-LY-06` | 집중 모드 | `/lyrics/[id]` | `lyric-editor.tsx` | 현행 계약→시각 이식 · P3 | 일반 rerender를 넘는 편집 undo history 보존 보장 없음 |
| `F-LY-07` | 자료 패널 | `/lyrics/[id]` | `lyric-editor.tsx` | 현행 계약→시각 이식 · P3 | 모바일 모달 sheet 대신 본문 아래 모듈 재배치 |
| `F-LY-08` | 주요 액션 | `/lyrics/[id]` | `lyric-editor.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-LY-09` | 송폼 목차 | `/lyrics/[id]` | `lyric-editor.tsx` | 현행 계약→시각 이식 · P3 | 현재 구간 추적·suffix 시각 저강조 미구현 |
| `F-LY-10` | 송폼 선택 복사 | `/lyrics/[id]` | `lyric-editor.tsx` | 현행 계약→시각 이식 · P3 | 선택 수 별도 라벨·일괄 선택 해제 버튼 없음 |
| `F-LY-11` | 송폼 삽입 | `/lyrics/[id]` | `lyric-editor.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-LY-12` | Extend 계약 | `/lyrics/[id]` | `lyric-editor.tsx` | 현행 계약→시각 이식 · P3 | 합성 fixture 검증 |
| `F-LY-13` | 복사 길이 | `/lyrics/[id]` | `lyric-editor.tsx` | 현행 계약→시각 이식 · P3 | 3,000자 권장 경고 표시 미구현; 계약 탐색에 명시 |
| `F-LY-14` | 가사 설정 | `/lyrics/[id]` | `lyric-display-settings.tsx` | 현행 계약→시각 이식 · P3 | 표시 우선순위 summary는 설정 화면에서 설명 |
| `F-LY-15` | 표시 설정 | `/lyrics/[id]` | `lyric-display-settings.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-LY-16` | 표시 저장 범위 | `/lyrics/[id]` | `lyric-display-settings.tsx` | 현행 계약→시각 이식 · P3 | 충돌/실패 실제 재저장 없음 |
| `F-LY-17` | 모바일 도구 | `/lyrics/[id]` | `lyric-editor.tsx` | 현행 계약→시각 이식 · P3 | 더보기/인라인 재배치 |
| `F-LY-18` | 복제/삭제 | `/lyrics/[id]` | `lyric-editor.tsx` | 현행 계약→시각 이식 · P3 | 서버 저장 대기/실패 보존 미연결 |
| `F-RP-01` | 다른 곡 | `/lyrics/[id]` | `lyric-resource-panel.tsx` | 현행 계약→시각 이식 · P3 | 수정 시각 합성 |
| `F-RP-02` | 다른 가사 | `/lyrics/[id]` | `lyric-resource-panel.tsx` | 현행 계약→시각 이식 · P3 | 현재 가사 버튼 disabled 미적용 |
| `F-RP-03` | 라임 | `/lyrics/[id]` | `lyric-resource-panel.tsx` | 현행 계약→시각 이식 · P3 | 시각 합성 |
| `F-RP-04` | 프롬프트 | `/lyrics/[id]` | `lyric-resource-panel.tsx` | 현행 계약→시각 이식 · P3 | 가사 자동 삽입 버튼 없음 |
| `F-RP-05` | 검색 | `/lyrics/[id]` | `lyric-resource-panel.tsx` | 현행 계약→시각 이식 · P3 | 검색 clear·화살표 tab nav·비동기 retry 추가 필요 |
| `F-RP-06` | 빈/삭제 상태 | `/lyrics/[id]` | `lyric-resource-panel.tsx` | 현행 계약→시각 이식 · P3 | 삭제 항목 비활성 상태는 계약 설명 |
| `F-RP-07` | 현재 가사 설정 | `/lyrics/[id]` | `lyric-resource-panel.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-RP-08` | 라임 선택 삽입 | `/lyrics/[id]` | `lyric-resource-panel.tsx` | 현행 계약→시각 이식 · P3 | 위치 확인 실패 상태는 계약 설명 |
| `F-RH-01` | 목록 진입 | `/rhymes` | `rhyme-list-screen.tsx` | 현행 계약→시각 이식 · P2 | 없음 |
| `F-RH-02` | 필터 | `/rhymes` | `rhyme-list-screen.tsx` | 현행 계약→시각 이식 · P2 | 없음 |
| `F-RH-03` | 정렬·보기 | `/rhymes` | `rhyme-list-screen.tsx` | 현행 계약→시각 이식 · P2 | 최근 날짜 구분·완전한 사용자 정렬 제한 |
| `F-RH-04` | 카드 | `/rhymes` | `rhyme-list-screen.tsx` | 현행 계약→시각 이식 · P2 | 시각/색상 옵션 합성 |
| `F-RH-05` | 카드 순서 | `/rhymes` | `rhyme-list-screen.tsx` | 현행 계약→시각 이식 · P2 | 드래그·양끝 버튼·실패는 계약 설명 |
| `F-RH-06` | 목록 상태 | `/rhymes` | `rhyme-list-screen.tsx` | 현행 계약→시각 이식 · P2 | 실제 pagination 없음 |
| `F-RH-07` | 편집 헤더 | `/rhymes/[id]` | `rhyme-editor.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-RH-08` | 제목·본문 | `/rhymes/[id]` | `rhyme-editor.tsx` | 현행 계약→시각 이식 · P3 | 빈 제목 검증/서버 자동 저장 미구현 |
| `F-RH-09` | 태그 관리 | `/rhymes/[id]` | `rhyme-editor.tsx` | 현행 계약→시각 이식 · P3 | 편집 태그 클릭→목록 필터 바로가기는 없음 |
| `F-RH-10` | 곡 연결 | `/rhymes/[id]` | `rhyme-editor.tsx` | 현행 계약→시각 이식 · P3 | 실제 loading/failure 없음 |
| `F-RH-11` | 표시 설정 | `/rhymes/[id]` | `rhyme-editor.tsx` | 현행 계약→시각 이식 · P3 | 색상을 카드 모든 표면에 반영하는 마감 미완료 |
| `F-RH-12` | 독립 삽입 한계 | `/rhymes/[id]` | `rhyme-editor.tsx` | 현행 계약→시각 이식 · P3 | 현행 독립 삽입 비활성 계약을 명시 대상 선택 제안으로 확장; 부분 삽입은 자료 패널 |
| `F-RH-13` | 모바일 | `/rhymes/[id]` | `rhyme-editor.tsx` | 현행 계약→시각 이식 · P3 | 4도구 시트 대신 인라인 모듈 재배치 |
| `F-RH-14` | 저장·복구 | `/rhymes/[id]` | `rhyme-editor.tsx` | 현행 계약→시각 이식 · P3 | 서버 동기화·기기 간 적용 없음 |
| `F-RH-15` | 삭제 | `/rhymes/[id]` | `rhyme-editor.tsx` | 현행 계약→시각 이식 · P3 | 실제 서버 실패 후 입력 유지 흐름 미연결 |
| `F-PR-01` | 목록 진입 | `/prompts` | `prompt-list-screen.tsx` | 현행 계약→시각 이식 · P2 | 없음 |
| `F-PR-02` | 검색·필터 | `/prompts` | `prompt-list-screen.tsx` | 현행 계약→시각 이식 · P2 | 최근 사용 chip은 합성 사용 예시 |
| `F-PR-03` | 정렬 | `/prompts` | `prompt-list-screen.tsx` | 현행 계약→시각 이식 · P2 | 합성 시각·빈도 정렬은 실데이터 없음 |
| `F-PR-04` | 보기/순서 | `/prompts` | `prompt-list-screen.tsx` | 현행 계약→시각 이식 · P2 | 목록 drag·원복·재시도 계약 설명; 태그 drag는 구현 |
| `F-PR-05` | 카드 | `/prompts` | `prompt-list-screen.tsx` | 현행 계약→시각 이식 · P2 | 사용 횟수·시각 합성 |
| `F-PR-06` | 카드 액션 | `/prompts` | `prompt-list-screen.tsx` | 현행 계약→시각 이식 · P2 | 길게 누르기 미구현 |
| `F-PR-07` | 목록 상태 | `/prompts` | `prompt-list-screen.tsx` | 현행 계약→시각 이식 · P2 | pagination 없음 |
| `F-PR-08` | 편집 헤더 | `/prompts/[id]` | `prompt-editor.tsx` | 현행 계약→시각 이식 · P3 | 핀/즐겨찾기는 우측 모듈 재배치 |
| `F-PR-09` | 제목 | `/prompts/[id]` | `prompt-editor.tsx` | 현행 계약→시각 이식 · P3 | 빈 제목 안내·제목 자수 표시 미구현 |
| `F-PR-10` | 형식 선택 | `/prompts/[id]` | `prompt-editor.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-PR-11` | 태그 작성 | `/prompts/[id]` | `prompt-editor.tsx` | 현행 계약→시각 이식 · P3 | suggestion 사용 횟수는 합성 |
| `F-PR-12` | 태그 배열 | `/prompts/[id]` | `prompt-editor.tsx` | 현행 계약→시각 이식 · P3 | 현재 선택 index 별도 설명 없음 |
| `F-PR-13` | 중복 | `/prompts/[id]` | `prompt-editor.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-PR-14` | 문장 작성 | `/prompts/[id]` | `prompt-editor.tsx` | 현행 계약→시각 이식 · P3 | 마침표 display span·제품 상한 미구현 |
| `F-PR-15` | 복사될 내용 | `/prompts/[id]` | `prompt-editor.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-PR-16` | 구조 변환 | `/prompts/[id]` | `prompt-editor.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-PR-17` | 연결 곡 | `/prompts/[id]` | `prompt-editor.tsx` | 현행 계약→시각 이식 · P3 | 해제 별도 재확인/오류는 계약 설명 |
| `F-PR-18` | 템플릿 불러오기 | `/prompts/[id]` | `prompt-editor.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-PR-19` | 템플릿 적용 상태 | `/prompts/[id]` | `prompt-editor.tsx` | 현행 계약→시각 이식 · P3 | 비동기 loading/failure·상한·checkpoint 실패는 계약 설명 |
| `F-PR-20` | 삭제 | `/prompts/[id]` | `prompt-editor.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-PR-21` | 저장·복구 | `/prompts/[id]` | `prompt-editor.tsx` | 현행 계약→시각 이식 · P3 | 실제 서버 동기화 없음 |
| `F-HI-01` | 가사 | `/lyrics/[id]·/rhymes/[id]·/prompts/[id]` | `lyric-history.tsx` | 현행 계약→시각 이식 · P3 | 실제 서버 기록 시각·목록 fetch 없음 |
| `F-HI-02` | 가사 비교 | `/lyrics/[id]·/rhymes/[id]·/prompts/[id]` | `lyric-history.tsx` | 현행 계약→시각 이식 · P3 | 줄별 추가/삭제 diff·mobile pane 전환 미구현 |
| `F-HI-03` | 가사 복원 | `/lyrics/[id]·/rhymes/[id]·/prompts/[id]` | `lyric-history.tsx` | 현행 계약→시각 이식 · P3 | 다른 기기/stale 재확인 없음 |
| `F-HI-04` | 라임 | `/lyrics/[id]·/rhymes/[id]·/prompts/[id]` | `rhyme-history.tsx` | 현행 계약→시각 이식 · P3 | 모바일 pane 전환 미구현 |
| `F-HI-05` | 프롬프트 | `/lyrics/[id]·/rhymes/[id]·/prompts/[id]` | `prompt-history.tsx` | 현행 계약→시각 이식 · P3 | 기기 내 합성 이력 |
| `F-HI-06` | 공통 상태 | `/lyrics/[id]·/rhymes/[id]·/prompts/[id]` | `prompt-history.tsx` | 현행 계약→시각 이식 · P3 | 세부 상태별 실제 화면 대신 계약 탐색 |
| `F-HI-07` | 복구 의미 | `/lyrics/[id]·/rhymes/[id]·/prompts/[id]` | `prompt-history.tsx` | 현행 계약→시각 이식 · P3 | 다른 기기 복구 없음 |
| `F-TE-01` | 유형 탭 | `/templates` | `template-screen.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-TE-02` | 출처 | `/templates` | `template-screen.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-TE-03` | 정렬 | `/templates` | `template-screen.tsx` | 현행 계약→시각 이식 · P3 | 최근 사용/수정은 합성 |
| `F-TE-04` | 목록 | `/templates` | `template-screen.tsx` | 현행 계약→시각 이식 · P3 | 별도 선택 master-detail 대신 카드 |
| `F-TE-05` | preview | `/templates` | `template-screen.tsx` | 현행 계약→시각 이식 · P3 | 최근 사용 시각 미표시 |
| `F-TE-06` | 주 행동 | `/templates` | `template-screen.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-TE-07` | 사용자 템플릿 | `/templates` | `template-screen.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-TE-08` | 입력 보호 | `/templates` | `template-screen.tsx` | 현행 계약→시각 이식 · P3 | 실제 서버 실패 미연결 |
| `F-TE-09` | 결과 상태 | `/templates` | `template-screen.tsx` | 현행 계약→시각 이식 · P3 | loading/failure·복제 후 선택 상태는 계약 설명 |
| `F-TE-10` | 두 적용 경로 | `/templates` | `template-screen.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-SE-01` | 검색 입력 | `/search` | `search-screen.tsx` | 현행 계약→시각 이식 · P2 | 정확/부분 구별 옵션 없음 |
| `F-SE-02` | 유형 | `/search` | `search-screen.tsx` | 현행 계약→시각 이식 · P2 | 없음 |
| `F-SE-03` | 검색 시작 | `/search` | `search-screen.tsx` | 현행 계약→시각 이식 · P2 | 신규 검색 자동 이력 수집·시각 없음 |
| `F-SE-04` | 결과 | `/search` | `search-screen.tsx` | 현행 계약→시각 이식 · P2 | 실제 일치 필드/수정 시각은 합성 |
| `F-SE-05` | 결과 행동 | `/search` | `search-screen.tsx` | 현행 계약→시각 이식 · P2 | 검색 조건/scroll 유지·결과 화살표 탐색 미구현 |
| `F-SE-06` | 상태 | `/search` | `search-screen.tsx` | 현행 계약→시각 이식 · P2 | 검색중/다음 page 실패는 계약 탐색 |
| `F-RE-01` | 최근 작업 | `/recent` | `recent-work-screen.tsx` | 현행 계약→시각 이식 · P2 | 실제 시간/활동 수집 없음 |
| `F-RE-02` | 최근 카드 | `/recent` | `recent-work-screen.tsx` | 현행 계약→시각 이식 · P2 | 카드별 열람/수정/위치 실제 데이터 없음 |
| `F-RE-03` | 이어쓰기 | `/recent` | `recent-work-screen.tsx` | 현행 계약→시각 이식 · P2 | 최근 전용 빈/실패는 계약 탐색 |
| `F-FA-01` | 범위 | `/favorites` | `favorites-screen.tsx` | 현행 계약→시각 이식 · P2 | 없음 |
| `F-FA-02` | 필터 | `/favorites` | `favorites-screen.tsx` | 현행 계약→시각 이식 · P2 | 즐겨찾기 실제 복합 필터 미구현 |
| `F-FA-03` | 핀 섹션 | `/favorites` | `favorites-screen.tsx` | 현행 계약→시각 이식 · P2 | 핀 전용 순서 drag/버튼 미구현 |
| `F-FA-04` | 즐겨찾기 섹션 | `/favorites` | `favorites-screen.tsx` | 현행 계약→시각 이식 · P2 | 최근 사용 합성 |
| `F-FA-05` | 카드 | `/favorites` | `favorites-screen.tsx` | 현행 계약→시각 이식 · P2 | 시각 합성 |
| `F-FA-06` | 상태 | `/favorites` | `favorites-screen.tsx` | 현행 계약→시각 이식 · P2 | 부분 조회/저장 실패는 공통 시연 계약 |
| `F-TR-01` | 휴지통 목록 | `/trash` | `trash-screen.tsx` | 현행 계약→시각 이식 · P3 | 선택 수 별도 문구 없음 |
| `F-TR-02` | 행/모바일 카드 | `/trash` | `trash-screen.tsx` | 현행 계약→시각 이식 · P3 | 정확한 예정일은 계약 탐색; 샘플 시각 |
| `F-TR-03` | 개별/일괄 작업 | `/trash` | `trash-screen.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-TR-04` | 복원 확인 | `/trash` | `trash-screen.tsx` | 현행 계약→시각 이식 · P3 | 실제 DB 충돌 없음 |
| `F-TR-05` | 완전 삭제 확인 | `/trash` | `trash-screen.tsx` | 현행 계약→시각 이식 · P3 | 실제 계정 삭제 없음 |
| `F-TR-06` | 상태 | `/trash` | `trash-screen.tsx` | 현행 계약→시각 이식 · P3 | 서버 atomicity·충돌/부분 실패는 계약 탐색 |
| `F-AC-01` | 내보내기 | `/settings` | `settings-screen.tsx` | 현행 계약→시각 이식 · P3 | 실제 전체 서버 ZIP 아님 |
| `F-AC-02` | 탈퇴 검토 | `/account/withdrawal` | `withdrawal-screen.tsx` | 현행 계약→시각 이식 · P3 | 실제 세션/데이터 차단 없음 |
| `F-AC-03` | 재인증 | `/account/withdrawal` | `withdrawal-screen.tsx` | 현행 계약→시각 이식 · P3 | Google OAuth 미연결 |
| `F-AC-04` | 탈퇴 확인 | `/account/withdrawal` | `withdrawal-screen.tsx` | 현행 계약→시각 이식 · P3 | 실제 탈퇴 없음 |
| `F-AC-05` | 탈퇴 예약 | `/account/withdrawal` | `withdrawal-screen.tsx` | 현행 계약→시각 이식 · P3 | 고정 합성 날짜, 실제 access revoke 없음 |
| `F-AC-06` | 안전한 목업 | `/account/withdrawal` | `withdrawal-screen.tsx` | 시연 안전장치·제품 기능 아님 · P3 | 합성 기기 자료만 변경 |
| `F-ST-01` | 설정 섹션 | `/settings` | `settings-screen.tsx` | 현행 계약→시각 이식 · P3 | 섹션 고정 탭 대신 모듈 |
| `F-ST-02` | 테마 | `/settings` | `settings-screen.tsx` | 현행 계약→시각 이식 · P3 | 기기 내 저장만 |
| `F-ST-03` | 작성 기본값 | `/settings` | `settings-screen.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-ST-04` | 미리보기 | `/settings` | `settings-screen.tsx` | 현행 계약→시각 이식 · P3 | 원문 변경 없음 |
| `F-ST-05` | 설정 저장 | `/settings` | `settings-screen.tsx` | 현행 계약→시각 이식 · P3 | busy/서버 실패/다른 기기 충돌은 시연 계약 |
| `F-ST-06` | 모바일 설정 | `/settings` | `settings-screen.tsx` | 현행 계약→시각 이식 · P3 | 계정 설정 전용 모바일 sheet 대신 inline |
| `F-ST-07` | 가사별 우선순위 | `/settings` | `settings-screen.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-PF-01` | 프로필 | `/settings` | `profile-settings.tsx` | 현행 계약→시각 이식 · P3 | 이메일은 example.invalid 합성 |
| `F-PF-02` | 사진 비교 | `/settings` | `profile-settings.tsx` | 현행 계약→시각 이식 · P3 | 서버 파일 fallback 오류 처리 미구현 |
| `F-PF-03` | 사진 선택 | `/settings` | `profile-settings.tsx` | 현행 계약→시각 이식 · P3 | 서버 decode/재인코드/EXIF 제거 없음 |
| `F-PF-04` | 사진 기본 복귀 | `/settings` | `profile-settings.tsx` | 현행 계약→시각 이식 · P3 | 기본 사진은 합성 이니셜 |
| `F-PF-05` | 이름 | `/settings` | `profile-settings.tsx` | 현행 계약→시각 이식 · P3 | Google source toggle 상세 상태는 제한 |
| `F-PF-06` | Google 이름 복귀 | `/settings` | `profile-settings.tsx` | 현행 계약→시각 이식 · P3 | 실제 Google 이름 변경 아님 |
| `F-PF-07` | 프로필 저장 | `/settings` | `profile-settings.tsx` | 현행 계약→시각 이식 · P3 | busy 업로드/실제 서버 저장 없음 |
| `F-PF-08` | 충돌/만료 | `/settings` | `profile-settings.tsx` | 현행 계약→시각 이식 · P3 | 실제 cross-tab 충돌/서버 최신 재시도 없음 |
| `F-PF-09` | 개인정보 | `/settings` | `profile-settings.tsx` | 현행 계약→시각 이식 · P3 | 없음 |
| `F-PF-10` | 저장 범위 | `/settings` | `profile-settings.tsx` | 현행 계약→시각 이식 · P3 | 검증 완료 |
| `F-PF-11` | 이동 보호 | `/settings` | `profile-settings.tsx` | 현행 계약→시각 이식 · P3 | 브라우저 실제 이탈 confirm은 UA 정책에 의존 |
| `F-SHARE-01` | 공유 진입 | `/lyrics/[id]` | `lyric-share-manager.tsx` | 현행 계약→시각 이식 · P3 | 상태 모두 합성 |
| `F-SHARE-02` | 공유 preview | `/lyrics/[id]` | `lyric-share-manager.tsx` | 현행 계약→시각 이식 · P3 | 역할별 viewer로 preview |
| `F-SHARE-03` | 내 공유 코드 | `/lyrics/[id]` | `lyric-share-manager.tsx` | 현행 계약→시각 이식 · P3 | 실제 사용자 코드 없음 |
| `F-SHARE-04` | 계정 허용 | `/lyrics/[id]` | `lyric-share-manager.tsx` | 현행 계약→시각 이식 · P3 | 실제 허용 아님 |
| `F-SHARE-05` | 허용 계정 목록 | `/lyrics/[id]` | `lyric-share-manager.tsx` | 현행 계약→시각 이식 · P3 | 계정 공유 링크 복사 별도 버튼 미구현 |
| `F-SHARE-06` | 공개 링크 발행 | `/lyrics/[id]` | `lyric-share-manager.tsx` | 현행 계약→시각 이식 · P3 | 필드/기간은 state 보관, 실제 공개 없음 |
| `F-SHARE-07` | 일회성 URL | `/lyrics/[id]` | `lyric-share-manager.tsx` | 현행 계약→시각 이식 · P3 | example.invalid 합성 URL |
| `F-SHARE-08` | 링크 관리 | `/lyrics/[id]` | `lyric-share-manager.tsx` | 현행 계약→시각 이식 · P3 | 활성 관리의 모든 공개 필드 상세 표시는 제한 |
| `F-SHARE-09` | 공개 쓰기 | `/lyrics/[id]` | `lyric-share-manager.tsx` | 현행 계약→시각 이식 · P3 | 실제 익명 쓰기 세션 없음 |
| `F-SHARE-10` | 게스트 중지 | `/lyrics/[id]` | `lyric-share-manager.tsx` | 현행 계약→시각 이식 · P3 | 서버 중지 실패 상태 미구현 |
| `F-SHARE-11` | 참여자 | `/lyrics/[id]` | `lyric-share-manager.tsx` | 현행 계약→시각 이식 · P3 | presence·활동·cursor 실제 연동 없음 |
| `F-SHARE-12` | 공유 뷰어 | `/shared/lyrics/[id]` | `shared-lyric-viewer.tsx` | 현행 계약→시각 이식 · P3 | 선택 공개필드 viewer 세부 렌더링은 제한 |
| `F-SHARE-13` | 초기 준비 | `/shared/lyrics/[id]` | `shared-lyric-viewer.tsx` | 현행 계약→시각 이식 · P3 | 실제 준비 상태 fetch/입력 gate 미구현 |
| `F-SHARE-14` | 권한 종료 | `/shared/lyrics/[id]` | `shared-lyric-viewer.tsx` | 현행 계약→시각 이식 · P3 | 종료 사유 세분화 노출 없음 |
| `F-SHARE-15` | 복구함 | `/shared/lyrics/[id]` | `shared-lyric-viewer.tsx` | 현행 계약→시각 이식 · P3 | 원가사 fallback 없음; 기기 합성만 |
| `F-SHARE-16` | 게스트 뷰어 | `/shared/public` | `public-shared-lyric-viewer.tsx` | 현행 계약→시각 이식 · P3 | 실제 비로그인 write token 없음 |
| `F-SHARE-17` | 게스트 탭 한계 | `/shared/public` | `public-shared-lyric-viewer.tsx` | 현행 계약→시각 이식 · P3 | localStorage 합성 복구는 실제 게스트 탭 토큰 수명 아님 |
| `F-SHARE-18` | 저장 상태 | `/shared/public` | `public-shared-lyric-viewer.tsx` | 현행 계약→시각 이식 · P3 | 서버 연결·동기화 실제 없음 |
| `F-X-01` | 목록 | `전역 상태` | `song-list-screen.tsx` | 시연 시험상태·실제 API/DB로 검증 · P4 | 더보기 실패는 계약 탐색 |
| `F-X-02` | 편집 | `전역 상태` | `lyric-editor.tsx` | 시연 시험상태·실제 API/DB로 검증 · P4 | IME lifecycle·실제 서버 완료/영속 실패 미구현 |
| `F-X-03` | 원격 변경 | `전역 상태` | `lyric-editor.tsx` | 시연 시험상태·실제 API/DB로 검증 · P4 | 실제 remote update 없음 |
| `F-X-04` | 권한 | `전역 상태` | `shared-lyric-viewer.tsx` | 시연 시험상태·실제 API/DB로 검증 · P4 | 실제 권한 보안 검증 아님 |
| `F-X-05` | 실패 복구 | `전역 상태` | `app-shell.tsx` | 시연 시험상태·실제 API/DB로 검증 · P4 | 실제 서버 retry 없음 |
| `F-X-06` | 시스템 페이지 | `전역 상태` | `state-panel.tsx` | 시연 시험상태·실제 API/DB로 검증 · P4 | 모의 화면 |
| `F-X-07` | 접근성 | `전역 상태` | `app-shell.tsx` | 시연 시험상태·실제 API/DB로 검증 · P4 | 정식 접근성 audit 미수행 |
| `F-X-08` | 반응형 | `전역 상태` | `app-shell.tsx` | 시연 시험상태·실제 API/DB로 검증 · P4 | 모바일 실제 IME/virtual keyboard 기기 시험 없음 |

P1은 이 표의 ID 중복·누락과 현행 route/컴포넌트를 검사하고 전환 계약을 고정한다. P2는 셸·홈·목록/탐색, P3는 편집·설정·공유·복구의 구현/시험을 담당한다. P4는 각 행의 상태·접근성·반응형·실제 권한/복구 회귀를 판정한다. 물리 기기/OS IME/AT는 사용자 지시로 미실행/후속 보류이며 대리 브라우저 결과로 PASS 처리하지 않는다.
