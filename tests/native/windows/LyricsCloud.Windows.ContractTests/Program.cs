using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using LyricsCloud.Windows.Core;

var assertions = 0;
using var fixture = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "fixture.json")));
var root = fixture.RootElement;
Equal("lyricscloud.windows.contract.v1", root.GetProperty("schemaVersion").GetString(), "fixture schema");

var sentence = root.GetProperty("sentenceCopy");
Equal(sentence.GetProperty("expected").GetString(), CopyContract.BuildLyricPayload(sentence.GetProperty("body").GetString()!).Payload,
    "sentence LF copy");

var songForm = root.GetProperty("songFormCopy");
var body = songForm.GetProperty("body").GetString()!;
Equal(songForm.GetProperty("expectedWhole").GetString(), CopyContract.BuildLyricPayload(body).Payload, "whole Extend copy");
var selected = songForm.GetProperty("selectedSectionIndexes").EnumerateArray().Select(value => value.GetInt32()).ToArray();
Equal(songForm.GetProperty("expectedSelected").GetString(), CopyContract.CopySongFormSections(body, selected), "selected song-form copy");

var warning = root.GetProperty("warningBoundary");
var warningPayload = CopyContract.BuildLyricPayload(string.Concat(Enumerable.Repeat(warning.GetProperty("codePoint").GetString()!, warning.GetProperty("repeat").GetInt32())));
Equal(warning.GetProperty("expectedLimit").GetInt32(), CopyContract.LyricWarningLimit, "warning limit");
Equal(warning.GetProperty("repeat").GetInt32(), warningPayload.CodePointCount, "Unicode code points");
Equal(warning.GetProperty("expectedWarning").GetBoolean(), warningPayload.ExceedsRecommendedLimit, "warning boundary");

var firstNamespace = AccountCachePolicy.Namespace("https://dev.example.test", "user-a");
var secondNamespace = AccountCachePolicy.Namespace("https://dev.example.test", "user-b");
True(firstNamespace.Length == 64 && firstNamespace != secondNamespace, "account cache namespace");
True(AccountCachePolicy.CanExpose(CachedResourceAccess.Owner, false), "owner offline cache");
True(!AccountCachePolicy.CanExpose(CachedResourceAccess.Shared, false), "shared cache requires online permission");
True(AccountCachePolicy.CanExpose(CachedResourceAccess.Shared, true), "shared cache after permission validation");
True(AccountCachePolicy.MustPurge(403, false, false), "revoke purge");

var pkce = NativePkceFactory.Create();
True(pkce.Verifier.Length == 43 && pkce.Challenge.Length == 43 && pkce.Verifier != pkce.Challenge, "PKCE S256");

var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);
var workspace = JsonSerializer.Deserialize<NativeSunoWorkspace>("""
    {"modelLabel":"v5","links":[{"id":"00000000-0000-4000-8000-000000000001","url":"https://suno.com/song/00000000-0000-4000-8000-000000000002","title":"합성 링크","note":"","position":0,"rowVersion":3,"createdAt":"2026-09-15T00:00:00Z","updatedAt":"2026-09-15T00:00:00Z"}],"rowVersion":4}
    """, jsonOptions);
Equal("v5", workspace?.ModelLabel, "model metadata");
Equal("합성 링크", workspace?.Links.Single().Title, "link metadata");

var list = JsonSerializer.Deserialize<NativeListResult<NativeSong>>("""
    {"items":[{"id":"00000000-0000-4000-8000-000000000010","title":"합성 곡","description":"","workNotes":"메모","status":"draft","color":null,"isFavorite":false,"isPinned":false,"pinOrder":null,"rowVersion":1,"createdAt":"2026-09-15T00:00:00Z","updatedAt":"2026-09-15T00:00:00Z","lyricCount":2}],"totalCount":1,"nextCursor":"next"}
    """, jsonOptions);
Equal(1, list?.Items.Count, "native song list items");
Equal("next", list?.NextCursor, "native cursor");
Equal("가사 2개 · draft", NativeLibraryPresentation.Entry(list!.Items.Single()).Subtitle, "song list presentation");

Equal(NativeViewState.Loading, NativeLibraryState.Loading("곡").State, "loading state");
Equal(NativeViewState.Empty, NativeLibraryState.Loaded("곡", 0).State, "empty state");
Equal(NativeViewState.Ready, NativeLibraryState.Loaded("곡", 1).State, "ready state");
Equal(NativeViewState.NoAccess,
    NativeLibraryState.Failure(new NativeApiException(System.Net.HttpStatusCode.Forbidden, "FORBIDDEN")).State,
    "forbidden state");
