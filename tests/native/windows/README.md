# Windows native contract fixtures

이 경로는 Windows 제품 원문이 아니라, 승인된 구현과 Windows runner가 함께 소비할 합성 fixture·contract 실행기를 보관한다.

`fixtures/1.1.8-read-copy-yjs-v1.json`은 1.1.7 release 기록 source에서 다음 계약을 고정한다.

- UTF-8 가사 원문과 LF 정규화
- 문장형·송폼 선택·정확한 `[Extend]` 행·3,000 Unicode code point 경고
- Yjs `13.6.32`의 `body` shared type v1 update

P2의 .NET `10.0.401` contract 실행기는 같은 fixture의 LF·Extend·송폼 선택·Unicode warning과 model/link JSON, 계정 cache/PKCE를 검사한다. Linux/Node 검사는 Yjs update를 JavaScript로 다시 읽지만 C# Yjs port를 주장하지 않는다. Windows App SDK 실제 launch, Microsoft 한국어 IME, Windows clipboard, Narrator 또는 MSIX의 합격 증거는 P3~P5에 남아 있다.
