using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using LyricsCloud.Windows.Core;
using Windows.System;

namespace LyricsCloud.Windows.Authentication;

public sealed class LoopbackSignIn
{
    private readonly NativeApiClient _api;
    public LoopbackSignIn(NativeApiClient api) => _api = api;

    public async Task<NativeTokenResponse> SignInAsync(CancellationToken cancellationToken = default)
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start(1);
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        var callbackPath = "/lyricscloud/oauth/" + Base64Url(RandomNumberGenerator.GetBytes(32));
        var callback = new Uri($"http://127.0.0.1:{port}{callbackPath}");
        var pkce = NativePkceFactory.Create();
        var transaction = await _api.BeginSignInAsync(callback, pkce, cancellationToken);
        if (!await Launcher.LaunchUriAsync(new Uri(transaction.AuthorizationUrl))) throw new InvalidOperationException("SYSTEM_BROWSER_UNAVAILABLE");

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromMinutes(10));
        using var client = await listener.AcceptTcpClientAsync(timeout.Token);
        var callbackResult = await ReadCallbackAsync(client, callback, transaction.State, timeout.Token);
        listener.Stop();
        return await _api.ExchangeAsync(transaction, callbackResult, pkce.Verifier, timeout.Token);
    }

    private static async Task<string> ReadCallbackAsync(TcpClient client, Uri expected, string expectedState,
        CancellationToken cancellationToken)
    {
        using var stream = client.GetStream();
        using var reader = new StreamReader(stream, Encoding.ASCII, false, 1024, leaveOpen: true);
        var line = await reader.ReadLineAsync(cancellationToken);
        if (line is null || line.Length > 4096) throw new InvalidDataException("CALLBACK_INVALID");
        var parts = line.Split(' ');
        if (parts.Length != 3 || parts[0] != "GET" || !Uri.TryCreate(expected, parts[1], out var actual)
            || actual.AbsolutePath != expected.AbsolutePath) throw new InvalidDataException("CALLBACK_INVALID");
        var query = System.Web.HttpUtility.ParseQueryString(actual.Query);
        var code = query["code"] ?? "";
        var state = query["state"] ?? "";
        if (!FixedEquals(expectedState, state) || code.Length != 43) throw new InvalidDataException("CALLBACK_STATE_INVALID");
        var body = Encoding.UTF8.GetBytes("LyricsCloud 로그인이 완료되었습니다. 이 창을 닫아도 됩니다.");
        var header = Encoding.ASCII.GetBytes($"HTTP/1.1 200 OK\r\nContent-Type: text/plain; charset=utf-8\r\nCache-Control: no-store\r\nConnection: close\r\nContent-Length: {body.Length}\r\n\r\n");
        await stream.WriteAsync(header, cancellationToken);
        await stream.WriteAsync(body, cancellationToken);
        return code;
    }

    private static bool FixedEquals(string left, string right)
    {
        var a = Encoding.ASCII.GetBytes(left); var b = Encoding.ASCII.GetBytes(right);
        return a.Length == b.Length && CryptographicOperations.FixedTimeEquals(a, b);
    }

    private static string Base64Url(byte[] value) => Convert.ToBase64String(value).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
