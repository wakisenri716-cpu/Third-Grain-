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

  // スマホ用ハンバーガーメニューの開閉
  const navToggle = document.getElementById('navToggle');
  if (nav && navToggle) {
    navToggle.addEventListener('click', () => {
      nav.classList.toggle('menu-open');
    });
    // メニュー内のリンクを押したら閉じる
    nav.querySelectorAll('.nav-links a').forEach((link) => {
      link.addEventListener('click', () => nav.classList.remove('menu-open'));
    });
  }

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

  // タップリスト(現在提供中のビール)を microCMS から読み込んで描画する。
  // 内容を変えたいときは、microCMSの管理画面(タップリスト)でコンテンツを追加・編集・削除するだけでよい。
  const MICROCMS_TAP_ENDPOINT = 'taplist'; // microCMS管理画面のURL(/apis/taplist)で確認したエンドポイント名
  const marqueeTrackEl = document.getElementById('marqueeTrack');
  const fallbackTapItems = [
    { number: '01', name: 'Bread Crust', image: 'assets/tap/01.jpg' },
    { number: '02', name: 'American Wheat', image: 'assets/tap/02.jpg' },
    { number: '03', name: 'India Pale Ale', image: 'assets/tap/03.jpg' },
    { number: '04', name: 'Pilsner', image: 'assets/tap/04.jpg' },
    { number: '05', name: 'Oriental Citrus Ale', image: 'assets/tap/05.jpg' },
    { number: '06', name: 'Strawberry Mint Ale', image: 'assets/tap/06.jpg' },
    { number: '07', name: '2nd Anniv. Sour DIPA', image: 'assets/tap/07.jpg' },
    { number: '08', name: 'Ume Maibock', image: 'assets/tap/08.jpg' },
  ];

  const renderTapList = (items) => {
    if (!marqueeTrackEl) return;
    marqueeTrackEl.innerHTML = items
      .map((item) => `
        <figure class="tap-item">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy">
          <figcaption><span class="tap-num">${escapeHtml(item.number)}</span><span class="tap-name">${escapeHtml(item.name)}</span></figcaption>
        </figure>
      `)
      .join('');
  };

  const mapMicroCmsTapItem = (c, i) => ({
    number: c.number || String(i + 1).padStart(2, '0'),
    name: c.name || '',
    image: (c.image && c.image.url) || '',
  });

  const loadTapListFromMicroCms = async () => {
    const url = `https://${MICROCMS_SERVICE}.microcms.io/api/v1/${MICROCMS_TAP_ENDPOINT}?limit=20`;
    const res = await fetch(url, { headers: { 'X-MICROCMS-API-KEY': MICROCMS_API_KEY } });
    if (!res.ok) throw new Error(`taplist fetch failed: ${res.status}`);
    const data = await res.json();
    const items = Array.isArray(data.contents) ? data.contents.map(mapMicroCmsTapItem) : [];
    // 追加順ではなく、number欄(01,02...)の数字が小さい順に並べる
    items.sort((a, b) => (parseInt(a.number, 10) || 0) - (parseInt(b.number, 10) || 0));
    return items.filter((item) => item.image); // 画像未設定のものは表示しない
  };

  if (marqueeTrackEl) {
    let tapItems = [];
    try {
      tapItems = await loadTapListFromMicroCms();
    } catch (err) {
      // microCMSに未設定・接続エラーの場合は埋め込みのダミーで表示を保つ
      tapItems = [];
    }
    renderTapList(tapItems.length ? tapItems : fallbackTapItems);
  }

  // タップリストの自動横スクロール:中身を複製してシームレスにループさせつつ、
  // 指でのスワイプ操作(ネイティブスクロール)ともぶつからないようscrollLeftを直接動かす
  const track = document.getElementById('marqueeTrack');
  const marqueeEl = document.querySelector('.marquee');
  if (track && marqueeEl) {
    const items = Array.from(track.children);
    items.forEach((item) => {
      track.appendChild(item.cloneNode(true));
    });

    if (!prefersReducedMotion) {
      const SPEED_PX_PER_SEC = 55;
      let halfWidth = track.scrollWidth / 2;
      let paused = false;
      let resumeTimer = null;
      let lastTime = null;
      let lastSetScrollLeft = marqueeEl.scrollLeft;

      const recalc = () => { halfWidth = track.scrollWidth / 2; };
      window.addEventListener('resize', recalc, { passive: true });
      // 画像の読み込みが遅れて幅が後から変わるケース(主にスマホの回線)にも追従する
      track.querySelectorAll('img').forEach((img) => {
        if (!img.complete) img.addEventListener('load', recalc, { once: true });
      });

      const pause = () => {
        paused = true;
        if (resumeTimer) clearTimeout(resumeTimer);
      };
      const scheduleResume = () => {
        if (resumeTimer) clearTimeout(resumeTimer);
        resumeTimer = setTimeout(() => { paused = false; lastTime = null; }, 1200);
      };

      // 手で触っている間・触った直後はオートスクロールを止めて、操作とぶつからないようにする
      marqueeEl.addEventListener('pointerdown', pause, { passive: true });
      marqueeEl.addEventListener('pointerup', scheduleResume, { passive: true });
      marqueeEl.addEventListener('pointercancel', scheduleResume, { passive: true });
      marqueeEl.addEventListener('touchstart', pause, { passive: true });
      marqueeEl.addEventListener('touchend', scheduleResume, { passive: true });
      marqueeEl.addEventListener('wheel', () => { pause(); scheduleResume(); }, { passive: true });

      // ホバー(マウス)操作ができる端末でだけ、マウスが乗っている間止める。
      // スマホ(タッチ)ではmouseenterだけ発火してmouseleaveが来ず、
      // 自動スクロールが止まったまま戻らなくなる不具合があったため、実マウス限定にする
      const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (supportsHover) {
        marqueeEl.addEventListener('mouseenter', pause);
        marqueeEl.addEventListener('mouseleave', scheduleResume);
      }

      // 上記のイベントで拾いきれない操作(慣性スクロール中など)の保険として、
      // 「自分で書き込んだ値ではないscrollLeftの変化」=ユーザー操作とみなして一時停止する
      marqueeEl.addEventListener('scroll', () => {
        if (Math.abs(marqueeEl.scrollLeft - lastSetScrollLeft) > 1) {
          pause();
          scheduleResume();
        }
      }, { passive: true });

      const step = (timestamp) => {
        if (lastTime === null) lastTime = timestamp;
        const dt = timestamp - lastTime;
        lastTime = timestamp;

        if (!paused && halfWidth > 0) {
          marqueeEl.scrollLeft += (SPEED_PX_PER_SEC * dt) / 1000;
        }
        // シームレスループ:複製した後半に達したら/手前に戻ったら折り返す
        if (halfWidth > 0) {
          if (marqueeEl.scrollLeft >= halfWidth) {
            marqueeEl.scrollLeft -= halfWidth;
          } else if (marqueeEl.scrollLeft < 0) {
            marqueeEl.scrollLeft += halfWidth;
          }
        }
        lastSetScrollLeft = marqueeEl.scrollLeft;
        window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    }
  }

  // カレンダー(Events):microCMSの「events」から出店・イベント予定を読み込んで
  // 月表示カレンダー + 直近の予定リストを描画する
  const calGrid = document.getElementById('calGrid');
  if (calGrid) {
    const CAL_SERVICE = MICROCMS_SERVICE; // カレンダーもNewsと同じthirdgrainサービス内のAPI
    const CAL_ENDPOINT = 'events';
    const CAL_API_KEY = MICROCMS_API_KEY;
    const monthLabel = document.getElementById('calMonthLabel');
    const modalBackdrop = document.getElementById('calModalBackdrop');
    const detailEl = document.getElementById('calDetail');
    const prevBtn = document.getElementById('calPrev');
    const nextBtn = document.getElementById('calNext');

    let events = [];
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const parseDate = (s) => {
      if (!s) return null;
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };
    const stripTime = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    const inRange = (day, start, end) => {
      const d0 = stripTime(day);
      const s0 = stripTime(start);
      const e0 = end ? stripTime(end) : s0;
      return d0 >= s0 && d0 <= e0;
    };
    const fmtRange = (start, end) => {
      const f = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
      if (!end || sameDay(start, end)) return f(start);
      return `${f(start)}〜${f(end)}`;
    };

    // 日付をクリックしたら、その予定をポップアップ(モーダル)で表示する
    const closeDetail = () => {
      if (modalBackdrop) modalBackdrop.hidden = true;
    };

    const showDetail = (ev) => {
      detailEl.innerHTML = `
        <button type="button" class="calendar-detail-close" id="calDetailClose" aria-label="閉じる">×</button>
        <h4>${escapeHtml(ev.title)}</h4>
        <p>${fmtRange(ev.start, ev.end)}${ev.location ? '　・　' + escapeHtml(ev.location) : ''}</p>
        ${ev.note ? `<p>${escapeHtml(ev.note)}</p>` : ''}
        ${ev.link ? `<p><a href="${escapeHtml(ev.link)}" target="_blank" rel="noopener">詳しく見る →</a></p>` : ''}
      `;
      if (modalBackdrop) modalBackdrop.hidden = false;
      const closeBtn = document.getElementById('calDetailClose');
      if (closeBtn) closeBtn.addEventListener('click', closeDetail);
    };

    // 背景クリック・Escapeキーでも閉じられるようにする
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeDetail();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalBackdrop && !modalBackdrop.hidden) closeDetail();
    });

    const renderMonth = () => {
      monthLabel.textContent = `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`;
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const startWeekday = firstDay.getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const today = stripTime(new Date());

      const dows = ['日', '月', '火', '水', '木', '金', '土'];
      let html = dows.map((d) => `<div class="calendar-dow">${d}</div>`).join('');

      for (let i = 0; i < startWeekday; i++) {
        html += '<div class="calendar-day"></div>';
      }
      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const dayEvents = events.filter((ev) => inRange(dateObj, ev.start, ev.end));
        const classes = ['calendar-day', 'is-current-month'];
        if (dayEvents.length) classes.push('has-event');
        if (sameDay(dateObj, today)) classes.push('is-today');
        const extra = dayEvents.length - 1;
        html += `<div class="${classes.join(' ')}" ${dayEvents.length ? `data-index="${events.indexOf(dayEvents[0])}"` : ''}>
          <span>${day}</span>
          ${dayEvents.length ? `<span class="calendar-day-title">${escapeHtml(dayEvents[0].title)}</span>` : ''}
          ${extra > 0 ? `<span class="calendar-day-more">+${extra}</span>` : ''}
        </div>`;
      }
      calGrid.innerHTML = html;
      calGrid.querySelectorAll('.calendar-day.has-event').forEach((el) => {
        el.addEventListener('click', () => showDetail(events[Number(el.dataset.index)]));
      });
    };

    if (prevBtn) prevBtn.addEventListener('click', () => { currentMonth.setMonth(currentMonth.getMonth() - 1); renderMonth(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { currentMonth.setMonth(currentMonth.getMonth() + 1); renderMonth(); });

    (async () => {
      try {
        const url = `https://${CAL_SERVICE}.microcms.io/api/v1/${CAL_ENDPOINT}?limit=100`;
        const res = await fetch(url, { headers: { 'X-MICROCMS-API-KEY': CAL_API_KEY } });
        if (!res.ok) throw new Error(`events fetch failed: ${res.status}`);
        const data = await res.json();
        events = (Array.isArray(data.contents) ? data.contents : [])
          .map((c) => ({
            title: c.title || '',
            start: parseDate(c.startDate),
            end: parseDate(c.endDate) || parseDate(c.startDate),
            location: c.location || '',
            note: c.note || '',
            link: c.link || '',
          }))
          .filter((ev) => ev.start);
      } catch (err) {
        events = [];
      }
      renderMonth();
    })();
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
