import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [xaml, windowCode, contracts, presentation, vault, lyricRoute, guide] = await Promise.all([
  read("apps/windows/LyricsCloud.Windows/MainWindow.xaml"),
  read("apps/windows/LyricsCloud.Windows/MainWindow.xaml.cs"),
  read("apps/windows/LyricsCloud.Windows.Core/NativeContracts.cs"),
  read("apps/windows/LyricsCloud.Windows.Core/LibraryPresentation.cs"),
  read("apps/windows/LyricsCloud.Windows/Security/DpapiTokenVault.cs"),
  read("apps/web/src/app/api/native/v1/songs/[songId]/lyrics/route.ts"),
  read("docs/runbooks/1.1.8-windows-installation.md")
]);

for (const marker of [
  "곡과 가사", "라임 노트", "프롬프트", "브라우저 로그인", "전체 복사", "읽기 전용 원문",
  "ProgressRing", "AutomationProperties.LiveSetting", "AutomationProperties.AcceleratorKey", "AdaptiveTrigger",
  "ThemeResource CardBackgroundFillColorDefaultBrush", "원문은 서버의 현재 읽기 응답입니다."
]) includes(xaml, marker, `XAML ${marker}`);
for (const marker of ["SharedLyricIdTextBox", "OpenSharedButton", "공유 권한이 있을 때 서버에서 다시 확인"])
  includes(xaml, marker, `shared read-only UI ${marker}`);
includes(contracts, "GetSharedLyricAsync", "selected shared lyric API consumed");
includes(windowCode, "NativeLibraryPresentation.Copy(verified)", "shared copy projection");

for (const marker of [
  "ListSongsAsync", "ListLyricsAsync", "ListRhymesAsync", "ListPromptsAsync", "LogoutAsync",
  "NativeLibraryState.Failure", "Clipboard.SetContent", "Clipboard.Flush", "CopyKeyboardAccelerator_Invoked"
]) includes(windowCode + contracts, marker, `Windows flow ${marker}`);

for (const marker of ["Disconnected", "Ready", "Loading", "Empty", "NoAccess", "Error"])
  includes(presentation, marker, `state ${marker}`);
includes(presentation, "SupportsWrites = false", "read-only presentation");
includes(presentation, "PromptWarningLimit = 1_000", "prompt copy warning");
includes(vault, "NativeCredentialPolicy.NormalizeOrigin(origin)", "origin-bound credential");
includes(vault, "DataProtectionProvider", "DPAPI storage");

includes(lyricRoute, "export async function GET", "native lyric list GET");
rejects(lyricRoute, /export async function (?:POST|PUT|PATCH|DELETE)/, "native lyric list remains read-only");
for (const marker of ["Get-AuthenticodeSignature", "Add-AppxPackage", "Remove-AppxPackage", "정식 서명 전"])
  includes(guide, marker, `installer guide ${marker}`);

for (const forbidden of ["CreateSongAsync", "UpdateLyricAsync", "DeleteLyricAsync", "Yjs"])
  rejects(windowCode, new RegExp(forbidden), `Windows UI forbidden write/editor marker ${forbidden}`);
rejects(xaml + windowCode, /(?:<|using Microsoft\.Web\.)WebView2/, "Windows UI embedded WebView2");

console.log("1.1.8 Windows UI contract: browse/copy, six states, accessibility, origin binding, read-only installer boundary PASS");

function includes(source, marker, label) {
  if (!source.includes(marker)) throw new Error(`${label}: missing ${marker}`);
}

function rejects(source, pattern, label) {
  if (pattern.test(source)) throw new Error(`${label}: forbidden marker found`);
}
