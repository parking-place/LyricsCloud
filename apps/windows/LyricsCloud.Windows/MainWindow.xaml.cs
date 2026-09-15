using System.Collections.ObjectModel;
using LyricsCloud.Windows.Authentication;
using LyricsCloud.Windows.Core;
using LyricsCloud.Windows.Security;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Input;
using Windows.ApplicationModel.DataTransfer;

namespace LyricsCloud.Windows;

public sealed partial class MainWindow : Window
{
    private readonly ObservableCollection<NativeLibraryEntry> _resources = [];
    private readonly ObservableCollection<NativeLibraryEntry> _lyrics = [];
    private readonly DpapiTokenVault _tokenVault = new();
    private HttpClient? _brokerHttp;
    private HttpClient? _authenticatedHttp;
    private NativeApiClient? _brokerApi;
    private NativeApiClient? _api;
    private Uri? _origin;
    private string? _nextCursor;
    private NativeCopyView? _copy;
    private CancellationTokenSource? _loadCancellation;
    private bool _authenticated;

    public MainWindow()
    {
        InitializeComponent();
        ResourceListView.ItemsSource = _resources;
        LyricListView.ItemsSource = _lyrics;
        if (Windows.Storage.ApplicationData.Current.LocalSettings.Values["serverOrigin"] is string origin)
            ServerOriginTextBox.Text = origin;
        SetAuthenticated(false);
        SetState(NativeLibraryState.Disconnected);
    }

    private async void ConnectButton_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            var origin = ParseOrigin(ServerOriginTextBox.Text);
            SetBusy(true, "서버 계약 확인 중…");
            ResetClients();
            _origin = origin;
            _brokerHttp = CreateHttpClient(origin);
            _brokerApi = new NativeApiClient(_brokerHttp);
            var capabilities = await _brokerApi.GetCapabilitiesAsync();
            if (capabilities.Contract != NativeApiClient.Contract || capabilities.Writes || capabilities.WebView2
                || capabilities.Authentication.SessionScope != "read")
                throw new InvalidDataException("NATIVE_CAPABILITY_UNSUPPORTED");

