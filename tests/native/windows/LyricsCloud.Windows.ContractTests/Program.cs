using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using LyricsCloud.Windows.Core;

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

Console.WriteLine("Windows core contract: 16 assertions PASS");

static void Equal<T>(T expected, T actual, string name)
{
    if (!EqualityComparer<T>.Default.Equals(expected, actual)) throw new InvalidOperationException($"{name}: expected {expected}, got {actual}");
}

static void True(bool condition, string name)
{
    if (!condition) throw new InvalidOperationException($"{name}: failed");
}
