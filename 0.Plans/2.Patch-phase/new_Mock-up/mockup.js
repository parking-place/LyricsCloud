const root = document.documentElement;
const screenId = root.dataset.screen || '05-lyrics-editor';
const params = new URLSearchParams(location.search);
root.dataset.theme = params.get('theme') || root.dataset.theme || 'light';
root.dataset.platform = params.get('platform') || root.dataset.platform || 'windows';
const state = params.get('state') || 'normal';

const screens = [
  ['01-auth', '로그인 · 베타 가입', '가입', '◎'],
  ['02-songs', '곡 목록', '곡 · 가사', '♪'],
  ['03-song-form', '곡 정보', '곡 · 가사', '♪'],
  ['04-song-dashboard', '곡 작업공간', '곡 · 가사', '♪'],
  ['05-lyrics-editor', '가사 편집', '곡 · 가사', '♪'],
  ['06-rhyme-notes', '라임 노트', '라임', '≈'],
  ['07-rhyme-editor', '라임 편집', '라임', '≈'],
  ['08-prompts', '프롬프트', '프롬프트', '◇'],
  ['09-prompt-editor', '프롬프트 편집', '프롬프트', '◇'],
  ['10-search', '통합 검색', '검색', '⌕'],
  ['11-recent', '최근 작업', '최근', '↺'],
  ['12-favorites', '즐겨찾기 · 핀', '즐겨찾기', '★'],
  ['13-trash', '휴지통', '더보기', '♲'],
  ['14-templates', '템플릿', '더보기', '▦'],
  ['15-settings', '설정 · 계정', '더보기', '⚙'],
  ['16-share-settings', '공유 설정', '곡 · 가사', '↗'],
  ['17-share-read', '공유 가사 읽기', '공유', '◉'],
  ['18-share-write', '공유 가사 편집 · 복구', '공유', '✎'],
];

const byId = Object.fromEntries(screens.map((item) => [item[0], item]));
const current = byId[screenId] || byId['05-lyrics-editor'];
const syntheticLyric = `[Chorus: Bright synths]\n새벽의 파편을 모아\n우리의 이름을 적어\n\n흐려진 장면 너머로\n다시 시작되는 노래`;

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const chip = (text, kind = '') => `<span class="chip ${kind}">${esc(text)}</span>`;
const button = (text, kind = '') => `<button class="button ${kind}">${esc(text)}</button>`;
const field = (label, value, help = '') => `<div class="field"><label>${esc(label)}</label><input value="${esc(value)}" aria-label="${esc(label)}">${help ? `<small>${esc(help)}</small>` : ''}</div>`;
const card = (title, text, tags = []) => `<article class="card"><strong>${esc(title)}</strong><p>${esc(text)}</p><div class="meta">${tags.map((tag) => chip(tag)).join('')}</div></article>`;
const panel = (title, body, action = '') => `<section class="panel"><header class="panel-head"><h2>${esc(title)}</h2>${action}</header><div class="panel-body">${body}</div></section>`;
const banner = (title, text, kind = '') => `<div class="state-banner ${kind}" role="status"><span aria-hidden="true">${kind === 'danger' ? '!' : kind === 'warn' ? '△' : '●'}</span><div><strong>${esc(title)}</strong><p>${esc(text)}</p></div></div>`;

function globalState() {
  if (state === 'loading') return `<div class="stack" role="status" aria-label="불러오는 중"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>`;
  if (state === 'empty') return `<div class="empty"><div><h2>아직 내용이 없습니다</h2><p>첫 항목을 만들면 이 화면에서 바로 이어서 작업할 수 있습니다.</p>${button('첫 항목 만들기', 'primary')}</div></div>`;
  if (state === 'error') return banner('불러오지 못했습니다', '입력한 내용은 그대로 보관했습니다. 연결을 확인한 뒤 다시 시도하세요.', 'danger') + `<div style="margin-top:12px">${button('다시 시도', 'primary')}</div>`;
  if (state === 'offline') return banner('오프라인 · 이 기기에 보관 중', '연결되면 같은 계정의 서버 원본과 안전하게 병합합니다.', 'warn');
  if (state === 'revoked') return banner('권한이 종료되었습니다', '서버 확인본은 읽기 전용입니다. 보내지 못한 자기 입력은 복구함에서 복사할 수 있습니다.', 'danger');
  if (state === 'unsent') return banner('전송 대기 3건 · 원문 보관됨', '화면을 나가도 이 계정과 자료 범위에만 보관합니다.', 'warn');
  if (state === 'ime') return banner('한글 조합 중 · 아직 저장하지 않음', '조합이 끝난 입력만 저장하고 cursor와 undo를 유지합니다.', 'warn');
  if (state === 'code-expired') return banner('초대 코드가 만료되었습니다', '코드는 소비되지 않았습니다. 새 코드를 확인한 뒤 다시 입력하세요.', 'danger');
  return '';
}

