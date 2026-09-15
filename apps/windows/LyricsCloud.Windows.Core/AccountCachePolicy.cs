using System.Security.Cryptography;
using System.Text;

namespace LyricsCloud.Windows.Core;

public enum CachedResourceAccess { Owner, Shared }

public static class AccountCachePolicy
{
    public static string Namespace(string origin, string serverUserId)
    {
        var authority = new Uri(origin, UriKind.Absolute).GetLeftPart(UriPartial.Authority).TrimEnd('/').ToLowerInvariant();
        return Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes($"{authority}\0{serverUserId}")));
    }

    public static bool CanExpose(CachedResourceAccess access, bool onlinePermissionRevalidated) =>
        access == CachedResourceAccess.Owner || onlinePermissionRevalidated;

    public static bool MustPurge(int statusCode, bool permissionEpochChanged, bool accountChanged) =>
        accountChanged || permissionEpochChanged || statusCode is 401 or 403 or 404;
}
