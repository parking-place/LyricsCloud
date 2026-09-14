# Windows native contract fixtures

이 경로는 Windows 앱 구현물이 아니라, 승인 전 기술 실험과 이후 Windows runner가 함께 소비할 합성 fixture를 보관한다.

`fixtures/1.1.8-read-copy-yjs-v1.json`은 1.1.7 release 기록 source에서 다음 계약을 고정한다.

- UTF-8 가사 원문과 LF 정규화
- 문장형·송폼 선택·정확한 `[Extend]` 행·3,000 Unicode code point 경고
- Yjs `13.6.32`의 `body` shared type v1 update

현재 Linux/Node 검사는 fixture를 JavaScript Yjs로 다시 읽는다. 이것은 C#/.NET port, Windows App SDK, Microsoft 한국어 IME, Windows clipboard, Narrator 또는 MSIX의 합격 증거가 아니다. 승인 뒤 P2가 같은 fixture를 Windows runner에서 소비하고 byte-for-byte 또는 의미 동등성을 증명해야 한다.