function auth() {
  const special = state === 'code-expired' ? globalState() : banner('Private Beta', '초대 코드 확인 뒤 같은 Google 계정으로 본인 확인합니다.');
  return `<div class="content-grid single"><section class="panel" style="max-width:560px;margin:5vh auto"><div class="panel-body stack"><div><p class="section-label">Welcome</p><h2 class="section-title">가사를 잃지 않는 창작 공간</h2></div>${special}${field('초대 코드', state === 'code-expired' ? 'EXPIRED' : 'A7K9Q2', '6자리 영숫자 · 확인 전에는 소비하지 않음')}${field('Google 계정 이메일', 'writer@example.test', '합성 예시 주소')}${button('Google로 확인하고 가입', 'primary')}<p class="muted">계속하면 개인정보 처리방침과 서비스 약관을 확인한 것으로 간주합니다.</p></div></section></div>`;
}

function songs() {
  const status = globalState();
  if (status && state !== 'offline') return panel('내 곡', status);
  const items = [
    card('새벽의 파편', '가사 3 · 작업 중 · 방금 전', ['핀', '신스팝']),
    card('유리 바다', '가사 2 · 초안 · 어제', ['즐겨찾기', '발라드']),
    card('도시의 온도', '가사 1 · 완료 · 3일 전', ['R&B']),
  ];
  return `<div class="stack">${status}<div class="toolbar"><div class="mode-switch" aria-label="보기"><button class="active">목록</button><button>소형</button><button>중형</button><button>대형</button></div><span class="push"></span>${button('새 곡', 'primary')}</div><div class="cards list">${items.join('')}</div></div>`;
}

function songForm() {
  return panel('곡 정보', `<div class="stack">${globalState()}${field('곡 제목', '새벽의 파편')}${field('상태', '작업 중')}${field('색상', '산뜻한 초록')}${field('Suno 모델', 'v4.5')}${field('작업 메모', '후렴의 마지막 두 줄을 더 선명하게')}<div class="toolbar">${button('취소', 'ghost')}<span class="push"></span>${button('저장', 'primary')}</div></div>`);
}

function dashboard() {
  return `<div class="content-grid"><div class="stack">${globalState()}${panel('다음 작업', `<p class="muted">현재 단계와 가장 가까운 행동을 먼저 보여줍니다.</p><div class="toolbar">${button('가사 2 이어쓰기', 'primary')}${button('새 가사')}</div>`)}${panel('가사', `<div class="cards medium">${card('후렴 아이디어', '작업 중 · 서버에 저장됨', ['가사 2'])}${card('첫 번째 초안', '어제 · 수정 기록 4개', ['가사 1'])}</div>`)}${panel('Suno 작업공간', `${card('메인 생성', '공식 링크 · 새 탭에서 열기', ['v4.5', '수동 연결'])}`)}</div><div class="stack">${panel('연결 자료', `${card('라임 · 파편', '장면 / 단면 / 반면', ['최근 사용'])}${card('프롬프트', 'airy vocal, nocturnal synth…', ['문장형'])}`)}${panel('작업 메모', '<p>후렴의 마지막 두 줄을 더 선명하게.</p>')}${panel('위험 작업', button('곡을 휴지통으로 이동', 'danger'))}</div></div>`;
}

