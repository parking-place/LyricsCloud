# LyricsCloud Windows

1.1.8은 Windows App SDK `2.4.0`, .NET SDK `10.0.401`, Windows SDK BuildTools `10.0.28000.2705`를 고정한다. 제품 범위는 WinUI 3 native control의 목록·읽기·복사이며 WebView2와 자료 쓰기는 포함하지 않는다.

- `LyricsCloud.Windows.Core`: 서버 capability, PKCE, 자료·모델·링크 JSON, copy와 계정 cache 정책. Linux의 .NET container에서도 합성 fixture를 검사한다.
- `LyricsCloud.Windows`: WinUI 3 shell, 시스템 브라우저 loopback 로그인, `LOCAL=user` DPAPI token/cache 구현.
- `tests/native/windows/LyricsCloud.Windows.ContractTests`: 웹과 공유하는 합성 fixture의 C# 검증 실행기.

P2는 서명 identity가 없는 CI용 unpackaged build까지만 수행한다. P5에서 실제 Windows 설치·업데이트·제거 검증과 함께 packaged MSIX project/서명/provenance를 인수하며, 정식 서명이 없으면 Windows installer를 release artifact로 표시하지 않는다.

```powershell
dotnet run --project tests/native/windows/LyricsCloud.Windows.ContractTests/LyricsCloud.Windows.ContractTests.csproj --configuration Release
dotnet build apps/windows/LyricsCloud.Windows/LyricsCloud.Windows.csproj --configuration Release -p:Platform=x64
```
