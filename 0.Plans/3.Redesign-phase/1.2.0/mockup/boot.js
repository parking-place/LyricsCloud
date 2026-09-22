/* Apply the selected palette before the app renders. An omitted/invalid theme starts light. */
(() => {
  const requested = new URLSearchParams(location.search).get('theme');
  const mode = requested === 'dark' ? 'dark' : 'light';
  window.CHROMA_COLOR_INITIAL_THEME = mode;
  ChromaColor.apply(CHROMA_PALETTES[0], mode);
  document.body.classList.toggle('dark', mode === 'dark');
})();
