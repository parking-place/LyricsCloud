# Editor package boundary

CodeMirror 연결, 증분 송폼 parser, 전체·선택 구간 복사와 직렬 저장 제어기를 애플리케이션 화면에서 분리합니다. 입력 원본은 LF로 정규화한 UTF-8 순수 텍스트이며 HTML을 데이터 원본으로 사용하지 않습니다.

`CodeMirrorTextEditor`는 현재 `value`·selection·visible range와 송폼 배열을 읽고, offset 기반 `EditorDocumentTransaction`을 주고받습니다. 외부 transaction에는 `origin: external` annotation을 붙여 CRDT binding이 원격 변경을 다시 송신하지 않게 할 수 있습니다. 0.3.1은 Yjs 본문 document와 결정적 평문 projection, WebSocket·IndexedDB·revision을 연결했습니다.

0.4.0의 `createRhymeDocument`·`projectRhyme`·`createBrowserRhymeSync`는 동일 owner 텍스트 CRDT와 outbox 수명주기를 그대로 재사용하는 명시적 라임 노트 경계입니다. 서버가 실제 resource subtype과 소유권을 판정하며, 제목·태그·핀·즐겨찾기·색상·곡 연결은 Yjs 본문에 넣지 않습니다.

0.5.0의 prompt adapter는 제목과 occurrence ID가 있는 토큰 sequence를 Yjs에 저장합니다. 중복 occurrence는 사용자 정리 전까지 보존하고, PostgreSQL용 projection은 첫 정규화 키만 선택해 `, ` 문자열을 결정적으로 만듭니다.