function lyricEditor({ shared = false, writer = false } = {}) {
  const isRevoked = state === 'revoked';
  const stateLine = globalState();
  const statusText = isRevoked ? '권한 종료 · 복구 가능' : state === 'offline' ? '오프라인 · 이 기기에 보관 중' : state === 'ime' ? '한글 조합 중 · 저장 보류' : state === 'unsent' ? '전송 대기 3건 · 원문 보관됨' : '서버에 저장됨 · 대기 0건';
  const context = `<aside class="panel context-panel"><header class="panel-head"><h2>작업 자료</h2><button class="icon-button" aria-label="작업 자료 닫기">×</button></header><div class="panel-body stack"><div class="tabs"><button class="active">라임</button><button>프롬프트</button><button>다른 가사</button></div>${card('파편 · 장면', '파편 / 장면 / 단면 / 반면', ['한국어', '최근 사용'])}${card('몽환적 신스팝', 'airy vocal, nocturnal synth…', ['문장형'])}${banner(isRevoked ? '보내지 못한 자기 입력 1건' : '복구할 초안 없음', isRevoked ? '본문에 자동 적용하지 않습니다. 확인 후 복사하거나 내려받으세요.' : '권한 변경이나 저장 거부 시 원문을 여기서 복구합니다.', isRevoked ? 'warn' : '')}</div></aside>`;
  return `<div class="editor-layout"><section class="panel editor-panel"><header class="panel-head"><h2>${shared ? '공유된 후렴 아이디어' : '후렴 아이디어'}</h2>${chip(shared ? (writer ? '편집 가능' : '읽기 전용') : '작업 중', shared && !writer ? '' : 'accent')}${chip('한국어 · 16px')}</header><div class="save-strip"><span aria-hidden="true">${isRevoked ? '!' : '●'}</span><strong>${esc(statusText)}</strong><span class="push">작성자 1 · 읽는 사람 2</span></div>${stateLine ? `<div style="padding:12px 16px 0">${stateLine}</div>` : ''}<div class="editor-paper"><textarea aria-label="가사 본문" ${shared && !writer || isRevoked ? 'readonly' : ''}>${esc(syntheticLyric)}</textarea>${shared ? '<span class="cursor-note">보라 · 3행</span>' : ''}</div><footer class="editor-tools">${button('＋ 구조')}${button('≈ 라임')}${button('◇ 프롬프트')}${button('버전')}${button('표시')}${button('••• 더보기', 'more')}</footer></section>${context}</div>`;
}

function rhymeList() {
  return `<div class="content-grid"><div class="stack">${globalState()}<div class="toolbar">${field('라임 검색', '파편')}<span class="push"></span>${button('새 라임 노트', 'primary')}</div><div class="cards medium">${card('파편 · 장면', '파편 / 장면 / 단면 / 반면', ['핀', '새벽의 파편'])}${card('온도 · 속도', '온도 / 속도 / 고도 / 보도', ['즐겨찾기'])}${card('흐림 · 그림', '흐림 / 그림 / 이름 / 구름', ['최근'])}</div></div><aside class="dictionary-popover"><header><strong>파편</strong>${chip('한국어')}</header><p>깨지거나 부서진 조각이라는 뜻의 합성 예시입니다.</p><footer>사전 제공자 미연결 · 실제 정의가 아닌 목업 문구</footer>${button('원문 복사')}</aside></div>`;
}

function rhymeEditor() {
  return `<div class="content-grid"><div class="stack">${panel('라임 노트', `<div class="stack">${globalState()}${field('제목', '파편 · 장면')}<div class="field"><label for="rhyme-source">원문</label><textarea id="rhyme-source">${esc('파편\n장면\n단면\n반면')}</textarea><small>선택한 줄은 현재 가사의 cursor 위치에 삽입할 수 있습니다.</small></div><div class="token-row">${['밤', '빛', '도시', '후렴'].map((item) => `<button class="token">#${item}</button>`).join('')}</div></div>`, button('저장', 'primary'))}</div>${panel('연결 곡', `${card('새벽의 파편', '현재 가사 2에 연결됨', ['owner 확인'])}${button('연결 관리')}`)}</div>`;
}

