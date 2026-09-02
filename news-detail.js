// Third Grain — News記事詳細ページ
(async () => {
  const MICROCMS_SERVICE = 'thirdgrain';
  const MICROCMS_ENDPOINT = 'news';
  const MICROCMS_API_KEY = 'gK4E1t3mC15CN0FDIuvEdD8iqJtnXqv1Bbhk'; // GET専用キー

  const loadingEl = document.getElementById('articleLoading');
  const bodyEl = document.getElementById('articleBody');
  const errorEl = document.getElementById('articleError');

  const metaEl = document.getElementById('articleMeta');
  const titleEl = document.getElementById('articleTitle');
  const thumbEl = document.getElementById('articleThumb');
  const contentEl = document.getElementById('articleContent');

  const showError = () => {
    if (loadingEl) loadingEl.hidden = true;
    if (errorEl) errorEl.hidden = false;
  };

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    showError();
    return;
  }

  try {
    const url = `https://${MICROCMS_SERVICE}.microcms.io/api/v1/${encodeURIComponent(MICROCMS_ENDPOINT)}/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      headers: { 'X-MICROCMS-API-KEY': MICROCMS_API_KEY },
    });
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const item = await res.json();

    document.title = `${item.title || 'News'} | Third Grain`;

    if (metaEl) metaEl.textContent = [item.date, item.tag].filter(Boolean).join('　・　');
    if (titleEl) titleEl.textContent = item.title || '';

    const thumbUrl = item.thumbnail && item.thumbnail.url;
    if (thumbEl) {
      if (thumbUrl) {
        thumbEl.innerHTML = `<img src="${thumbUrl}" alt="">`;
      } else {
        thumbEl.hidden = true;
      }
    }

    // 本文(リッチエディタ)があればそれを、無ければ抜粋文を表示する
    if (contentEl) {
      if (item.content) {
        contentEl.innerHTML = item.content;
      } else if (item.excerpt) {
        contentEl.innerHTML = `<p>${item.excerpt}</p>`;
      }
    }

    if (loadingEl) loadingEl.hidden = true;
    if (bodyEl) bodyEl.hidden = false;
  } catch (err) {
    showError();
  }
})();
