using System.Text.Json;
using System.Runtime.InteropServices;
using LyricsCloud.Windows.Core;
using Windows.Security.Cryptography;
using Windows.Security.Cryptography.DataProtection;

namespace LyricsCloud.Windows.Security;

public sealed class DpapiTokenVault
{
    private readonly DataProtectionProvider _protector = new("LOCAL=user");

    public async Task StoreAsync(Uri origin, NativeTokenResponse token)
    {
        var envelope = new NativeStoredCredential(NativeCredentialPolicy.NormalizeOrigin(origin), token.User.Id,
            token.AccessToken, token.ExpiresAt);
        var input = CryptographicBuffer.CreateFromByteArray(JsonSerializer.SerializeToUtf8Bytes(envelope));
        var protectedValue = await _protector.ProtectAsync(input);
        CryptographicBuffer.CopyToByteArray(protectedValue, out var protectedBytes);
        await AppLocalStorage.WriteBytesAtomicAsync(AppLocalStorage.TokenPath, protectedBytes);
    }

    public async Task<NativeStoredCredential?> ReadAsync(Uri origin)
    {
        try
        {
            var protectedBytes = await File.ReadAllBytesAsync(AppLocalStorage.TokenPath);
            var protectedValue = CryptographicBuffer.CreateFromByteArray(protectedBytes);
            var clear = await new DataProtectionProvider().UnprotectAsync(protectedValue);
            CryptographicBuffer.CopyToByteArray(clear, out var bytes);
            var credential = JsonSerializer.Deserialize<NativeStoredCredential>(bytes);
            if (credential is not null && NativeCredentialPolicy.IsUsable(credential, origin, DateTimeOffset.UtcNow)) return credential;
            await ClearAsync();
            return null;
        }
        catch (FileNotFoundException) { return null; }
        catch (DirectoryNotFoundException) { return null; }
        catch (UnauthorizedAccessException) { await ClearAsync(); return null; }
        catch (IOException) { await ClearAsync(); return null; }
        catch (COMException) { await ClearAsync(); return null; }
        catch (JsonException) { await ClearAsync(); return null; }
    }

    public async Task ClearAsync()
    {
        try { File.Delete(AppLocalStorage.TokenPath); }
        catch (UnauthorizedAccessException) { }
        catch (IOException) { }
        await Task.CompletedTask;
    }
}