function prompts() {
  return `<div class="stack">${globalState()}<div class="toolbar"><div class="mode-switch"><button class="active">전체</button><button>태그형</button><button>문장형</button></div><span class="push"></span>${button('새 프롬프트', 'primary')}</div><div class="cards medium">${card('몽환적 신스팝', 'airy vocal, nocturnal synth, bright chorus', ['문장형', '핀'])}${card('잔잔한 벌스', 'soft piano, close vocal, 82 bpm', ['태그형'])}${card('도시의 드라이브', 'warm bass, night drive, layered hook', ['태그형', '즐겨찾기'])}</div></div>`;
}

function promptEditor() {
  return `<div class="content-grid"><div class="stack">${panel('프롬프트', `<div class="stack">${globalState()}${field('제목', '몽환적 신스팝')}<div class="mode-switch"><button>태그형</button><button class="active">문장형</button></div><div class="field"><label for="prompt-source">원문</label><textarea id="prompt-source">Airy vocal over a nocturnal synth pulse. The chorus opens into a bright layered hook.</textarea><small>표시는 바꿔도 원문과 복사 결과는 유지합니다.</small></div><div class="token-row">${['airy vocal', 'nocturnal synth', 'bright hook'].map((item) => `<button class="token">${item} ×</button>`).join('')}</div></div>`, button('Suno용 복사', 'primary'))}</div>${panel('미리보기', '<p>Airy vocal over a nocturnal synth pulse. The chorus opens into a bright layered hook.</p><p class="muted">84자 · 1,000자 이내</p>')}${panel('연결 곡', card('새벽의 파편', 'Suno 작업공간과 수동 연결', ['owner 확인']))}</div>`;
}

function search() {
  return `<div class="stack">${field('통합 검색', '파편')}<div class="toolbar">${['전체', '곡', '가사', '라임', '프롬프트'].map((item, index) => `<button class="button ${index === 0 ? 'primary' : ''}">${item}</button>`).join('')}</div>${globalState()}<div class="cards list">${card('가사 · 후렴 아이디어', '…새벽의 파편을 모아…', ['일치 1', '가사 2'])}${card('라임 · 파편 · 장면', '파편 / 장면 / 단면 / 반면', ['일치 1'])}${card('곡 · 새벽의 파편', '작업 중 · 방금 전', ['가사 3'])}</div></div>`;
}

function recent() {
  return `<div class="stack">${globalState()}<div class="cards list">${card('가사 · 후렴 아이디어', '마지막 cursor 3행 · 방금 전', ['이어쓰기'])}${card('프롬프트 · 몽환적 신스팝', '문장형 · 12분 전', ['복사'])}${card('라임 · 파편 · 장면', '새벽의 파편에 연결 · 어제', ['열기'])}</div></div>`;
}

function favorites() {
  return `<div class="stack">${globalState()}<div class="toolbar"><div class="mode-switch"><button class="active">핀</button><button>즐겨찾기</button></div></div><div class="cards list">${card('1 · 새벽의 파편', '곡 · 작업 중', ['핀', '가사 3'])}${card('2 · 몽환적 신스팝', '프롬프트 · 문장형', ['핀'])}${card('3 · 파편 · 장면', '라임 노트', ['핀'])}</div></div>`;
}

function trash() {
  return `<div class="stack">${banner('30일 동안 복원할 수 있습니다', '복원해도 과거 공유 권한과 공개 링크는 자동으로 살아나지 않습니다.')} ${globalState()}<div class="cards list">${card('유리 바다', '곡 · 2일 뒤 영구 삭제', ['가사 2', '공유 종료됨'])}${card('첫 번째 초안', '가사 · 18일 뒤 영구 삭제', ['복원 가능'])}</div><div class="toolbar">${button('선택 복원', 'primary')}${button('영구 삭제', 'danger')}</div></div>`;
}

function templates() {
  return `<div class="stack">${globalState()}<div class="toolbar"><span class="push"></span>${button('새 템플릿', 'primary')}</div><div class="cards medium">${card('Verse · Pre · Chorus', '[Verse]\n[Pre-Chorus]\n[Chorus]', ['표준 송폼'])}${card('짧은 훅 반복', '[Hook]\n[Hook: variation]', ['사용자 템플릿'])}${card('Suno 문장형 시작', '장르와 보컬, 전개를 한 문장으로…', ['프롬프트'])}</div></div>`;
}

