using System.Collections.ObjectModel;
using System.Net;
using System.Text.Json;
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
    private readonly ProtectedAccountCache _accountCache = new();
    private HttpClient? _brokerHttp;
    private HttpClient? _authenticatedHttp;
    private NativeApiClient? _brokerApi;
    private NativeApiClient? _api;
    private Uri? _origin;
    private string? _nextCursor;
    private NativeCopyView? _copy;
    private CancellationTokenSource? _loadCancellation;
    private CancellationTokenSource? _detailCancellation;
    private long _sessionGeneration;
    private string? _authenticatedUserId;
    private bool _authenticated;
    private string? _visibleSharedId;
    private static readonly JsonSerializerOptions CacheJson = new(JsonSerializerDefaults.Web);

    public MainWindow()
    {
        InitializeComponent();
        Activated += MainWindow_Activated;
        ResourceListView.ItemsSource = _resources;
        LyricListView.ItemsSource = _lyrics;
        if (global::Windows.Storage.ApplicationData.Current.LocalSettings.Values["serverOrigin"] is string origin)
            ServerOriginTextBox.Text = origin;
        SetAuthenticated(false);
        SetState(NativeLibraryState.Disconnected);
    }

    private async void MainWindow_Activated(object sender, WindowActivatedEventArgs args)
    {
        if (_visibleSharedId is not { } id) return;
        if (args.WindowActivationState == WindowActivationState.Deactivated)
        {
            ClearCopyOnly();
            return;
        }
        await RevalidateSharedAsync(id);
    }

    private async void ConnectButton_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            var origin = ParseOrigin(ServerOriginTextBox.Text);
            SetBusy(true, "서버 계약 확인 중…");
            if (_origin is not null && NativeCredentialPolicy.NormalizeOrigin(_origin) != NativeCredentialPolicy.NormalizeOrigin(origin))
                await ClearLocalIdentityAsync(_origin, _authenticatedUserId);
            ResetClients();
            _origin = origin;
            _brokerHttp = CreateHttpClient(origin);
            _brokerApi = new NativeApiClient(_brokerHttp);
            var capabilities = await _brokerApi.GetCapabilitiesAsync();
            if (capabilities.Contract != NativeApiClient.Contract || capabilities.Writes || capabilities.WebView2
                || capabilities.Authentication.SessionScope != "read")
                throw new InvalidDataException("NATIVE_CAPABILITY_UNSUPPORTED");

            global::Windows.Storage.ApplicationData.Current.LocalSettings.Values["serverOrigin"] =
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
            await RecoverAsync(error);
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
            var credential = new NativeStoredCredential(NativeCredentialPolicy.NormalizeOrigin(_origin),
                token.User.Id, token.AccessToken, token.ExpiresAt);
            await ActivateCredentialAsync(credential);
            await _tokenVault.StoreAsync(_origin, token);
            await LoadResourcesAsync(false);
        }
        catch (OperationCanceledException)
        {
            SetState(new(NativeViewState.Error, "로그인이 취소되거나 제한 시간을 넘었습니다. 세션은 만들지 않았습니다.", false));
        }
        catch (Exception error)
        {
            await RecoverAsync(error);
            SetState(NativeLibraryState.Failure(error));
        }
        finally { SetBusy(false); }
    }

    private async Task ActivateCredentialAsync(NativeStoredCredential credential)
    {
        if (_origin is null) throw new InvalidOperationException("SERVER_NOT_CONNECTED");
        _authenticatedHttp?.Dispose();
        _authenticatedHttp = CreateHttpClient(_origin);
        _api = new NativeApiClient(_authenticatedHttp, credential.AccessToken);
        _authenticatedUserId = credential.UserId;
        var session = await _api.GetSessionAsync();
        if (!session.Authenticated || session.Scope != "read" || session.User.Id != credential.UserId)
        {
            await ClearLocalIdentityAsync(_origin, credential.UserId);
            throw new InvalidDataException("NATIVE_SESSION_INVALID");
        }
        SetAuthenticated(true);
    }

    private async void LogoutButton_Click(object sender, RoutedEventArgs e)
    {
        var api = _api;
        var origin = _origin;
        var userId = _authenticatedUserId;
        InvalidateAuthenticatedWork();
        SetAuthenticated(false);
        ClearLibrary();
        SetBusy(true, "로그아웃 중…");
        try { if (api is not null) await api.LogoutAsync(); }
        catch (HttpRequestException) { }
        finally
        {
            await ClearLocalIdentityAsync(origin, userId);
            _api = null;
            _authenticatedHttp?.Dispose();
            _authenticatedHttp = null;
            SetAuthenticated(false);
            SetBusy(false);
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
        if (_api is not { } api) return;
        var generation = _sessionGeneration;
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
                var result = await api.ListSongsAsync(append ? _nextCursor : null, token);
                if (generation != _sessionGeneration) return;
                foreach (var item in result.Items) _resources.Add(NativeLibraryPresentation.Entry(item));
                _nextCursor = result.NextCursor;
            }
            else if (kind == NativeResourceKind.Rhymes)
            {
                var result = await api.ListRhymesAsync(append ? _nextCursor : null, token);
                if (generation != _sessionGeneration) return;
                foreach (var item in result.Items) _resources.Add(NativeLibraryPresentation.Entry(item));
                _nextCursor = result.NextCursor;
            }
            else
            {
                var result = await api.ListPromptsAsync(append ? _nextCursor : null, token);
                if (generation != _sessionGeneration) return;
                foreach (var item in result.Items) _resources.Add(NativeLibraryPresentation.Entry(item));
                _nextCursor = result.NextCursor;
            }
            LoadMoreButton.Visibility = _nextCursor is null ? Visibility.Collapsed : Visibility.Visible;
            SetState(NativeLibraryState.Loaded(label, _resources.Count));
        }
        catch (OperationCanceledException) { }
        catch (Exception error)
        {
            if (generation == _sessionGeneration)
            {
                await RecoverAsync(error);
                SetState(NativeLibraryState.Failure(error));
            }
        }
        finally { if (generation == _sessionGeneration) SetBusy(false); }
    }

    private async void ResourceListView_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        CancelDetailLoad();
        ClearDetails();
        if (ResourceListView.SelectedItem is not NativeLibraryEntry entry || _api is not { } api) return;
        var generation = _sessionGeneration;
        _lyrics.Clear();
        LyricListView.Visibility = Visibility.Collapsed;
        _copy = null;
        CopyButton.IsEnabled = false;
        if (entry.Resource is NativeSong song)
        {
            _detailCancellation = new CancellationTokenSource();
            var token = _detailCancellation.Token;
            DetailTitle.Text = song.Title;
            DetailMetadata.Text = $"{song.Status} · 가사 {song.LyricCount}개 · 곡 메모는 읽기 전용입니다.";
            DetailBody.Text = string.IsNullOrEmpty(song.WorkNotes) ? song.Description : song.WorkNotes;
            CopyLengthText.Text = "가사를 선택하면 복사할 수 있습니다.";
            try
            {
                SetBusy(true, "가사 불러오는 중…");
                var result = await api.ListLyricsAsync(song.Id, token);
                if (generation != _sessionGeneration || !ReferenceEquals(ResourceListView.SelectedItem, entry)) return;
                foreach (var lyric in result.Items) _lyrics.Add(NativeLibraryPresentation.Entry(lyric));
                if (_lyrics.Count == 0) SetState(NativeLibraryState.Loaded("가사", 0));
                else
                {
                    LyricListView.Visibility = Visibility.Visible;
                    LyricListView.SelectedIndex = 0;
                    SetState(NativeLibraryState.Loaded("가사", _lyrics.Count));
                }
            }
            catch (OperationCanceledException) { }
            catch (Exception error)
            {
                if (generation == _sessionGeneration)
                {
                    await RecoverAsync(error);
                    SetState(NativeLibraryState.Failure(error));
                }
            }
            finally { if (generation == _sessionGeneration) SetBusy(false); }
            return;
        }
        if (entry.Resource is NativeRhyme rhyme)
            ShowCopy(entry.Title, entry.Subtitle, rhyme.Body, NativeLibraryPresentation.Copy(rhyme));
        else if (entry.Resource is NativePrompt prompt)
            ShowCopy(entry.Title, entry.Subtitle, prompt.PlainText, NativeLibraryPresentation.Copy(prompt));
    }

    private async void LyricListView_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        CancelDetailLoad();
        ClearCopyOnly();
        if (LyricListView.SelectedItem is not NativeLibraryEntry { Resource: NativeLyric lyric } entry
            || _api is not { } api || _origin is null || _authenticatedUserId is null) return;
        var generation = _sessionGeneration;
        var origin = NativeCredentialPolicy.NormalizeOrigin(_origin);
        var userId = _authenticatedUserId;
        _detailCancellation = new CancellationTokenSource();
        try
        {
            SetBusy(true, "가사 권한 확인 중…");
            var current = (await api.GetLyricAsync(lyric.Id, _detailCancellation.Token)).Lyric;
            if (generation != _sessionGeneration || !ReferenceEquals(LyricListView.SelectedItem, entry)) return;
            await _accountCache.StoreAsync(origin, userId, $"owner-lyric:{lyric.Id}", JsonSerializer.Serialize(current, CacheJson));
            if (generation != _sessionGeneration) { await _accountCache.PurgeAccountAsync(origin, userId); return; }
            ShowCopy(current.Title, $"{current.Status} · 현재 서버 원문 · 수정 불가", current.Body, NativeLibraryPresentation.Copy(current));
        }
        catch (OperationCanceledException) { }
        catch (HttpRequestException error) when (error is not NativeApiException)
        {
            if (generation != _sessionGeneration) return;
            NativeLyric? cached = null;
            try
            {
                var stored = await _accountCache.ReadAsync(origin, userId, $"owner-lyric:{lyric.Id}", CachedResourceAccess.Owner, false);
                if (stored is not null) cached = JsonSerializer.Deserialize<NativeLyric>(stored, CacheJson);
            }
            catch (Exception)
            {
                await _accountCache.DeleteResourceAsync(origin, userId, $"owner-lyric:{lyric.Id}");
            }
            if (generation != _sessionGeneration) return;
            if (cached?.Id == lyric.Id)
            {
                ShowCopy(cached.Title, $"{cached.Status} · 이 계정의 마지막 보호 원문 (오프라인)", cached.Body, NativeLibraryPresentation.Copy(cached));
                SetState(new(NativeViewState.Ready, "오프라인: 마지막으로 확인한 본인을 소유한 가사입니다. 재연결하면 새로 확인합니다.", false));
            }
            else SetState(NativeLibraryState.Failure(error));
        }
        catch (Exception error)
        {
            if (generation == _sessionGeneration) { await RecoverAsync(error); SetState(NativeLibraryState.Failure(error)); }
        }
        finally { if (generation == _sessionGeneration) SetBusy(false); }
    }

    private async void OpenSharedButton_Click(object sender, RoutedEventArgs e)
    {
        CancelDetailLoad();
        ClearDetails();
        if (_api is null || _origin is null || _authenticatedUserId is null) return;
        if (!Guid.TryParse(SharedLyricIdTextBox.Text.Trim(), out var parsedId))
        {
            SetState(new(NativeViewState.Error, "공유 가사 UUID를 확인해 주세요.", false));
            return;
        }
        var id = parsedId.ToString("D");
        _visibleSharedId = id;
        await RevalidateSharedAsync(id);
    }

    private async Task<bool> RevalidateSharedAsync(string id)
    {
        if (_api is not { } api || _origin is null || _authenticatedUserId is null || _visibleSharedId != id) return false;
        var generation = _sessionGeneration;
        var origin = NativeCredentialPolicy.NormalizeOrigin(_origin);
        var userId = _authenticatedUserId;
        CancelDetailLoad();
        _detailCancellation = new CancellationTokenSource();
        try
        {
            SetBusy(true, "공유 권한 재확인 중…");
            ClearCopyOnly();
            var fresh = (await api.GetSharedLyricAsync(id, _detailCancellation.Token)).Lyric;
            if (generation != _sessionGeneration || _visibleSharedId != id) return false;
            var resourceKey = $"shared-lyric:{id}";
            await _accountCache.StoreAsync(origin, userId, resourceKey, JsonSerializer.Serialize(fresh, CacheJson));
            if (generation != _sessionGeneration || _visibleSharedId != id)
            {
                await _accountCache.DeleteResourceAsync(origin, userId, resourceKey);
                return false;
            }
            var protectedJson = await _accountCache.ReadAsync(origin, userId, resourceKey, CachedResourceAccess.Shared, true);
            var cached = protectedJson is null ? null : JsonSerializer.Deserialize<NativeSharedLyric>(protectedJson, CacheJson);
            if (generation != _sessionGeneration || _visibleSharedId != id) return false;
            var verified = cached is not null && cached.Id == fresh.Id
                && AccountCachePolicy.CanExposeSharedEpoch(cached.Access.PermissionEpoch, fresh.Access.PermissionEpoch, true)
                ? cached : fresh;
            ShowCopy(verified.Title, $"{verified.Status} · {verified.OwnerDisplayName}의 공유 가사 · 온라인 권한 확인됨",
                verified.Body, NativeLibraryPresentation.Copy(verified));
            SetState(new(NativeViewState.Ready, "공유 가사 읽기 권한을 서버에서 확인했습니다.", false));
            return true;
        }
        catch (OperationCanceledException) { return false; }
        catch (Exception error)
        {
            if (generation != _sessionGeneration) return false;
            ClearDetails();
            if (error is NativeApiException { ResponseStatusCode: HttpStatusCode.Forbidden or HttpStatusCode.NotFound })
                await _accountCache.DeleteResourceAsync(origin, userId, $"shared-lyric:{id}");
            await RecoverAsync(error);
            SetState(error is HttpRequestException and not NativeApiException
                ? new(NativeViewState.NoAccess, "오프라인에서는 공유 권한을 확인할 수 없어 원문을 표시하지 않습니다.", false)
                : NativeLibraryState.Failure(error));
            return false;
        }
        finally { if (generation == _sessionGeneration) SetBusy(false); }
    }

    private async void CopyButton_Click(object sender, RoutedEventArgs e) => await CopySelectedAsync();

    private async void CopyKeyboardAccelerator_Invoked(KeyboardAccelerator sender, KeyboardAcceleratorInvokedEventArgs args)
    {
        args.Handled = true;
        await CopySelectedAsync();
    }

    private async Task CopySelectedAsync()
    {
        if (_copy is null) return;
        if (_visibleSharedId is { } sharedId && !await RevalidateSharedAsync(sharedId)) return;
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
        OpenSharedButton.IsEnabled = authenticated;
        SharedLyricIdTextBox.IsEnabled = authenticated;
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
            OpenSharedButton.IsEnabled = false;
            SharedLyricIdTextBox.IsEnabled = false;
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
        CancelDetailLoad();
        _resources.Clear();
        _nextCursor = null;
        ResourceListView.SelectedItem = null;
        LoadMoreButton.Visibility = Visibility.Collapsed;
        ClearDetails();
    }

    private void ClearDetails()
    {
        _visibleSharedId = null;
        _lyrics.Clear();
        LyricListView.Visibility = Visibility.Collapsed;
        DetailTitle.Text = "자료를 선택해 주세요";
        DetailMetadata.Text = "선택한 자료의 원문을 수정 없이 표시합니다.";
        ClearCopyOnly();
    }

    private void ClearCopyOnly()
    {
        _copy = null;
        DetailBody.Text = "";
        CopyButton.IsEnabled = false;
        CopyLengthText.Text = "복사할 자료 없음";
    }

    private void ResetClients()
    {
        InvalidateAuthenticatedWork();
        _brokerHttp?.Dispose();
        _authenticatedHttp?.Dispose();
        _brokerHttp = null;
        _authenticatedHttp = null;
        _brokerApi = null;
        _api = null;
        _authenticatedUserId = null;
        SetAuthenticated(false);
        ClearLibrary();
    }

    private async Task RecoverAsync(Exception error)
    {
        switch (NativeRecoveryPolicy.For(error))
        {
            case NativeRecoveryAction.ClearSession:
                var origin = _origin;
                var userId = _authenticatedUserId;
                InvalidateAuthenticatedWork();
                await ClearLocalIdentityAsync(origin, userId);
                _api = null;
                _authenticatedHttp?.Dispose();
                _authenticatedHttp = null;
                SetAuthenticated(false);
                ClearLibrary();
                SetBusy(false);
                break;
            case NativeRecoveryAction.ClearResource:
                ClearDetails();
                break;
        }
    }

    private async Task ClearLocalIdentityAsync(Uri? origin, string? userId)
    {
        await _tokenVault.ClearAsync();
        if (origin is not null && userId is not null)
            await _accountCache.PurgeAccountAsync(NativeCredentialPolicy.NormalizeOrigin(origin), userId);
        SharedLyricIdTextBox.Text = "";
        _authenticatedUserId = null;
    }

    private void InvalidateAuthenticatedWork()
    {
        _sessionGeneration += 1;
        _loadCancellation?.Cancel();
        _loadCancellation?.Dispose();
        _loadCancellation = null;
        CancelDetailLoad();
    }

    private void CancelDetailLoad()
    {
        _detailCancellation?.Cancel();
        _detailCancellation?.Dispose();
        _detailCancellation = null;
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
