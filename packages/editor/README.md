# Editor package boundary

CodeMirror 연결, 증분 송폼 parser, 전체·선택 구간 복사와 직렬 저장 제어기를 애플리케이션 화면에서 분리합니다. 입력 원본은 LF로 정규화한 UTF-8 순수 텍스트이며 HTML을 데이터 원본으로 사용하지 않습니다.

`CodeMirrorTextEditor`는 현재 `value`·selection·visible range와 송폼 배열을 읽고, offset 기반 `EditorDocumentTransaction`을 주고받습니다. 외부 transaction에는 `origin: external` annotation을 붙여 CRDT binding이 원격 변경을 다시 송신하지 않게 할 수 있습니다. 0.3.1은 Yjs 본문 document와 결정적 평문 projection의 최소 경계를 추가하며 WebSocket·IndexedDB·revision은 해당 후속 Phase에서 연결합니다.