Equal(NativeViewState.Error, NativeLibraryState.Failure(new HttpRequestException()).State, "network failure state");

var prompt = new NativePrompt("00000000-0000-4000-8000-000000000011", "합성 프롬프트", [], "sentence", "",
    "문장\r\n원문", "문장\r\n원문", false, false, null, null, 1, [], 0, null,
    DateTimeOffset.UnixEpoch, DateTimeOffset.UnixEpoch);
Equal("문장\r\n원문", NativeLibraryPresentation.Copy(prompt).Payload, "prompt exact copy");
True(!NativeLibraryPresentation.Copy(prompt).ExceedsRecommendedLimit, "prompt warning below limit");
var longPrompt = prompt with { PlainText = string.Concat(Enumerable.Repeat("🙂", 1_001)) };
True(NativeLibraryPresentation.Copy(longPrompt).ExceedsRecommendedLimit, "prompt Unicode warning");

var origin = new Uri("https://DEV.Example.Test/path");
var credential = new NativeStoredCredential("https://dev.example.test", "00000000-0000-4000-8000-000000000012",
    new string('a', 43), DateTimeOffset.UtcNow.AddMinutes(5));
True(NativeCredentialPolicy.IsUsable(credential, origin, DateTimeOffset.UtcNow), "credential exact origin");
True(!NativeCredentialPolicy.IsUsable(credential, new Uri("https://other.example.test"), DateTimeOffset.UtcNow),
    "credential cross-origin rejection");
True(!NativeCredentialPolicy.IsUsable(credential with { ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-1) }, origin,
    DateTimeOffset.UtcNow), "credential expiry rejection");
True(!NativeLibraryPresentation.SupportsWrites, "read-only presentation");

var callbackOrigin = new Uri("http://127.0.0.1:49152/lyricscloud/oauth/callback-token");
var callbackCode = new string('c', 43);
var callbackState = new string('s', 43);
Equal(callbackCode, NativeLoopbackCallbackPolicy.Validate(callbackOrigin,
    $"/lyricscloud/oauth/callback-token?code={callbackCode}&state={callbackState}", callbackState),
    "exact loopback callback");
Throws<InvalidDataException>(() => NativeLoopbackCallbackPolicy.Validate(callbackOrigin,
    $"http://example.test/lyricscloud/oauth/callback-token?code={callbackCode}&state={callbackState}", callbackState),
    "absolute-form callback rejection");
Throws<InvalidDataException>(() => NativeLoopbackCallbackPolicy.Validate(callbackOrigin,
    $"/lyricscloud/oauth/other?code={callbackCode}&state={callbackState}", callbackState),
    "wrong callback path rejection");
Throws<InvalidDataException>(() => NativeLoopbackCallbackPolicy.Validate(callbackOrigin,
    $"/lyricscloud/oauth/callback-token?code={callbackCode}&state={callbackState}&state={callbackState}", callbackState),
    "duplicate callback state rejection");
Throws<InvalidDataException>(() => NativeLoopbackCallbackPolicy.Validate(callbackOrigin,
    $"/lyricscloud/oauth/callback-token?code={callbackCode}&state={new string('x', 43)}", callbackState),
    "wrong callback state rejection");

Equal(NativeRecoveryAction.ClearSession,
    NativeRecoveryPolicy.For(new NativeApiException(System.Net.HttpStatusCode.Unauthorized, "UNAUTHORIZED")),
    "401 clears session");
Equal(NativeRecoveryAction.ClearResource,
    NativeRecoveryPolicy.For(new NativeApiException(System.Net.HttpStatusCode.Forbidden, "FORBIDDEN")),
    "403 clears resource");
Equal(NativeRecoveryAction.ClearResource,
    NativeRecoveryPolicy.For(new NativeApiException(System.Net.HttpStatusCode.NotFound, "NOT_FOUND")),
    "404 clears resource");
Equal(NativeRecoveryAction.PreserveOwnerData, NativeRecoveryPolicy.For(new HttpRequestException()),
    "offline owner data can remain visible");

Console.WriteLine($"Windows core contract: {assertions} assertions PASS");

void Equal<T>(T expected, T actual, string name)
{
    if (!EqualityComparer<T>.Default.Equals(expected, actual)) throw new InvalidOperationException($"{name}: expected {expected}, got {actual}");
    assertions += 1;
}

void True(bool condition, string name)
{
    if (!condition) throw new InvalidOperationException($"{name}: failed");
    assertions += 1;
}

void Throws<T>(Action action, string name) where T : Exception
{
    try { action(); }
    catch (T) { assertions += 1; return; }
    throw new InvalidOperationException($"{name}: expected {typeof(T).Name}");
}
