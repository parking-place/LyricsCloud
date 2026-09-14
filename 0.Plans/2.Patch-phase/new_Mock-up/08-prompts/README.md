# 08-prompts — 프롬프트

## 목적과 정보

- 핵심 정보/동작: 태그형/문장형, 세 크기 grid, 새 프롬프트
- 적용 상태: 정상 · 로딩 · 빈 상태 · 오류 · 오프라인
- 안전 기준: 표시 형식과 원문 복사 계약을 분리한다.

## 화면 확인

- [라이트 PC](mockup.html?theme=light&platform=windows)
- [다크 PC](mockup.html?theme=dark&platform=windows)
- [iOS](mockup.html?theme=light&platform=ios)
- [Android](mockup.html?theme=dark&platform=android)
- [대표 오류/복구 상태](mockup.html?theme=dark&platform=windows&state=error)

이 파일은 서버에 연결하지 않는 정적 동작 프로토타입이다. 표시되는 창작물·계정은 합성 fixture이며 저장, 권한 변경, OAuth, 사전 조회를 수행하지 않는다.

## 플랫폼·접근성

PC는 Windows 제목 문맥, macOS 창 표시, Linux Wayland/X11 문맥을 구분한다. iOS는 safe-area와 둥근 상단 문맥, Android는 control 형태와 back/navigation 문맥을 적용한다. 모든 핵심 동작은 보이는 버튼과 keyboard focus로 접근하며 상태는 색상만이 아니라 문장으로 전달한다. 실제 OS IME·screen reader·물리 기기 인수는 P4에서 별도 기록한다.

