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
      return `
              <div class="imdb-badge">
                <span class="imdb-label">IMDb</span>
                <span class="imdb-score">${item.imdbScore.toFixed(1)}</span>
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
    const genreTags = (item.genres || []).slice(0, 2).map(g =>
      `<span class="card-genre-tag">${genreLabel(g)}</span>`
    ).join('');

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
        <div class="card-genres">${genreTags}</div>
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
    const imdbSection = (item.imdbScore && item.imdbScore > 0)
      ? `<div class="modal-imdb">
                <span class="label">IMDb</span>
                <span class="score">${item.imdbScore.toFixed(1)}</span>
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
            <span class="modal-date">#${rank}位 ${dateStr ? `• 配信: ${dateStr}` : ''}</span>
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
  }

  function closeModal(overlay) {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 400);
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
