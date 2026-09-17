using System.Text;
using LyricsCloud.Windows.Core;
using Windows.Security.Cryptography;
using Windows.Security.Cryptography.DataProtection;

namespace LyricsCloud.Windows.Security;

public sealed class ProtectedAccountCache
{
    private readonly DataProtectionProvider _protector = new("LOCAL=user");

    public async Task StoreAsync(string origin, string userId, string resourceId, string json)
    {
        var input = CryptographicBuffer.ConvertStringToBinary(json, BinaryStringEncoding.Utf8);
        var protectedValue = await _protector.ProtectAsync(input);
        CryptographicBuffer.CopyToByteArray(protectedValue, out var bytes);
        await AppLocalStorage.WriteBytesAtomicAsync(AppLocalStorage.ResourcePath(origin, userId, resourceId), bytes);
    }

    public async Task<string?> ReadAsync(string origin, string userId, string resourceId,
        CachedResourceAccess access, bool onlinePermissionRevalidated)
    {
        if (!AccountCachePolicy.CanExpose(access, onlinePermissionRevalidated)) return null;
        try
        {
            var protectedValue = CryptographicBuffer.CreateFromByteArray(
                await File.ReadAllBytesAsync(AppLocalStorage.ResourcePath(origin, userId, resourceId)));
            var clear = await new DataProtectionProvider().UnprotectAsync(protectedValue);
            CryptographicBuffer.CopyToByteArray(clear, out var bytes);
            return Encoding.UTF8.GetString(bytes);
        }
        catch (FileNotFoundException) { return null; }
        catch (DirectoryNotFoundException) { return null; }
        catch (UnauthorizedAccessException) { await PurgeAccountAsync(origin, userId); return null; }
        catch (IOException) { await PurgeAccountAsync(origin, userId); return null; }
    }

    public async Task PurgeAccountAsync(string origin, string userId)
    {
        try { Directory.Delete(AppLocalStorage.AccountDirectory(origin, userId), true); }
        catch (DirectoryNotFoundException) { }
        catch (UnauthorizedAccessException) { }
        catch (IOException) { }
        await Task.CompletedTask;
    }

    public async Task DeleteResourceAsync(string origin, string userId, string resourceId)
    {
        try
        {
            File.Delete(AppLocalStorage.ResourcePath(origin, userId, resourceId));
        }
        catch (UnauthorizedAccessException) { }
        catch (IOException) { }
        await Task.CompletedTask;
    }
}