function settings() {
  return `<div class="content-grid"><div class="stack">${panel('표시', `<div class="stack"><div class="field"><label for="theme-setting">테마</label><select id="theme-setting"><option>${root.dataset.theme === 'dark' ? '다크' : '라이트'}</option><option>시스템</option></select></div><div class="field"><label for="font-setting">가사 글꼴</label><select id="font-setting"><option>Noto Sans KR</option><option>시스템 기본</option></select><small>한글·English·日本語 glyph와 fallback을 미리 봅니다.</small></div><div class="card"><strong>가나다 Lyrics 日本語</strong><p>새벽의 파편 · Airy vocal · 夜の歌</p></div></div>`, button('저장', 'primary'))}${panel('글쓰기', `${field('기본 글자 크기', '16px')}${field('자동 저장 안내', '자세히')}`)}</div><div class="stack">${panel('계정', `${card('UI 감사 합성 사용자', 'Private Beta · Google 확인됨', ['온라인'])}${button('전체 자료 내보내기')}`)}${panel('위험 작업', button('계정 탈퇴 요청', 'danger'))}</div></div>`;
}

function shareSettings() {
  return `<div class="content-grid"><div class="stack">${panel('공유 범위', `<div class="stack">${banner('현재: 지정 사용자 읽기·쓰기', '쓰기 권한은 활성 읽기 권한 안에서만 켤 수 있습니다.')}${card('writer@example.test', '읽기 · 본문 쓰기', ['온라인', 'cursor 표시'])}${card('reader@example.test', '읽기 전용', ['방금 전'])}<div class="toolbar">${button('사용자 추가', 'primary')}${button('모든 권한 회수', 'danger')}</div></div>`)}${panel('공개 링크', `<div class="stack">${banner('비로그인 읽기 켜짐', '만료 7일 · 원문 링크는 복사 직후 화면에서 제거됩니다.')}${button('공개 쓰기 켜기')}${button('링크 회수', 'danger')}</div>`)}</div>${panel('권한 설명', `<div class="stack">${card('읽기', '승인된 가사 본문과 최소 상태만 봅니다.', ['메모 비공개'])}${card('본문 쓰기', '가사 본문만 편집합니다.', ['ACL 변경 불가'])}${card('회수', '열린 연결과 이후 요청을 함께 끝냅니다.', ['복구함 유지'])}</div>`)}</div>`;
}

function shareRead() {
  return `<div class="stack">${banner(state === 'revoked' ? '공유가 종료되었습니다' : '읽기 전용 공유', state === 'revoked' ? '소유자가 권한을 회수했습니다.' : '본문 변경을 실시간으로 받지만 수정할 수 없습니다.', state === 'revoked' ? 'danger' : '')}${state === 'revoked' ? panel('접근할 수 없음', '<div class="empty"><p>이 탭에 private 자료나 이전 snapshot을 남기지 않습니다.</p></div>') : lyricEditor({ shared: true, writer: false })}</div>`;
}

function shareWrite() {
  return `<div class="stack">${banner('공유 편집 안전 경계', '본문만 편집할 수 있고 메모·연결 자료·수정 기록·권한은 비공개입니다.')}${lyricEditor({ shared: true, writer: true })}</div>`;
}

const renderers = {
  '01-auth': auth,
  '02-songs': songs,
  '03-song-form': songForm,
  '04-song-dashboard': dashboard,
  '05-lyrics-editor': () => lyricEditor(),
  '06-rhyme-notes': rhymeList,
  '07-rhyme-editor': rhymeEditor,
  '08-prompts': prompts,
  '09-prompt-editor': promptEditor,
  '10-search': search,
  '11-recent': recent,
  '12-favorites': favorites,
  '13-trash': trash,
  '14-templates': templates,
  '15-settings': settings,
  '16-share-settings': shareSettings,
  '17-share-read': shareRead,
  '18-share-write': shareWrite,
};

