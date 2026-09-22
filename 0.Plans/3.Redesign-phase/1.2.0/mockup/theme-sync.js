/* Existing theme controls update colors in place, without rerendering editable content. */
(() => {
  function sync() {
    const mode = document.body.classList.contains('dark') ? 'dark' : 'light';
    if (document.body.dataset.colorMode !== mode) ChromaColor.apply(CHROMA_PALETTES[0], mode);
    const url = new URL(location.href);
    url.searchParams.set('theme', mode);
    history.replaceState(null, '', url.href);
  }
  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  sync();
})();
