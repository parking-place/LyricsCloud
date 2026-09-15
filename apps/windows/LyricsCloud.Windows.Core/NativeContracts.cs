using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Net;
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
public sealed record NativeSessionResponse(bool Authenticated, NativeUser User, string Scope, DateTimeOffset ExpiresAt);
public sealed record NativeUser(string Id);
public sealed record NativeListResult<T>(IReadOnlyList<T> Items, int TotalCount, string? NextCursor);
public sealed record NativeSongResponse(NativeSong Song);
public sealed record NativeLyricsResponse(IReadOnlyList<NativeLyric> Items);
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

public sealed class NativeApiException(HttpStatusCode statusCode, string code) : HttpRequestException(code, null, statusCode)
{
    public HttpStatusCode ResponseStatusCode { get; } = statusCode;
    public string Code { get; } = code;
}

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
    public const string Contract = "lyricscloud.native.read.v1";
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

    public Task<NativeCapabilities> GetCapabilitiesAsync(CancellationToken cancellationToken = default) =>
        GetReadContractAsync<NativeCapabilities>("api/native/v1/capabilities", cancellationToken);

    public Task<NativeSessionResponse> GetSessionAsync(CancellationToken cancellationToken = default) =>
        GetReadContractAsync<NativeSessionResponse>("api/native/v1/session", cancellationToken);

    public Task<NativeListResult<NativeSong>> ListSongsAsync(string? cursor = null, CancellationToken cancellationToken = default) =>
        GetReadContractAsync<NativeListResult<NativeSong>>(ListPath("api/native/v1/songs", cursor), cancellationToken);

    public Task<NativeLyricsResponse> ListLyricsAsync(string songId, CancellationToken cancellationToken = default) =>
        GetReadContractAsync<NativeLyricsResponse>($"api/native/v1/songs/{EscapeId(songId)}/lyrics", cancellationToken);

    public Task<NativeListResult<NativeRhyme>> ListRhymesAsync(string? cursor = null, CancellationToken cancellationToken = default) =>
        GetReadContractAsync<NativeListResult<NativeRhyme>>(ListPath("api/native/v1/rhymes", cursor), cancellationToken);

    public Task<NativeListResult<NativePrompt>> ListPromptsAsync(string? cursor = null, CancellationToken cancellationToken = default) =>
        GetReadContractAsync<NativeListResult<NativePrompt>>(ListPath("api/native/v1/prompts", cursor), cancellationToken);

    public async Task<NativeTransactionResponse> BeginSignInAsync(Uri redirectUri, NativePkce pkce,
        CancellationToken cancellationToken = default)
    {
        using var response = await _http.PostAsJsonAsync("api/native/v1/auth/transactions",
            new { codeChallenge = pkce.Challenge, redirectUri = redirectUri.AbsoluteUri }, Json, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);
        return await response.Content.ReadFromJsonAsync<NativeTransactionResponse>(Json, cancellationToken)
            ?? throw new InvalidDataException("NATIVE_TRANSACTION_INVALID");
    }

    public async Task<NativeTokenResponse> ExchangeAsync(NativeTransactionResponse transaction, string code,
        string verifier, CancellationToken cancellationToken = default)
    {
        using var response = await _http.PostAsJsonAsync("api/native/v1/auth/token",
            new { transaction = transaction.Transaction, state = transaction.State, code, codeVerifier = verifier }, Json, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);
        var token = await response.Content.ReadFromJsonAsync<NativeTokenResponse>(Json, cancellationToken)
            ?? throw new InvalidDataException("NATIVE_TOKEN_INVALID");
        if (token.TokenType != "Bearer" || token.Scope != "read") throw new InvalidDataException("NATIVE_SCOPE_INVALID");
        return token;
    }

    public async Task<T> GetReadContractAsync<T>(string relativePath, CancellationToken cancellationToken = default)
    {
        using var response = await _http.GetAsync(relativePath, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);
        return await response.Content.ReadFromJsonAsync<T>(Json, cancellationToken)
            ?? throw new InvalidDataException("NATIVE_RESPONSE_INVALID");
    }

    public async Task LogoutAsync(CancellationToken cancellationToken = default)
    {
        using var response = await _http.PostAsync("api/native/v1/auth/logout", null, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);
    }

    private static string ListPath(string path, string? cursor) => cursor is null
        ? $"{path}?limit=50"
        : $"{path}?limit=50&cursor={Uri.EscapeDataString(cursor)}";

    private static string EscapeId(string id)
    {
        if (!Guid.TryParse(id, out _)) throw new ArgumentException("A resource UUID is required.", nameof(id));
        return Uri.EscapeDataString(id);
    }

    private static async Task EnsureSuccessAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode)
        {
            if (!response.Headers.TryGetValues("x-lyricscloud-native-contract", out var values)
                || !values.Contains(Contract, StringComparer.Ordinal)) throw new InvalidDataException("NATIVE_CONTRACT_INVALID");
            return;
        }
        var error = await response.Content.ReadFromJsonAsync<NativeErrorEnvelope>(Json, cancellationToken).ConfigureAwait(false);
        throw new NativeApiException(response.StatusCode, error?.Error.Code ?? "NATIVE_REQUEST_FAILED");
    }

    private sealed record NativeErrorEnvelope(NativeError Error);
    private sealed record NativeError(string Code);
}
