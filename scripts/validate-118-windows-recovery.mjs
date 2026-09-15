import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [recovery, loopback, windowCode, contractTests, apiE2e, guide] = await Promise.all([
  read("apps/windows/LyricsCloud.Windows.Core/NativeRecovery.cs"),
  read("apps/windows/LyricsCloud.Windows/Authentication/LoopbackSignIn.cs"),
  read("apps/windows/LyricsCloud.Windows/MainWindow.xaml.cs"),
  read("tests/native/windows/LyricsCloud.Windows.ContractTests/Program.cs"),
  read("tests/e2e/native-windows-read-api.spec.ts"),
  read("docs/runbooks/1.1.8-windows-installation.md")
]);

for (const marker of [
  "NativeRecoveryAction.ClearSession", "NativeRecoveryAction.ClearResource", "HttpStatusCode.Unauthorized",
  "HttpStatusCode.Forbidden or HttpStatusCode.NotFound", "IPAddress.Loopback", "requestTarget.StartsWith(\"//\"",
  "CryptographicOperations.FixedTimeEquals", "IsBase64Url", "CALLBACK_STATE_INVALID"
]) includes(recovery, marker, `recovery policy ${marker}`);
rejects(loopback, /System\.Web\.HttpUtility/, "callback parser is not authority-agnostic");
includes(loopback, "NativeLoopbackCallbackPolicy.Validate", "exact callback policy is consumed");

const logout = between(windowCode, "private async void LogoutButton_Click", "private async void RefreshButton_Click");
ordered(logout, "InvalidateAuthenticatedWork();", "await api.LogoutAsync();", "logout invalidates visible work before network wait");
ordered(logout, "ClearLibrary();", "await api.LogoutAsync();", "logout clears visible resources before network wait");
for (const marker of [
  "_sessionGeneration", "_detailCancellation", "ListLyricsAsync(song.Id, token)",
  "generation != _sessionGeneration", "ReferenceEquals(ResourceListView.SelectedItem, entry)",
  "NativeRecoveryPolicy.For(error)", "case NativeRecoveryAction.ClearSession", "case NativeRecoveryAction.ClearResource",
  "ClearLocalIdentityAsync(origin, userId)", "_accountCache.PurgeAccountAsync", "_authenticatedUserId = null"
]) includes(windowCode, marker, `window recovery ${marker}`);

for (const marker of [
  "exact loopback callback", "absolute-form callback rejection", "wrong callback path rejection",
  "duplicate callback state rejection", "wrong callback state rejection", "401 clears session",
  "403 clears resource", "404 clears resource", "offline owner data can remain visible"
]) includes(contractTests, marker, `contract regression ${marker}`);
for (const marker of [
  "isolates logout, expired sessions, and inactive account transitions", "native/v1/auth/logout",
  "now()-interval '1 minute'", "'blocked'"
]) includes(apiE2e, marker, `API recovery ${marker}`);
for (const marker of ["실제 Windows에서만 판정할 항목", "DPAPI/프로세스 종료", "신뢰 가능한 timestamp"])
  includes(guide, marker, `actual Windows gate ${marker}`);

console.log("1.1.8 Windows recovery contract: exact callback, session/resource purge, stale-request fencing and actual-OS gate PASS");

function between(source, start, end) {
  const from = source.indexOf(start); const to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`source section missing: ${start}`);
  return source.slice(from, to);
}

function ordered(source, first, second, label) {
  const firstIndex = source.indexOf(first); const secondIndex = source.indexOf(second);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex >= secondIndex) throw new Error(`${label}: invalid order`);
}

function includes(source, marker, label) {
  if (!source.includes(marker)) throw new Error(`${label}: missing ${marker}`);
}

function rejects(source, pattern, label) {
  if (pattern.test(source)) throw new Error(`${label}: forbidden marker found`);
}
