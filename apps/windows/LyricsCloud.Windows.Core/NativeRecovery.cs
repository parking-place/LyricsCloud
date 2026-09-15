using System.Net;
using System.Security.Cryptography;
using System.Text;

namespace LyricsCloud.Windows.Core;

public enum NativeRecoveryAction { PreserveOwnerData, ClearResource, ClearSession }

public static class NativeRecoveryPolicy
{
    public static NativeRecoveryAction For(Exception error) => error switch
    {
        NativeApiException { ResponseStatusCode: HttpStatusCode.Unauthorized } => NativeRecoveryAction.ClearSession,
        NativeApiException { ResponseStatusCode: HttpStatusCode.Forbidden or HttpStatusCode.NotFound } =>
            NativeRecoveryAction.ClearResource,
        _ => NativeRecoveryAction.PreserveOwnerData
    };
}

public static class NativeLoopbackCallbackPolicy
{
    public static string Validate(Uri expected, string requestTarget, string expectedState)
    {
        if (!expected.IsAbsoluteUri || expected.Scheme != Uri.UriSchemeHttp || expected.Host != IPAddress.Loopback.ToString()
            || expected.IsDefaultPort || !string.IsNullOrEmpty(expected.Query) || !string.IsNullOrEmpty(expected.Fragment)
            || string.IsNullOrEmpty(requestTarget) || requestTarget.Length > 4096 || requestTarget[0] != '/'
            || requestTarget.StartsWith("//", StringComparison.Ordinal) || requestTarget.Contains('#'))
            throw new InvalidDataException("CALLBACK_INVALID");

        var queryStart = requestTarget.IndexOf('?');
        var path = queryStart < 0 ? requestTarget : requestTarget[..queryStart];
        if (!string.Equals(path, expected.AbsolutePath, StringComparison.Ordinal) || queryStart < 0)
            throw new InvalidDataException("CALLBACK_INVALID");

        string? code = null;
        string? state = null;
        foreach (var pair in requestTarget[(queryStart + 1)..].Split('&'))
        {
            var separator = pair.IndexOf('=');
            if (separator <= 0) throw new InvalidDataException("CALLBACK_INVALID");
            var key = Decode(pair[..separator]);
            var value = Decode(pair[(separator + 1)..]);
            if (key == "code" && code is null) code = value;
            else if (key == "state" && state is null) state = value;
            else throw new InvalidDataException("CALLBACK_INVALID");
        }

        if (!IsBase64Url(code) || !IsBase64Url(state) || !FixedEquals(expectedState, state!))
            throw new InvalidDataException("CALLBACK_STATE_INVALID");
        return code!;
    }

    private static string Decode(string value)
    {
        try { return Uri.UnescapeDataString(value.Replace('+', ' ')); }
        catch (UriFormatException) { throw new InvalidDataException("CALLBACK_INVALID"); }
    }

    private static bool IsBase64Url(string? value) => value is { Length: 43 }
        && value.All(character => char.IsAsciiLetterOrDigit(character) || character is '-' or '_');

    private static bool FixedEquals(string left, string right)
    {
        var a = Encoding.ASCII.GetBytes(left);
        var b = Encoding.ASCII.GetBytes(right);
        return a.Length == b.Length && CryptographicOperations.FixedTimeEquals(a, b);
    }
}
