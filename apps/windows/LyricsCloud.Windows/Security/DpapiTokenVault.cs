using System.Text;
using Windows.Security.Cryptography;
using Windows.Security.Cryptography.DataProtection;
using Windows.Storage;

namespace LyricsCloud.Windows.Security;

public sealed class DpapiTokenVault
{
    private const string TokenFile = "native-session.bin";
    private readonly DataProtectionProvider _protector = new("LOCAL=user");

    public async Task StoreAsync(string token)
    {
        var input = CryptographicBuffer.ConvertStringToBinary(token, BinaryStringEncoding.Utf8);
        var protectedValue = await _protector.ProtectAsync(input);
        var file = await ApplicationData.Current.LocalFolder.CreateFileAsync(TokenFile, CreationCollisionOption.ReplaceExisting);
        await FileIO.WriteBufferAsync(file, protectedValue);
    }

    public async Task<string?> ReadAsync()
    {
        try
        {
            var file = await ApplicationData.Current.LocalFolder.GetFileAsync(TokenFile);
            var protectedValue = await FileIO.ReadBufferAsync(file);
            var clear = await new DataProtectionProvider().UnprotectAsync(protectedValue);
            CryptographicBuffer.CopyToByteArray(clear, out var bytes);
            return Encoding.UTF8.GetString(bytes);
        }
        catch (FileNotFoundException) { return null; }
        catch (UnauthorizedAccessException) { await ClearAsync(); return null; }
    }

    public async Task ClearAsync()
    {
        try { await (await ApplicationData.Current.LocalFolder.GetFileAsync(TokenFile)).DeleteAsync(); }
        catch (FileNotFoundException) { }
    }
}
