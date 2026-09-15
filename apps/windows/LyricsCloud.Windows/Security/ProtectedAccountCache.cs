using System.Text;
using LyricsCloud.Windows.Core;
using Windows.Security.Cryptography;
using Windows.Security.Cryptography.DataProtection;
using Windows.Storage;

namespace LyricsCloud.Windows.Security;

public sealed class ProtectedAccountCache
{
    private readonly DataProtectionProvider _protector = new("LOCAL=user");

    public async Task StoreAsync(string origin, string userId, string resourceId, string json)
    {
        var folder = await AccountFolderAsync(origin, userId, CreationCollisionOption.OpenIfExists);
        var name = AccountCachePolicy.Namespace("https://resource.invalid", resourceId) + ".bin";
        var file = await folder.CreateFileAsync(name, CreationCollisionOption.ReplaceExisting);
        var input = CryptographicBuffer.ConvertStringToBinary(json, BinaryStringEncoding.Utf8);
        await FileIO.WriteBufferAsync(file, await _protector.ProtectAsync(input));
    }

    public async Task<string?> ReadAsync(string origin, string userId, string resourceId,
        CachedResourceAccess access, bool onlinePermissionRevalidated)
    {
        if (!AccountCachePolicy.CanExpose(access, onlinePermissionRevalidated)) return null;
        try
        {
            var folder = await AccountFolderAsync(origin, userId, CreationCollisionOption.FailIfExists);
            var name = AccountCachePolicy.Namespace("https://resource.invalid", resourceId) + ".bin";
            var clear = await new DataProtectionProvider().UnprotectAsync(await FileIO.ReadBufferAsync(await folder.GetFileAsync(name)));
            CryptographicBuffer.CopyToByteArray(clear, out var bytes);
            return Encoding.UTF8.GetString(bytes);
        }
        catch (FileNotFoundException) { return null; }
        catch (UnauthorizedAccessException) { await PurgeAccountAsync(origin, userId); return null; }
    }

    public async Task PurgeAccountAsync(string origin, string userId)
    {
        try { await (await ApplicationData.Current.LocalFolder.GetFolderAsync(AccountCachePolicy.Namespace(origin, userId))).DeleteAsync(StorageDeleteOption.PermanentDelete); }
        catch (FileNotFoundException) { }
    }

    private static Task<StorageFolder> AccountFolderAsync(string origin, string userId, CreationCollisionOption option) =>
        ApplicationData.Current.LocalFolder.CreateFolderAsync(AccountCachePolicy.Namespace(origin, userId), option).AsTask();
}
