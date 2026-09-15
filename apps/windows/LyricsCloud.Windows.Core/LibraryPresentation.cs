using System.Net;
using System.Text;

namespace LyricsCloud.Windows.Core;

public enum NativeResourceKind { Songs, Rhymes, Prompts }
public enum NativeViewState { Disconnected, Ready, Loading, Empty, NoAccess, Error }

public sealed record NativeLibraryState(NativeViewState State, string Message, bool IsBusy)
{
    public static NativeLibraryState Disconnected { get; } = new(NativeViewState.Disconnected,
        "HTTPS 서버에 연결한 뒤 시스템 브라우저로 로그인해 주세요.", false);
    public static NativeLibraryState Loading(string label) => new(NativeViewState.Loading, $"{label} 불러오는 중…", true);
    public static NativeLibraryState Loaded(string label, int count) => count == 0
        ? new(NativeViewState.Empty, $"표시할 {label} 자료가 없습니다.", false)
        : new(NativeViewState.Ready, $"{label} {count}개를 불러왔습니다.", false);
    public static NativeLibraryState Failure(Exception error) => error switch
    {
        NativeApiException { ResponseStatusCode: HttpStatusCode.Unauthorized } =>
            new(NativeViewState.NoAccess, "로그인이 만료되었습니다. 다시 로그인해 주세요.", false),
        NativeApiException { ResponseStatusCode: HttpStatusCode.Forbidden or HttpStatusCode.NotFound } =>
            new(NativeViewState.NoAccess, "이 자료를 볼 권한이 없거나 공유가 회수되었습니다.", false),
        HttpRequestException => new(NativeViewState.Error, "서버에 연결할 수 없습니다. 주소와 네트워크를 확인해 주세요.", false),
        _ => new(NativeViewState.Error, "자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", false)
    };
}

public sealed record NativeLibraryEntry(string Id, string Title, string Subtitle, NativeResourceKind Kind, object Resource);
public sealed record NativeCopyView(string Payload, int CodePointCount, bool ExceedsRecommendedLimit, string Feedback);

public static class NativeLibraryPresentation
{
    public const string Version = "1.1.8";
    public const int PromptWarningLimit = 1_000;
    public const bool SupportsWrites = false;

    public static NativeLibraryEntry Entry(NativeSong value) => new(value.Id, value.Title,
        $"가사 {value.LyricCount}개 · {value.Status}", NativeResourceKind.Songs, value);
    public static NativeLibraryEntry Entry(NativeRhyme value) => new(value.Id, value.Title,
        value.Tags.Count == 0 ? "태그 없음" : string.Join(" · ", value.Tags.Select(tag => tag.DisplayValue)),
        NativeResourceKind.Rhymes, value);
    public static NativeLibraryEntry Entry(NativePrompt value) => new(value.Id, value.Title,
        value.Mode == "tags" ? "태그형 프롬프트" : "문장형 프롬프트", NativeResourceKind.Prompts, value);
    public static NativeLibraryEntry Entry(NativeLyric value) => new(value.Id, value.Title,
        value.Status, NativeResourceKind.Songs, value);

    public static NativeCopyView Copy(NativeLyric value)
        => LyricCopy(value.Body);

    public static NativeCopyView Copy(NativeSharedLyric value)
        => LyricCopy(value.Body);

    private static NativeCopyView LyricCopy(string body)
    {
        var payload = CopyContract.BuildLyricPayload(body);
        return new(payload.Payload, payload.CodePointCount, payload.ExceedsRecommendedLimit,
            payload.ExceedsRecommendedLimit
                ? $"{payload.CodePointCount:N0}자로 3,000자 권장 기준을 넘었습니다. 내용은 줄이지 않고 그대로 복사했습니다."
                : $"가사 {payload.CodePointCount:N0}자를 복사했습니다.");
    }

    public static NativeCopyView Copy(NativeRhyme value) => Plain(value.Body, int.MaxValue, "라임 노트를 복사했습니다.");
    public static NativeCopyView Copy(NativePrompt value) => Plain(value.PlainText, PromptWarningLimit,
        "프롬프트를 복사했습니다.");

    private static NativeCopyView Plain(string value, int warningLimit, string feedback)
    {
        var count = value.EnumerateRunes().Count();
        var over = count > warningLimit;
        return new(value, count, over, over
            ? $"{count:N0}자로 {warningLimit:N0}자 권장 기준을 넘었습니다. 내용은 줄이지 않고 그대로 복사했습니다."
            : feedback);
    }
}

public sealed record NativeStoredCredential(string Origin, string UserId, string AccessToken, DateTimeOffset ExpiresAt);

public static class NativeCredentialPolicy
{
    public static string NormalizeOrigin(Uri origin)
    {
        if (!origin.IsAbsoluteUri || origin.Scheme != Uri.UriSchemeHttps || !string.IsNullOrEmpty(origin.UserInfo))
            throw new ArgumentException("A HTTPS server origin without user information is required.", nameof(origin));
        return origin.GetLeftPart(UriPartial.Authority).TrimEnd('/').ToLowerInvariant();
    }

    public static bool IsUsable(NativeStoredCredential credential, Uri expectedOrigin, DateTimeOffset now) =>
        string.Equals(credential.Origin, NormalizeOrigin(expectedOrigin), StringComparison.Ordinal)
        && credential.ExpiresAt > now && credential.AccessToken.Length == 43 && Guid.TryParse(credential.UserId, out _);
}