            Windows.Storage.ApplicationData.Current.LocalSettings.Values["serverOrigin"] =
                NativeCredentialPolicy.NormalizeOrigin(origin);
            SignInButton.IsEnabled = true;
            var credential = await _tokenVault.ReadAsync(origin);
            if (credential is null)
            {
                SetAuthenticated(false);
                SetState(new(NativeViewState.Ready, "서버에 연결했습니다. 브라우저 로그인을 진행해 주세요.", false));
                return;
            }
            await ActivateCredentialAsync(credential);
            await LoadResourcesAsync(false);
        }
        catch (Exception error)
        {
            SetAuthenticated(false);
            SetState(NativeLibraryState.Failure(error));
        }
        finally { SetBusy(false); }
    }

    private async void SignInButton_Click(object sender, RoutedEventArgs e)
    {
        if (_brokerApi is null || _origin is null) return;
        try
        {
            SetBusy(true, "시스템 브라우저 로그인 대기 중…");
            var token = await new LoopbackSignIn(_brokerApi).SignInAsync();
            await _tokenVault.StoreAsync(_origin, token);
            await ActivateCredentialAsync(new NativeStoredCredential(NativeCredentialPolicy.NormalizeOrigin(_origin),
                token.User.Id, token.AccessToken, token.ExpiresAt));
            await LoadResourcesAsync(false);
        }
        catch (OperationCanceledException)
        {
            SetState(new(NativeViewState.Error, "로그인이 취소되거나 제한 시간을 넘었습니다. 세션은 만들지 않았습니다.", false));
        }
        catch (Exception error) { SetState(NativeLibraryState.Failure(error)); }
        finally { SetBusy(false); }
    }

    private async Task ActivateCredentialAsync(NativeStoredCredential credential)
    {
        if (_origin is null) throw new InvalidOperationException("SERVER_NOT_CONNECTED");
        _authenticatedHttp?.Dispose();
        _authenticatedHttp = CreateHttpClient(_origin);
        _api = new NativeApiClient(_authenticatedHttp, credential.AccessToken);
        var session = await _api.GetSessionAsync();
        if (!session.Authenticated || session.Scope != "read" || session.User.Id != credential.UserId)
            throw new InvalidDataException("NATIVE_SESSION_INVALID");
        SetAuthenticated(true);
    }

    private async void LogoutButton_Click(object sender, RoutedEventArgs e)
    {
        try { if (_api is not null) await _api.LogoutAsync(); }
        catch (HttpRequestException) { }
        finally
        {
            await _tokenVault.ClearAsync();
            _api = null;
            _authenticatedHttp?.Dispose();
            _authenticatedHttp = null;
            SetAuthenticated(false);
            ClearLibrary();
            SetState(new(NativeViewState.Ready, "이 기기의 로그인 정보를 지웠습니다. 서버에 다시 로그인할 수 있습니다.", false));
        }
    }

    private async void RefreshButton_Click(object sender, RoutedEventArgs e) => await LoadResourcesAsync(false);
    private async void LoadMoreButton_Click(object sender, RoutedEventArgs e) => await LoadResourcesAsync(true);

    private async void ResourceKindComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (_api is not null) await LoadResourcesAsync(false);
    }

    private async Task LoadResourcesAsync(bool append)
    {
        if (_api is null) return;
        _loadCancellation?.Cancel();
        _loadCancellation?.Dispose();
        _loadCancellation = new CancellationTokenSource();
        var token = _loadCancellation.Token;
        var kind = SelectedKind();
        var label = kind switch { NativeResourceKind.Songs => "곡", NativeResourceKind.Rhymes => "라임 노트", _ => "프롬프트" };
        try
        {
            SetBusy(true, $"{label} 불러오는 중…");
            if (!append) ClearLibrary();
            if (kind == NativeResourceKind.Songs)
            {
                var result = await _api.ListSongsAsync(append ? _nextCursor : null, token);
                foreach (var item in result.Items) _resources.Add(NativeLibraryPresentation.Entry(item));
                _nextCursor = result.NextCursor;
            }
            else if (kind == NativeResourceKind.Rhymes)
            {
                var result = await _api.ListRhymesAsync(append ? _nextCursor : null, token);
                foreach (var item in result.Items) _resources.Add(NativeLibraryPresentation.Entry(item));
                _nextCursor = result.NextCursor;
            }
            else
            {
                var result = await _api.ListPromptsAsync(append ? _nextCursor : null, token);
                foreach (var item in result.Items) _resources.Add(NativeLibraryPresentation.Entry(item));
                _nextCursor = result.NextCursor;
            }
            LoadMoreButton.Visibility = _nextCursor is null ? Visibility.Collapsed : Visibility.Visible;
            SetState(NativeLibraryState.Loaded(label, _resources.Count));
        }
        catch (OperationCanceledException) { }
        catch (Exception error)
        {
            if (error is NativeApiException { ResponseStatusCode: System.Net.HttpStatusCode.Unauthorized })
            {
                await _tokenVault.ClearAsync();
                SetAuthenticated(false);
            }
            SetState(NativeLibraryState.Failure(error));
        }
        finally { SetBusy(false); }
    }

    private async void ResourceListView_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (ResourceListView.SelectedItem is not NativeLibraryEntry entry || _api is null) return;
        _lyrics.Clear();
        LyricListView.Visibility = Visibility.Collapsed;
        _copy = null;
        CopyButton.IsEnabled = false;
        if (entry.Resource is NativeSong song)
        {
            DetailTitle.Text = song.Title;
            DetailMetadata.Text = $"{song.Status} · 가사 {song.LyricCount}개 · 곡 메모는 읽기 전용입니다.";
            DetailBody.Text = string.IsNullOrEmpty(song.WorkNotes) ? song.Description : song.WorkNotes;
            CopyLengthText.Text = "가사를 선택하면 복사할 수 있습니다.";
            try
            {
                SetBusy(true, "가사 불러오는 중…");
                var result = await _api.ListLyricsAsync(song.Id);
                foreach (var lyric in result.Items) _lyrics.Add(NativeLibraryPresentation.Entry(lyric));
                if (_lyrics.Count == 0) SetState(NativeLibraryState.Loaded("가사", 0));
                else
                {
                    LyricListView.Visibility = Visibility.Visible;
                    LyricListView.SelectedIndex = 0;
                    SetState(NativeLibraryState.Loaded("가사", _lyrics.Count));
                }
            }
            catch (Exception error) { SetState(NativeLibraryState.Failure(error)); }
            finally { SetBusy(false); }
            return;
        }
        if (entry.Resource is NativeRhyme rhyme)
            ShowCopy(entry.Title, entry.Subtitle, rhyme.Body, NativeLibraryPresentation.Copy(rhyme));
        else if (entry.Resource is NativePrompt prompt)
            ShowCopy(entry.Title, entry.Subtitle, prompt.PlainText, NativeLibraryPresentation.Copy(prompt));
    }

    private void LyricListView_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (LyricListView.SelectedItem is NativeLibraryEntry { Resource: NativeLyric lyric } entry)
            ShowCopy(entry.Title, $"{lyric.Status} · 현재 서버 원문 · 수정 불가", lyric.Body, NativeLibraryPresentation.Copy(lyric));
    }

    private void CopyButton_Click(object sender, RoutedEventArgs e) => CopySelected();

    private void CopyKeyboardAccelerator_Invoked(KeyboardAccelerator sender, KeyboardAcceleratorInvokedEventArgs args)
    {
        CopySelected();
        args.Handled = true;
    }

    private void CopySelected()
    {
        if (_copy is null) return;
        try
        {
            var package = new DataPackage { RequestedOperation = DataPackageOperation.Copy };
            package.SetText(_copy.Payload);
            Clipboard.SetContent(package);
            Clipboard.Flush();
            SetState(new(NativeViewState.Ready, _copy.Feedback, false));
        }
        catch (Exception) { SetState(new(NativeViewState.Error, "클립보드에 복사하지 못했습니다. 다시 시도해 주세요.", false)); }
    }

    private void ShowCopy(string title, string metadata, string body, NativeCopyView copy)
    {
        DetailTitle.Text = title;
        DetailMetadata.Text = metadata;
        DetailBody.Text = body;
        _copy = copy;
        CopyButton.IsEnabled = true;
        CopyLengthText.Text = copy.ExceedsRecommendedLimit
            ? $"{copy.CodePointCount:N0}자 · 권장 길이 초과, 원문 그대로 복사"
            : $"{copy.CodePointCount:N0}자 · 원문 그대로 복사";
    }

    private void SetAuthenticated(bool authenticated)
    {
        _authenticated = authenticated;
        SignInButton.IsEnabled = _brokerApi is not null && !authenticated;
        LogoutButton.IsEnabled = authenticated;
        RefreshButton.IsEnabled = authenticated;
        ResourceKindComboBox.IsEnabled = authenticated;
    }

    private void SetBusy(bool busy, string? message = null)
    {
        LoadingRing.IsActive = busy;
        LoadingRing.Visibility = busy ? Visibility.Visible : Visibility.Collapsed;
        ConnectButton.IsEnabled = !busy;
        ServerOriginTextBox.IsEnabled = !busy;
        if (busy)
        {
            SignInButton.IsEnabled = false;
            LogoutButton.IsEnabled = false;
            RefreshButton.IsEnabled = false;
            ResourceKindComboBox.IsEnabled = false;
            LoadMoreButton.IsEnabled = false;
        }
        else
        {
            SetAuthenticated(_authenticated);
            LoadMoreButton.IsEnabled = _authenticated && _nextCursor is not null;
        }
        if (message is not null) SetState(new(NativeViewState.Loading, message, true));
    }

    private void SetState(NativeLibraryState state)
    {
        StatusInfoBar.Title = state.State switch
        {
            NativeViewState.Ready => "준비됨",
            NativeViewState.Loading => "불러오는 중",
            NativeViewState.Empty => "빈 목록",
            NativeViewState.NoAccess => "접근할 수 없음",
            NativeViewState.Error => "오류",
            _ => "연결 필요"
        };
        StatusInfoBar.Message = state.Message;
        StatusInfoBar.Severity = state.State switch
        {
            NativeViewState.Error => InfoBarSeverity.Error,
            NativeViewState.NoAccess => InfoBarSeverity.Warning,
            NativeViewState.Ready => InfoBarSeverity.Success,
            _ => InfoBarSeverity.Informational
        };
    }

    private void ClearLibrary()
    {
        _resources.Clear();
        _lyrics.Clear();
        _nextCursor = null;
        _copy = null;
        ResourceListView.SelectedItem = null;
        LyricListView.Visibility = Visibility.Collapsed;
        LoadMoreButton.Visibility = Visibility.Collapsed;
        DetailTitle.Text = "자료를 선택해 주세요";
        DetailMetadata.Text = "선택한 자료의 원문을 수정 없이 표시합니다.";
        DetailBody.Text = "";
        CopyButton.IsEnabled = false;
        CopyLengthText.Text = "복사할 자료 없음";
    }

    private void ResetClients()
    {
        _loadCancellation?.Cancel();
        _brokerHttp?.Dispose();
        _authenticatedHttp?.Dispose();
        _brokerHttp = null;
        _authenticatedHttp = null;
        _brokerApi = null;
        _api = null;
        SetAuthenticated(false);
        ClearLibrary();
    }

    private NativeResourceKind SelectedKind() => ResourceKindComboBox.SelectedIndex switch
    {
        1 => NativeResourceKind.Rhymes,
        2 => NativeResourceKind.Prompts,
        _ => NativeResourceKind.Songs
    };

    private static HttpClient CreateHttpClient(Uri origin) => new()
    {
        BaseAddress = origin,
        Timeout = TimeSpan.FromSeconds(30)
    };

    private static Uri ParseOrigin(string value)
    {
        if (!Uri.TryCreate(value.Trim(), UriKind.Absolute, out var parsed) || parsed.Scheme != Uri.UriSchemeHttps
            || !string.IsNullOrEmpty(parsed.UserInfo) || !string.IsNullOrEmpty(parsed.Query)
            || !string.IsNullOrEmpty(parsed.Fragment)) throw new ArgumentException("HTTPS_SERVER_REQUIRED");
        return new Uri(parsed.GetLeftPart(UriPartial.Authority) + "/");
    }
}
