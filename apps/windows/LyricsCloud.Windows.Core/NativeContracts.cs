using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace LyricsCloud.Windows.Core;

public sealed record NativeCapabilities(
    string Contract,
    string Platform,
    NativeAuthentication Authentication,
    IReadOnlyList<string> Resources,
    string CopyFixture,
    bool Writes,
    bool WebView2);

public sealed record NativeAuthentication(string Broker, IReadOnlyList<string> PkceMethods, string SessionScope);
public sealed record NativeTransactionResponse(string AuthorizationUrl, string Transaction, string State, DateTimeOffset ExpiresAt);
public sealed record NativeTokenResponse(string TokenType, string AccessToken, string Scope, DateTimeOffset ExpiresAt, NativeUser User);
public sealed record NativeUser(string Id);
public sealed record NativePkce(string Verifier, string Challenge);
public sealed record NativeSong(string Id, string Title, string Description, string WorkNotes, string Status,
    string? Color, bool IsFavorite, bool IsPinned, int? PinOrder, long RowVersion, DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt, int LyricCount);
public sealed record NativeLyric(string Id, string SongId, string Title, string Body, string Memo, string Status,
    bool IsFavorite, bool IsPinned, int? PinOrder, long RowVersion, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record NativeRhymeTag(string Id, string DisplayValue, string NormalizedValue, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record NativeRhyme(string Id, string Title, string Body, bool IsFavorite, bool IsPinned, int? PinOrder,
    string? Color, long RowVersion, IReadOnlyList<NativeRhymeTag> Tags, IReadOnlyList<string> LinkedSongIds,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record NativePromptToken(string DisplayValue, string NormalizedValue);
public sealed record NativePrompt(string Id, string Title, IReadOnlyList<NativePromptToken> Tokens, string Mode,
    string TagText, string? SentenceText, string PlainText, bool IsFavorite, bool IsPinned, int? PinOrder,
    string? Color, long RowVersion, IReadOnlyList<string> LinkedSongIds, long UseCount, DateTimeOffset? LastUsedAt,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record NativeSongLink(string Id, string Type, string Title, string Preview, bool IsLinked, DateTimeOffset UpdatedAt);
public sealed record NativeSunoLink(string Id, string Url, string Title, string Note, int Position, long RowVersion,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record NativeSunoWorkspace(string? ModelLabel, IReadOnlyList<NativeSunoLink> Links, long RowVersion);
public sealed record NativeSharedAccess(string Mode, string GrantId, long PermissionEpoch, long WriteEpoch);
public sealed record NativeSharedLyric(string Id, string Title, string Body, string Status, DateTimeOffset UpdatedAt,
    string OwnerDisplayName, NativeSharedAccess Access);

public static class NativePkceFactory
{
    public static NativePkce Create()
    {
        var verifier = Base64Url(RandomNumberGenerator.GetBytes(32));
        var challenge = Base64Url(SHA256.HashData(Encoding.ASCII.GetBytes(verifier)));
        return new(verifier, challenge);
    }

    private static string Base64Url(byte[] value) => Convert.ToBase64String(value).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}

public sealed class NativeApiClient
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private readonly HttpClient _http;

    public NativeApiClient(HttpClient http, string? accessToken = null)
    {
        if (http.BaseAddress is null || http.BaseAddress.Scheme != Uri.UriSchemeHttps) {
            throw new ArgumentException("A HTTPS LyricsCloud server base address is required.", nameof(http));
        }
        _http = http;
        if (accessToken is not null) _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
    }

    public Task<NativeCapabilities?> GetCapabilitiesAsync(CancellationToken cancellationToken = default) =>
        _http.GetFromJsonAsync<NativeCapabilities>("api/native/v1/capabilities", Json, cancellationToken);

    public async Task<NativeTransactionResponse> BeginSignInAsync(Uri redirectUri, NativePkce pkce,
        CancellationToken cancellationToken = default)
    {
        using var response = await _http.PostAsJsonAsync("api/native/v1/auth/transactions",
            new { codeChallenge = pkce.Challenge, redirectUri = redirectUri.AbsoluteUri }, Json, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<NativeTransactionResponse>(Json, cancellationToken)
            ?? throw new InvalidDataException("NATIVE_TRANSACTION_INVALID");
    }

    public async Task<NativeTokenResponse> ExchangeAsync(NativeTransactionResponse transaction, string code,
        string verifier, CancellationToken cancellationToken = default)
    {
        using var response = await _http.PostAsJsonAsync("api/native/v1/auth/token",
            new { transaction = transaction.Transaction, state = transaction.State, code, codeVerifier = verifier }, Json, cancellationToken);
        response.EnsureSuccessStatusCode();
        var token = await response.Content.ReadFromJsonAsync<NativeTokenResponse>(Json, cancellationToken)
            ?? throw new InvalidDataException("NATIVE_TOKEN_INVALID");
        if (token.TokenType != "Bearer" || token.Scope != "read") throw new InvalidDataException("NATIVE_SCOPE_INVALID");
        return token;
    }

    public async Task<T> GetReadContractAsync<T>(string relativePath, CancellationToken cancellationToken = default)
    {
        using var response = await _http.GetAsync(relativePath, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<T>(Json, cancellationToken)
            ?? throw new InvalidDataException("NATIVE_RESPONSE_INVALID");
    }
}
