# 입력·프롬프트·송폼·복사 출력 계약

상태: **1.0.3~1.0.6 범위 Accepted**. 1.0.1의 입력 안전성과 기존 원본 저장 규칙을 유지하며, 충돌하면 원문 유실을 허용하지 말고 새 결정에 기록한다.

## 1. 원문과 출력의 분리

편집 원문은 UTF-8 순수 텍스트/기존 CRDT occurrence를 보존한다. 화면 span/decoration, 검색 projection, Suno용 copy payload, recovery export는 별도다. 편의를 위해 raw를 정규화·trim·자모 필터링·임의 punctuation 치환하지 않는다. 기존 tags의 copy 동작은 golden fixture로 고정하고 새 mode로 강제 변환하지 않는다.

IME 결함의 확정 원인은 아직 모른다. composition중 전체문서 replace, remote echo, stale autosave response, DOM 재마운트, input/compositionend 순서가 **조사 후보**다. 하나의 증상만 보고 라이브러리 버그나 DNS/CSS 문제로 단정하지 않는다. [CodeMirror 공식 reference](https://codemirror.net/docs/ref/)의 composing/compositionStarted와 transaction 계약을 확인하되 실제 OS IME 테스트가 최종 근거다.

## 2. 프롬프트 모드

태그형/문장형의 **표현 모드 선택**은 punctuation을 바꾸는 명령이 아니다. 기존 tags는 토큰 occurrence와 기존 serializer를 유지한다. 문장형은 원문을 저장하고 U+002E `.` 경계의 lossless span으로 분리해 보여준다. span을 순서대로 합치면 원문이 정확히 복원되어야 한다. `3.5`, `Dr.`, `e.g.`, URL, `...`, 끝 마침표 없음도 잃지 않는다. 약어/소수점은 표시상 여러 span이 생기더라도 원문 재결합과 복사에서 손상되지 않는다. 구두점 예외의 '똑똑한 문장 분석'은 별도 승인 없이 넣지 않는다.

한 자료에서 tags→sentence 보기 전환은 기존 serialized output을 정확히 보여주고, sentence→tag 보기 전환도 자동으로 모든 마침표를 쉼표로 바꾸지 않는다. **편집 가능한 구조 변환**이 필요하면 기존 원문과 변환 미리보기·확인·undo를 가진 별도 command로 제공한다. 승인 전까지 모드 metadata와 raw를 보존하고 lossless view adapter만 사용한다. 문장형에 태그 dedup/공백정규화를 적용하지 않는다.

mode+body/occurrence의 조합은 원자 command 또는 승인된 CRDT transaction으로 다룬다. 서로 다른 탭의 mode 변경은 오래된 raw로 덮어쓰기 하지 않고 버전 충돌/명시 재확인을 처리한다. 템플릿·revision·복제·검색·export에도 mode 정보와 원문이 함께 보존된다.

## 3. 경고의 단위

프롬프트는 최종 전체 copy가 **1,000자 초과**, 가사는 최종 Suno용 전체 copy가 **3,000자 초과**하면 경고한다. 정확히 한도이면 초과 경고를 하지 않는다. 경고는 advisory이며 입력·저장·복사·붙여넣기를 막거나 잘라내지 않는다. 이 수치는 **사용자 지정 LyricsCloud 경고 기준**이며 Suno의 현재 공식 최대 길이를 단정하는 것이 아니다.

권장 count는 Unicode code point 수다. 공백·줄바꿈·구두점을 포함한다. payload의 CRLF→LF 정책이 있다면 **serializer의 최종 결과**를 센다. 원문에 NFC/NFKC를 강제하지 않는다. 합성 emoji는 여러 code point가 될 수 있다는 설명을 붙이고 code unit/바이트/눈에 보이는 글자 수와 혼동하지 않는다. UI counter, 실제 clipboard, 수동 copy dialog가 하나의 payload builder를 소비한다.

| fixture | 기대 |
|---|---|
| prompt 999/1000/1001 | 마지막 것만 경고, 모두 copy 가능 |
| lyrics 2999/3000/3001 | 마지막 것만 경고, 모두 copy 가능 |
| raw에 Extend가 있으나 최종 출력은 2999 | 최종 출력 기준으로 경고 없음 |
| mode 보기만 전환 | 원문/기존 copy payload 불변 |
| emoji/분해 한글/CRLF | 정의한 count와 실제 payload를 일관되게 사용 |

## 4. 송폼 sub tag

줄 단위 송폼의 대괄호 안 **첫 `:`**를 base와 suffix의 경계로 본다. 콜론 앞 base의 앞뒤 공백을 제외한 값이 탐색용 주 이름이며, `[Verse: soft voice]`는 `Verse`로 탐색하고 반복 번호도 주 이름을 기준으로 센다. 콜론부터 닫는 대괄호 직전까지의 `: soft voice`는 원문과 Suno용 copy에 그대로 남으며 editor에서는 덜 강조된 decoration으로 표현한다. suffix에 추가 `:`가 있어도 자의적으로 분해·trim·정규화하지 않는다. 콜론 앞 base가 공백뿐이면 기존 문법과의 호환을 위해 전체 대괄호 내부 값을 기존 단일 label로 취급하고 subtag decoration을 만들지 않는다.

정확한 bracket/indentation/case/공백/빈 base/닫히지 않은 tag는 P1의 fixture로 고정한다. 계약 기본안은 줄 전체가 기존 송폼 인식 규칙을 만족할 때만 확장한다. 임의 본문 속 `[TAG:...]`를 숨기지 않는다.

## 5. Extend

기본 이름이 대소문자까지 정확히 `Extend`인 정식 줄 marker `[Extend]`, `[Extend: 3:00:24]`는 **작업 메타데이터**다. `[extend]`, 본문 속 inline literal, 닫히지 않은 bracket는 대상이 아니다. `3:00:24`를 시분초인지 프레임인지 추정하지 않고 불투명 문자열로 보관한다. 송폼 탐색의 새 음악 구간으로 사용하지 않는다.

Suno용 전체 copy에서는 그 marker 줄의 텍스트와 그 줄에 속한 하나의 줄바꿈만 제외한다. 주변 음악 본문의 줄바꿈·빈 줄·태그·suffix를 추가로 trim하지 않는다. 파일 끝에 marker만 있으면 해당 텍스트만 제거한다. inline literal/손상된 bracket/조합 중간 상태는 자동 삭제 대상이 아니다. 전체 copy에서만 제외한다. 부분구간 copy에는 marker를 보존하며 제외 범위를 확장하려면 별도 사용자 요구가 필요하다. **원문 복사·revision·JSON/TXT/Markdown recovery export·인프라 백업에는 Extend를 보존한다.**

UI에는 Suno용 copy와 원문 copy를 분명히 구분한다. 앞선 export 최신 원문 보존 문제를 output filter 변경으로 감추지 않는다.

## 6. 추천 삽입

우클릭 추천은 현재 위치에서 기본 송폼을 선택하는 기능이다. 단일 source의 기본 목록은 `Intro`, `Verse`, `Pre-Chorus`, `Chorus`, `Hook`, `Bridge`, `Outro`이고 삽입 문자열은 각각 `[이름]`이다. 시스템 clipboard/context 기능을 강제로 제거하지 않으며 keyboard 메뉴키/Shift+F10과 모바일 보이는 삽입 메뉴를 병행한다. 클릭 시점의 collapsed/non-collapsed 선택에서 **head caret**을 CRDT 상대 위치로 캡처하고 선택 본문은 삭제하지 않는다. 실행 시점에 상대 위치를 해석해 marker 앞뒤에 필요한 LF만 보충하여 한 CRDT transaction/undo로 한 번 삽입한다. 위치 해석 실패나 composition 중 호출은 원문을 바꾸지 않고 다시 시도할 수 있는 안내를 제공한다. Escape는 메뉴만 닫고 원문·조합을 보존한다. 입력 막힘·초안 소실·중복 삽입이 있으면 기능 완료로 처리하지 않는다.

## 7. 호환/성능

같은 code-point/copy golden fixture를 웹·Windows·Linux·macOS·Android·iOS에 재사용한다. 문장 분할과 송폼 decoration은 전체 원문을 매 입력마다 replace하지 않는다. 장문 측정·동시 편집·오프라인·복구의 정확성을 먼저 확보한다. 기존 PROD-0003 의미 변경은 [PROD-NF-002](../../../docs/product/PROD-NF-002-editor-output.md)에서 대체 범위를 승인한다.

## 패치별 소비

1.0.3은 mode/raw 보존, 1.0.4는 마침표 표시와 prompt 경고, 1.0.5는 서브 송폼/가사 경고, 1.0.6은 Extend와 삽입 메뉴를 담당한다. 각 패치에서 새로 가능해진 동작의 저장·복사·오류·복구를 함께 완성한다.
