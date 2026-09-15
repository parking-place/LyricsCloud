# LyricsCloud Windows

1.1.8은 Windows App SDK `2.4.0`, .NET SDK `10.0.401`, Windows SDK BuildTools `10.0.28000.2705`를 고정한다. 제품 범위는 WinUI 3 native control의 목록·읽기·복사이며 WebView2와 자료 쓰기는 포함하지 않는다.

- `LyricsCloud.Windows.Core`: 서버 capability, PKCE, 자료 목록·모델·링크 JSON, copy와 계정 cache/UI 상태 정책. Linux의 .NET container에서도 합성 fixture를 검사한다.
- `LyricsCloud.Windows`: WinUI 3의 반응형 곡/가사·라임·프롬프트 목록/상세/복사 화면, 시스템 브라우저 loopback 로그인, origin·계정에 결합한 `LOCAL=user` DPAPI token/cache 구현.
- `tests/native/windows/LyricsCloud.Windows.ContractTests`: 웹과 공유하는 합성 fixture의 C# 검증 실행기.

기존 CI `windows-x64-read-only` artifact는 서명 identity가 없는 framework-dependent 개발 빌드다. P4는 별도의 `windows-x64-self-contained` 시험 폴더를 만든다. 이 폴더는 .NET 및 Windows App SDK runtime을 함께 담아 별도 runtime 설치를 요구하지 않도록 설계하지만, 실제 Windows PC 실행 결과 전에는 이 속성도 실기기 PASS로 기록하지 않는다. 폴더의 모든 파일을 함께 압축 해제해야 하며 단일 EXE나 서명된 installer가 아니다. [설치·서명 인계](../../docs/runbooks/1.1.8-windows-installation.md)에 따라 P5에서 실제 Windows 설치·업데이트·제거 검증과 packaged MSIX 서명/provenance를 인수하며, 정식 서명이 없으면 Windows installer를 release artifact로 표시하지 않는다.

```powershell
dotnet run --project tests/native/windows/LyricsCloud.Windows.ContractTests/LyricsCloud.Windows.ContractTests.csproj --configuration Release
dotnet build apps/windows/LyricsCloud.Windows/LyricsCloud.Windows.csproj --configuration Release -p:Platform=x64
dotnet publish apps/windows/LyricsCloud.Windows/LyricsCloud.Windows.csproj --configuration Release -p:Platform=x64 --runtime win-x64 --self-contained true -p:WindowsAppSDKSelfContained=true -p:PublishSingleFile=false -p:PublishTrimmed=false
```
