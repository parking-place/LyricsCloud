using System.Text;
using LyricsCloud.Windows.Core;

namespace LyricsCloud.Windows.Security;

internal static class AppLocalStorage
{
    private const string ProductDirectory = "LyricsCloud";
    private const string WindowsClientDirectory = "Windows";
    private const string OriginFile = "server-origin.txt";
    private const string TokenFile = "native-session.bin";

    private static readonly string RootDirectory = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        ProductDirectory,
        WindowsClientDirectory);

    public static string? ReadServerOrigin()
    {
        try
        {
            var value = File.ReadAllText(Path.Combine(RootDirectory, OriginFile), Encoding.UTF8).Trim();
            return string.IsNullOrWhiteSpace(value) ? null : value;
        }
        catch (FileNotFoundException) { return null; }
        catch (DirectoryNotFoundException) { return null; }
        catch (UnauthorizedAccessException) { return null; }
        catch (IOException) { return null; }
    }

    public static void WriteServerOrigin(string origin) =>
        WriteTextAtomic(Path.Combine(RootDirectory, OriginFile), origin);

    public static string TokenPath => Path.Combine(RootDirectory, TokenFile);

    public static string AccountDirectory(string origin, string userId) =>
        Path.Combine(RootDirectory, AccountCachePolicy.Namespace(origin, userId));

    public static string ResourcePath(string origin, string userId, string resourceId) =>
        Path.Combine(AccountDirectory(origin, userId),
            AccountCachePolicy.Namespace("https://resource.invalid", resourceId) + ".bin");

    public static async Task WriteBytesAtomicAsync(string path, byte[] contents)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var temporary = path + ".tmp-" + Guid.NewGuid().ToString("N");
        try
        {
            await File.WriteAllBytesAsync(temporary, contents);
            File.Move(temporary, path, true);
        }
        finally
        {
            try { File.Delete(temporary); }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }
    }

    private static void WriteTextAtomic(string path, string contents)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var temporary = path + ".tmp-" + Guid.NewGuid().ToString("N");
        try
        {
            File.WriteAllText(temporary, contents, Encoding.UTF8);
            File.Move(temporary, path, true);
        }
        finally
        {
            try { File.Delete(temporary); }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }
    }
}
