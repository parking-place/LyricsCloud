# 사전 조회·무료 웹폰트 계약

상태: **필수 제품 범위 / 사전 provider Deferred / 1.0.14 폰트 결정 Accepted**. [1.0.13 사전](../1.0.13/README.md), [1.0.14 폰트](../1.0.14/README.md)를 소비한다. 상세 작업과 수용은 각 Phase 한 곳에서 관리한다.

## 사전 제공 gate

라임노트 단어 hover에 NAVER 뜻풀이를 작은 tooltip으로 보여 주며 한국어·영어·일어를 포함한다. 키보드 focus/명시 조회와 터치 선택 대안, 언어 변경, Esc 닫기/포커스 복귀, loading·없음·오류와 출처 링크를 제공한다. 조합·선택·copy·undo·원문을 바꾸지 않는다.

2026-09-09 부모가 확인한 [NAVER 공개 API 목록](https://developers.naver.com/products/intro/plan/plan.md)과 [백과사전 검색](https://developers.naver.com/docs/serviceapi/search/encyclopedia/encyclopedia.md)만으로 한국어/영어/일본어 사전 뜻풀이의 공개 API는 확인하지 못했다. 불가능하다고 단정하지 않으며 백과사전을 세 언어 사전이라고 대체 주장하지 않는다. P1에서 제공 경로·언어별 범위·인증·호출 한도·사용/캐시/출처 권리를 확인한다. 미확인 상태에서 scraping이나 임의 API를 구현하지 않는다.

공식 제휴/허용 제공자가 필요하면 비용·전송 데이터·조건을 기록해 결정한다. 원문 사전 새 탭 링크는 실패 대안이며 tooltip 요구의 완료 증거가 아니다. 대안 채택이 필수 범위를 바꾸면 명시 결정 전까지 해당 요구를 미완료로 둔다.

승인된 조회에는 단어만 보내고 문서 전체/개인 메모를 보내지 않는다. timeout·취소·late response 제거·provider별 허용 TTL/용량 캐시를 적용한다. 외부 fetch가 필요한 경로는 provider allowlist·redirect·SSRF를 검증한다. 결과는 안전한 텍스트로 렌더링하며 출처·권리 고지를 보존한다.

## 웹폰트 gate

네이버 나눔 등 무료 웹폰트는 한글 완성형/조합 자모, 영문, 일본어 kana/kanji와 기호를 실제 확인한다. 한 폰트가 모든 문자를 지원한다고 가정하지 않고 fallback을 설계한다. 폰트 변경은 원문 저장·copy output을 변경하지 않는다.

2026-09-09 부모가 확인한 [나눔 다운로드](https://hangeul.naver.com/download), [이용 안내](https://help.naver.com/service/11029/contents/18088?lang=ko&osType=PC)를 출발점으로 삼는다. 번들/재배포 때 해당 라이선스·저작권 고지를 포함하고 폰트 자체의 유료 판매 제한을 확인한다. 실제 도입할 폰트별 원문 조건·서브셋 정책은 P1에서 다시 대조한다.

자산/weight/문자 범위·font-display·fallback·캐시와 모바일 예산을 승인한 뒤 적용한다. slow/offline/차단·늦은 로딩에서도 읽기·입력·저장을 유지한다. 실제 Windows IME와 Android/iOS에서 선택·scroll·줄바꿈·성능·글리프 누락을 검사한다. 무료라는 이유로 무제한 다운로드·설치/재배포 권리나 성능 보장을 주장하지 않는다.

[ADR-NF-006](../../../docs/adr/ADR-NF-006-dictionary-provider.md) · [ADR-NF-007](../../../docs/adr/ADR-NF-007-web-fonts.md) · [PROD-NF-007](../../../docs/product/PROD-NF-007-dictionary-tooltip.md) · [PROD-NF-008](../../../docs/product/PROD-NF-008-web-fonts.md)
