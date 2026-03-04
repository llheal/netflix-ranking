/**
 * components.js — UI rendering components
 * Card rendering, genre pills, skeleton loaders, detail modal
 */

const Components = (() => {

  /** Genre name → Japanese label mapping */
  const GENRE_MAP = {
    'Action': 'アクション',
    'Animation': 'アニメーション',
    'Anime': 'アニメ',
    'Comedy': 'コメディ',
    'Crime': '犯罪',
    'Documentary': 'ドキュメンタリー',
    'Drama': 'ドラマ',
    'Family': 'ファミリー',
    'Fantasy': 'ファンタジー',
    'Horror': 'ホラー',
    'Independent': 'インディーズ',
    'Musical': 'ミュージカル',
    'Reality': 'リアリティ',
    'Romance': 'ロマンス',
    'Sci-Fi': 'SF',
    'Stand-up': 'スタンドアップ',
    'Thriller': 'スリラー',
    'Western': '西部劇',
    'Other': 'その他'
  };

  /**
   * Get Japanese genre label or fallback to original
   */
  function genreLabel(genre) {
    return GENRE_MAP[genre] || genre;
  }

  /**
   * Render IMDb badge — shows score or "未評価" for unrated
   */
  function renderImdbBadge(item) {
    if (item.imdbScore && item.imdbScore > 0) {
      let votesText = '';
      if (item.imdbVotes && item.imdbVotes > 0) {
        if (item.imdbVotes >= 10000) {
          votesText = `<span class="imdb-votes">${(item.imdbVotes / 10000).toFixed(1)}万件</span>`;
        } else {
          votesText = `<span class="imdb-votes">${item.imdbVotes.toLocaleString()}件</span>`;
        }
      }
      return `
            <div class="imdb-badge">
              <span class="imdb-label">IMDb</span>
              <span class="imdb-score">${item.imdbScore.toFixed(1)}</span>
              ${votesText}
            </div>`;
    }
    return `
        <div class="imdb-badge no-score">
          <span class="imdb-label">IMDb</span>
          <span class="imdb-score">—</span>
        </div>`;
  }

  /**
   * Render a single movie card
   */
  function renderCard(item, rank) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.setAttribute('data-id', item.id);
    card.style.animationDelay = `${Math.min(rank * 0.04, 0.4)}s`;

    const rankClass = rank <= 3 ? 'top-3' : (rank <= 10 ? 'top-10' : '');
    const typeClass = item.type === 'series' ? 'series' : 'movie';
    const typeLabel = item.type === 'series' ? 'シリーズ' : '映画';
    // Netflix release date label for card
    let dateTag = '';
    if (item.netflixDate) {
      const d = new Date(item.netflixDate);
      const now = new Date();
      const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
      if (diffDays <= 30) {
        dateTag = `<span class="card-genre-tag new-release">🆕 新着</span>`;
      } else {
        const yy = d.getFullYear();
        const mm = d.getMonth() + 1;
        dateTag = `<span class="card-genre-tag">配信: ${yy}/${mm}</span>`;
      }
    }

    card.innerHTML = `
      <div class="rank-badge ${rankClass}">${rank}</div>
      <span class="type-badge ${typeClass}">${typeLabel}</span>
      <div class="card-poster">
        ${item.poster
        ? `<img src="${item.poster}" alt="${item.title}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'"><span class="poster-placeholder" style="display:none">🎬</span>`
        : `<span class="poster-placeholder">🎬</span>`
      }
      </div>
      <div class="card-info">
        <div class="card-title">${item.title}</div>
        ${item.titleJa && item.titleJa !== item.title ? `<div class="card-title-ja">${item.titleJa}</div>` : ''}
        ${renderImdbBadge(item)}
        <div class="card-genres">${item.year ? `<span class="card-genre-tag">${item.year}年</span>` : ''}${dateTag}</div>
      </div>
    `;

    card.addEventListener('click', () => openDetailModal(item, rank));

    return card;
  }

  /**
   * Append multiple cards to a container
   */
  function renderCardList(items, container, startRank = 1) {
    items.forEach((item, index) => {
      const card = renderCard(item, startRank + index);
      container.appendChild(card);
    });
  }

  /**
   * Render genre pill buttons
   */
  function renderGenrePills(genres, container, activeGenre, onSelect) {
    container.innerHTML = '';

    // "All" pill
    const allPill = document.createElement('button');
    allPill.className = `genre-pill ${!activeGenre ? 'active' : ''}`;
    allPill.textContent = 'すべて';
    allPill.addEventListener('click', () => onSelect(null));
    container.appendChild(allPill);

    genres.forEach(genre => {
      const pill = document.createElement('button');
      pill.className = `genre-pill ${activeGenre === genre ? 'active' : ''}`;
      pill.textContent = genreLabel(genre);
      pill.setAttribute('data-genre', genre);
      pill.addEventListener('click', () => onSelect(genre));
      container.appendChild(pill);
    });
  }

  function showSkeleton() {
    const skeleton = document.getElementById('loading-skeleton');
    if (skeleton) skeleton.classList.remove('hidden');
  }

  function hideSkeleton() {
    const skeleton = document.getElementById('loading-skeleton');
    if (skeleton) skeleton.classList.add('hidden');
  }

  function showEmpty(message, subtext) {
    const empty = document.getElementById('empty-state');
    if (empty) {
      empty.classList.remove('hidden');
      if (message) empty.querySelector('.empty-text').textContent = message;
      if (subtext) empty.querySelector('.empty-subtext').textContent = subtext;
    }
  }

  function hideEmpty() {
    const empty = document.getElementById('empty-state');
    if (empty) empty.classList.add('hidden');
  }

  /**
   * Open detail modal for a title
   */
  function openDetailModal(item, rank) {
    // Remove existing modal
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    const typeLabel = item.type === 'series' ? 'シリーズ' : '映画';
    const dateStr = item.netflixDate ? new Date(item.netflixDate).toLocaleDateString('ja-JP') : '';
    const genreTags = (item.genres || []).map(g =>
      `<span class="modal-genre-tag">${genreLabel(g)}</span>`
    ).join('');

    // IMDb section for modal
    let modalVotes = '';
    if (item.imdbVotes && item.imdbVotes > 0) {
      modalVotes = item.imdbVotes >= 10000
        ? `<span class="modal-imdb-votes">(${(item.imdbVotes / 10000).toFixed(1)}万件)</span>`
        : `<span class="modal-imdb-votes">(${item.imdbVotes.toLocaleString()}件)</span>`;
    }
    const imdbSection = (item.imdbScore && item.imdbScore > 0)
      ? `<div class="modal-imdb">
                <span class="label">IMDb</span>
                <span class="score">${item.imdbScore.toFixed(1)}</span>
                ${modalVotes}
               </div>`
      : `<div class="modal-imdb no-score">
                <span class="label">IMDb</span>
                <span class="score">未評価</span>
               </div>`;

    // Synopsis
    const synopsisSection = item.synopsis
      ? `<div class="modal-synopsis">${item.synopsis}</div>`
      : '';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-poster">
          ${item.poster
        ? `<img src="${item.poster}" alt="${item.title}">`
        : ''
      }
          <button class="modal-close" id="modal-close-btn">✕</button>
        </div>
        <div class="modal-body">
          <div class="modal-title">${item.title}</div>
          ${item.titleJa && item.titleJa !== item.title
        ? `<div class="modal-title-ja">${item.titleJa}</div>`
        : ''
      }
          <div class="modal-meta">
            ${imdbSection}
            <span class="modal-type">${typeLabel}</span>
            <span class="modal-date">#${rank}位 ${item.year ? `• ${item.year}年` : ''} ${dateStr ? `• 配信: ${dateStr}` : ''}</span>
          </div>
          <div class="modal-genres">${genreTags}</div>
          ${synopsisSection}
          <div class="modal-links">
            <a href="https://www.netflix.com/title/${item.id}" target="_blank" rel="noopener" class="modal-link-btn netflix">
              ▶ Netflixで観る
            </a>
            ${item.imdbId ? `
              <a href="https://www.imdb.com/title/${item.imdbId}" target="_blank" rel="noopener" class="modal-link-btn imdb">
                IMDb詳細
              </a>
            ` : ''}
          </div>
          <button class="modal-link-btn share" id="modal-share-btn">
            📤 友だちに共有
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });

    overlay.querySelector('#modal-close-btn').addEventListener('click', () => closeModal(overlay));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay);
    });

    // Share button
    overlay.querySelector('#modal-share-btn').addEventListener('click', () => {
      shareToLINE(item, rank);
    });
  }

  function closeModal(overlay) {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 400);
  }

  /**
   * Share a movie recommendation to LINE friends via LIFF shareTargetPicker
   */
  function shareToLINE(item, rank) {
    const displayTitle = item.titleJa || item.title;
    const scoreText = item.imdbScore ? `IMDb ${item.imdbScore}` : '未評価';
    const miniAppUrl = 'https://miniapp.line.me/2009310517-1zqDTtPq';
    const description = `#${rank}位 ${scoreText} — Netflix 評価ランキング`;

    // Check LIFF availability
    if (typeof liff !== 'undefined' && liff.isApiAvailable && liff.isApiAvailable('shareTargetPicker')) {
      liff.shareTargetPicker([{
        type: 'flex',
        altText: `🎬 ${displayTitle} をおすすめ！ ${description}`,
        contents: {
          type: 'bubble',
          size: 'mega',
          header: {
            type: 'box', layout: 'vertical',
            contents: [{ type: 'text', text: '🎬 Netflix おすすめ', weight: 'bold', size: 'lg', color: '#E50914' }],
            backgroundColor: '#141414', paddingAll: '12px',
          },
          body: {
            type: 'box', layout: 'vertical',
            contents: [
              { type: 'text', text: displayTitle, weight: 'bold', size: 'xl', wrap: true },
              { type: 'text', text: description, size: 'sm', color: '#999999', margin: 'md', wrap: true },
            ],
          },
          footer: {
            type: 'box', layout: 'vertical',
            contents: [{
              type: 'button',
              action: { type: 'uri', label: '🎬 ランキングを見る', uri: miniAppUrl },
              style: 'primary', color: '#E50914',
            }],
            paddingAll: '10px',
          },
        },
      }]).catch(err => console.error('[Share] Error:', err));
    } else if (navigator.share) {
      navigator.share({
        title: `${displayTitle} — Netflix 評価ランキング`,
        text: description,
        url: miniAppUrl,
      }).catch(() => { });
    } else {
      alert('LINEアプリ内で共有機能をご利用ください');
    }
  }

  return {
    renderCard,
    renderCardList,
    renderGenrePills,
    showSkeleton,
    hideSkeleton,
    showEmpty,
    hideEmpty,
    openDetailModal,
    genreLabel
  };
})();