function nav(active) {
  const items = [
    ['04-song-dashboard', '✦', '창작 홈'],
    ['02-songs', '♪', '곡 · 가사'],
    ['06-rhyme-notes', '≈', '라임 노트'],
    ['08-prompts', '◇', '프롬프트'],
    ['10-search', '⌕', '통합 검색'],
    ['11-recent', '↺', '최근 작업'],
    ['12-favorites', '★', '즐겨찾기'],
    ['14-templates', '▦', '템플릿'],
  ];
  return items.map(([id, icon, label]) => `<a href="../${id}/mockup.html?theme=${root.dataset.theme}&platform=${root.dataset.platform}" ${current[2] === (id === '02-songs' ? '곡 · 가사' : id === '06-rhyme-notes' ? '라임' : id === '08-prompts' ? '프롬프트' : id === '10-search' ? '검색' : id === '11-recent' ? '최근' : id === '12-favorites' ? '즐겨찾기' : id === '14-templates' ? '더보기' : '') ? 'aria-current="page"' : ''}><span>${icon}</span><span>${label}</span></a>`).join('');
}

function mobileNav() {
  const items = [['02-songs', '♪', '곡'], ['06-rhyme-notes', '≈', '라임'], ['08-prompts', '◇', '프롬프트'], ['10-search', '⌕', '검색'], ['15-settings', '•••', '더보기']];
  return `<nav class="mobile-nav" aria-label="모바일 주 메뉴">${items.map(([id, icon, label]) => `<a href="../${id}/mockup.html?theme=${root.dataset.theme}&platform=${root.dataset.platform}" ${current[2].startsWith(label) || current[2] === label ? 'aria-current="page"' : ''}><b>${icon}</b>${label}</a>`).join('')}</nav>`;
}

function app() {
  const showPrimary = !['01-auth', '17-share-read', '18-share-write'].includes(screenId);
  const body = (renderers[screenId] || renderers['05-lyrics-editor'])();
  return `<div class="prototype-note"><strong>정적 동작 프로토타입</strong><span>서버 저장 없음 · 합성 콘텐츠</span><span class="spacer"></span><label>상태 <select id="state-select"><option value="normal">정상</option><option value="loading">로딩</option><option value="empty">빈 상태</option><option value="error">오류</option><option value="offline">오프라인</option><option value="unsent">미전송</option><option value="ime">IME 조합</option><option value="revoked">권한 철회</option><option value="code-expired">코드 만료</option></select></label><label>플랫폼 <select id="platform-select"><option value="windows">Windows</option><option value="linux">Linux</option><option value="macos">macOS</option><option value="ios">iOS</option><option value="android">Android</option></select></label><button id="theme-toggle">${root.dataset.theme === 'dark' ? 'Light' : 'Dark'}</button></div><div class="app-shell">${showPrimary ? `<aside class="rail"><div class="brand"><span class="brand-mark">L</span><span>LYRICSCLOUD<small>PRIVATE BETA · B-1</small></span></div><nav class="primary-nav" aria-label="주 메뉴">${nav()}</nav><div class="rail-foot"><strong>UI 감사 합성 사용자</strong>개인 작업 공간 · 온라인</div></aside>` : ''}<main class="app-main"><header class="topbar"><div class="page-title"><small>${esc(current[2])} / ${esc(screenId)}</small><h1>${esc(current[1])}</h1></div><span class="platform-badge">${esc(root.dataset.platform)}</span>${chip(state === 'normal' ? '서버에 저장됨' : state, state === 'revoked' || state === 'error' ? 'danger' : state === 'offline' || state === 'unsent' || state === 'ime' ? '' : 'accent')}${button(screenId.includes('editor') ? 'Suno용 복사' : screenId === '02-songs' ? '새 곡' : '도움말', 'primary')}</header><div class="content ${screenId.includes('editor') || screenId === '18-share-write' ? 'editor-content' : ''}">${body}</div>${showPrimary ? mobileNav() : ''}</main></div>`;
}

document.querySelector('#app').innerHTML = app();
const stateSelect = document.querySelector('#state-select');
const platformSelect = document.querySelector('#platform-select');
stateSelect.value = state;
platformSelect.value = root.dataset.platform;
stateSelect.addEventListener('change', () => { params.set('state', stateSelect.value); location.search = params; });
platformSelect.addEventListener('change', () => { params.set('platform', platformSelect.value); location.search = params; });
document.querySelector('#theme-toggle').addEventListener('click', () => { params.set('theme', root.dataset.theme === 'dark' ? 'light' : 'dark'); location.search = params; });
