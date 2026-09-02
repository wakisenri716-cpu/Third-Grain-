// Third Grain — 軽量インタラクション
(async () => {
  const nav = document.getElementById('siteNav');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const onScroll = () => {
    if (window.scrollY > 60) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // 最新情報(News)を microCMS から読み込んで描画する。
  // お知らせを更新したいときは、microCMSの管理画面(ニュース)でコンテンツを追加・編集するだけでよい。
  const MICROCMS_SERVICE = 'thirdgrain';
  const MICROCMS_ENDPOINT = 'news'; // microCMS管理画面のURL(/apis/news)で確認したエンドポイント名
  const MICROCMS_API_KEY = 'gK4E1t3mC15CN0FDIuvEdD8iqJtnXqv1Bbhk'; // GET専用キー

  const newsGrid = document.getElementById('newsGrid');
  const fallbackNews = [
    {
      date: '2026.08.20',
      tag: 'お知らせ',
      title: '【大切なお知らせ】タップルーム「Third Grain」がオープンしました！',
      excerpt: 'いつもBetter life with upcycleを応援いただきありがとうございます。（ダミーテキスト）',
      link: '#',
      thumb: 'a',
    },
    {
      date: '2026.07.28',
      tag: 'リリース情報',
      title: 'Strawberry Mint Aleをリリースしました',
      excerpt: '地元でファンも多い規格外いちごを使用したビールが完成しました。（ダミーテキスト）',
      link: '#',
      thumb: 'b',
    },
    {
      date: '2026.06.25',
      tag: 'リリース情報',
      title: '端材をアップサイクルした新作が誕生',
      excerpt: '今日はビッグプロジェクトのご報告です。（ダミーテキスト）',
      link: '#',
      thumb: 'c',
    },
  ];

  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));

  // 記事の飛び先を決める: linkに実URLが入っていればそれを外部リンクとして優先し、
  // 無ければ(microCMSのidがあれば)このサイト内の記事詳細ページへ飛ばす
  const getArticleHref = (item) => {
    const link = (item.link || '').trim();
    if (link && link !== '-' && link !== '#') return { href: link, external: true };
    if (item.id) return { href: `news-detail.html?id=${encodeURIComponent(item.id)}`, external: false };
    return { href: '#', external: false };
  };

  const renderNews = (items) => {
    if (!newsGrid) return;
    newsGrid.innerHTML = items
      .map((item, i) => {
        const thumb = item.thumbnailUrl
          ? `<img src="${escapeHtml(item.thumbnailUrl)}" alt="">`
          : '';
        const { href, external } = getArticleHref(item);
        const hrefAttr = escapeHtml(href);
        const targetAttr = external ? ' target="_blank" rel="noopener"' : '';
        return `
        <article class="news-card reveal-on-scroll" style="--reveal-delay:${Math.min(i * 90, 360)}ms">
          <a href="${hrefAttr}"${targetAttr} class="news-thumb thumb-${escapeHtml(item.thumb || 'a')}">${thumb}</a>
          <p class="news-meta">${escapeHtml(item.date)}　・　${escapeHtml(item.tag)}</p>
          <h3><a href="${hrefAttr}"${targetAttr}>${escapeHtml(item.title)}</a></h3>
          <p class="news-excerpt">${escapeHtml(item.excerpt)}</p>
          <a href="${hrefAttr}"${targetAttr} class="news-read">Read <span>→</span></a>
        </article>
      `;
      })
      .join('');
  };

  // microCMSのレスポンス(contents配列)をこのページが使う形に変換
  const mapMicroCmsItem = (c) => ({
    id: c.id || null,
    date: c.date || '',
    tag: c.tag || '',
    title: c.title || '',
    excerpt: c.excerpt || '',
    content: c.content || '',
    link: c.link || '#',
    thumb: c.thumb || 'a',
    thumbnailUrl: c.thumbnail && c.thumbnail.url ? c.thumbnail.url : null,
  });

  const loadNewsFromMicroCms = async () => {
    const url = `https://${MICROCMS_SERVICE}.microcms.io/api/v1/${encodeURIComponent(MICROCMS_ENDPOINT)}?limit=9`;
    const res = await fetch(url, {
      headers: { 'X-MICROCMS-API-KEY': MICROCMS_API_KEY },
    });
    if (!res.ok) throw new Error(`microCMS fetch failed: ${res.status}`);
    const data = await res.json();
    const items = Array.isArray(data.contents) ? data.contents.map(mapMicroCmsItem) : [];
    // date（例: 2026.08.20）の新しい順に並べ替え
    items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return items;
  };

  const loadNewsFromJsonFile = async () => {
    const res = await fetch('data/news.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`news.json fetch failed: ${res.status}`);
    const items = await res.json();
    return Array.isArray(items) ? items : [];
  };

  if (newsGrid) {
    let items = [];
    try {
      items = await loadNewsFromMicroCms();
    } catch (err) {
      try {
        // microCMSに届かない場合(ネットワーク不通・設定前など)はローカルJSONを試す
        items = await loadNewsFromJsonFile();
      } catch (err2) {
        // それも失敗したら埋め込みのダミーで表示を保つ
        items = [];
      }
    }
    renderNews(items.length ? items : fallbackNews);
  }

  // グリッド/リスト内の要素は少しずつ時間差で現れるようにする(News は描画時に設定済み)
  const staggerGroups = document.querySelectorAll('.concept-blocks, .product-grid');
  staggerGroups.forEach((group) => {
    Array.from(group.children).forEach((child, i) => {
      child.style.setProperty('--reveal-delay', `${Math.min(i * 90, 360)}ms`);
    });
  });

  // スクロールで要素をふわっと表示(News の動的カードも含めてここで観測対象にする)
  const targets = document.querySelectorAll('.reveal-on-scroll');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    targets.forEach((el) => io.observe(el));
  } else {
    targets.forEach((el) => el.classList.add('is-visible'));
  }

  // タップリストの自動横スクロール:中身を複製してシームレスにループさせる
  const track = document.getElementById('marqueeTrack');
  if (track) {
    const items = Array.from(track.children);
    items.forEach((item) => {
      track.appendChild(item.cloneNode(true));
    });
  }

  // スクロール進捗バー
  const progress = document.getElementById('scrollProgress');

  // ヒーローのパララックス(スクロールにあわせてロゴがゆっくり退場)
  const heroContent = document.querySelector('.hero-content');
  const heroEl = document.querySelector('.hero');

  let ticking = false;
  const updateOnScroll = () => {
    const scrollY = window.scrollY;

    if (progress) {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
      progress.style.width = `${pct}%`;
    }

    if (heroContent && heroEl && !prefersReducedMotion) {
      const heroHeight = heroEl.offsetHeight || 1;
      const ratio = Math.min(scrollY / heroHeight, 1);
      heroContent.style.transform = `translateY(${ratio * 60}px)`;
      heroContent.style.opacity = String(1 - ratio * 1.1);
    }

    ticking = false;
  };
  const onScrollMotion = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateOnScroll);
      ticking = true;
    }
  };
  window.addEventListener('scroll', onScrollMotion, { passive: true });
  updateOnScroll();
})();
