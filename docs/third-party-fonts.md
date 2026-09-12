# 제3자 폰트 고지와 문제 해결

## Noto Sans KR Regular 2.004

- 저작권: Copyright 2014-2021 Adobe, Reserved Font Name `Source`
- 라이선스: SIL Open Font License 1.1
- 배포 파일: `apps/web/public/fonts/NotoSansKR-Regular.69975a0a.otf`
- font SHA-256: `69975a0ac8472717870aefeab0a4d52739308d90856b9955313b2ad5e0148d68`
- OFL 전문: `apps/web/public/fonts/NotoSansKR-OFL-1.1.6a73f954.txt`
- license SHA-256: `6a73f9541c2de74158c0e7cf6b0a58ef774f5a780bf191f2d7ec9cc53efe2bf2`

LyricsCloud는 공식 OTF를 수정하지 않고 OFL 전문과 함께 배포한다. 글꼴을 단독 판매하지 않으며 재배포자는 OFL 조건과 저작권·Reserved Font Name 고지를 보존해야 한다.

## 표시 범위와 fallback

이 파일은 Latin, 한글 완성형·자모, Kana, Korean subset에 포함된 Han과 기호를 제공한다. 포함되지 않은 문자·emoji는 브라우저와 운영체제의 system sans/emoji fallback이 표시한다. 언어 전체 글리프 보장을 의미하지 않는다.

## 문제 해결

폰트가 늦게 오거나 차단돼도 본문은 system sans로 보이고 입력·저장·복사는 계속된다. 글자가 빈 칸이면 설정에서 `시스템 기본`으로 바꾼 뒤 새로고침하고, 브라우저 개발자 도구에서 hash OTF 요청이 200 또는 service-worker cache 응답인지 확인한다. reverse proxy는 OTF의 `Content-Type`, `Cache-Control: public, max-age=31536000, immutable`을 보존해야 한다. 파일 hash가 다르면 배포를 중단하고 승인된 이미지 digest로 되돌린다.
