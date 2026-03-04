/**
 * app.js — Main application logic
 * Tab switching, type filter, score range filter, infinite scroll, state management
 */

const App = (() => {
    // State
    const state = {
        currentTab: 'global',
        currentType: 'all',     // 'all', 'movie', 'series'
        scoreRange: 'all',      // 'all', 'none', '0-5', '5-6', '6-7', '7-8', '8-9', '9-10'
        page: 1,
        limit: 20,
        loading: false,
        hasMore: true,
        totalItems: 0,
        // Tab-specific
        newArrivalsDays: 7,
        selectedGenre: null,
        searchQuery: '',
        genres: []
    };

    // DOM refs
    let cardGrid, scrollSentinel, resultsText, searchInput, searchClear;
    let observer;

    /**
     * Get current filters object for API calls
     */
    function getFilters() {
        return { scoreRange: state.scoreRange };
    }

    /**
     * Initialize the app
     */
    async function init() {
        // Cache DOM references
        cardGrid = document.getElementById('card-grid');
        scrollSentinel = document.getElementById('scroll-sentinel');
        resultsText = document.getElementById('results-text');
        searchInput = document.getElementById('search-input');
        searchClear = document.getElementById('search-clear');

        // Tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        // Type filter buttons
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', () => switchType(btn.dataset.type));
        });

        // Score range filter chips
        document.querySelectorAll('.score-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                state.scoreRange = chip.dataset.scoreRange || 'all';
                document.querySelectorAll('.score-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                resetAndLoad();
            });
        });

        // Period selector
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.newArrivalsDays = parseInt(btn.dataset.days);
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                resetAndLoad();
            });
        });

        // Search
        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => {
                state.searchQuery = searchInput.value.trim();
                searchClear.classList.toggle('hidden', !state.searchQuery);
                resetAndLoad();
            }, 350));
        }

        if (searchClear) {
            searchClear.addEventListener('click', () => {
                searchInput.value = '';
                state.searchQuery = '';
                searchClear.classList.add('hidden');
                resetAndLoad();
            });
        }

        // Header scroll effect
        window.addEventListener('scroll', () => {
            const header = document.getElementById('app-header');
            if (header) {
                header.classList.toggle('scrolled', window.scrollY > 10);
            }
        });

        // IntersectionObserver for infinite scroll
        setupInfiniteScroll();

        // Load initial data
        await loadGenres();
        await loadData();
        await updateStatus();
    }

    /**
     * Switch active tab
     */
    function switchTab(tab) {
        if (tab === state.currentTab) return;
        state.currentTab = tab;

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        toggleElement('search-bar', tab === 'search');
        toggleElement('genre-pills', tab === 'category');
        toggleElement('period-selector', tab === 'new');

        if (tab === 'search' && searchInput) {
            setTimeout(() => searchInput.focus(), 100);
        }
        resetAndLoad();
    }

    /**
     * Switch type filter
     */
    function switchType(type) {
        if (type === state.currentType) return;
        state.currentType = type;

        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });

        resetAndLoad();
    }

    /**
     * Reset pagination and load fresh
     */
    async function resetAndLoad() {
        state.page = 1;
        state.hasMore = true;
        cardGrid.innerHTML = '';
        scrollSentinel.classList.remove('done');
        Components.hideEmpty();
        await loadData();
    }

    /**
     * Load data based on current tab, type, and score range
     */
    async function loadData() {
        if (state.loading || !state.hasMore) return;
        state.loading = true;

        if (state.page === 1) {
            Components.showSkeleton();
        }

        try {
            let result;
            const type = state.currentType;
            const filters = getFilters();

            switch (state.currentTab) {
                case 'global':
                    result = await API.getRankings(state.page, state.limit, type, filters);
                    break;
                case 'new':
                    result = await API.getNewArrivals(state.newArrivalsDays, state.page, state.limit, type, filters);
                    break;
                case 'category':
                    if (state.selectedGenre) {
                        result = await API.getGenreRankings(state.selectedGenre, state.page, state.limit, type, filters);
                    } else {
                        result = await API.getRankings(state.page, state.limit, type, filters);
                    }
                    break;
                case 'search':
                    if (!state.searchQuery) {
                        Components.hideSkeleton();
                        state.loading = false;
                        updateResultsInfo(0);
                        return;
                    }
                    result = await API.search(state.searchQuery, state.page, state.limit, type, filters);
                    break;
            }

            Components.hideSkeleton();

            if (result && result.items) {
                const startRank = (state.page - 1) * state.limit + 1;
                Components.renderCardList(result.items, cardGrid, startRank);
                state.hasMore = result.hasMore;
                state.totalItems = result.total;
                state.page++;

                updateResultsInfo(result.total);

                if (!result.hasMore) {
                    scrollSentinel.classList.add('done');
                }

                if (result.total === 0 && state.page === 2) {
                    Components.showEmpty();
                }
            }
        } catch (err) {
            console.error('[App] Load error:', err);
            Components.hideSkeleton();
            if (state.page === 1) {
                Components.showEmpty('データの読み込みに失敗しました', '接続を確認してもう一度お試しください');
            }
        }

        state.loading = false;
    }

    /**
     * Load available genres
     */
    async function loadGenres() {
        try {
            const data = await API.getGenres();
            state.genres = data.genres || [];
            const container = document.getElementById('genre-pills');
            if (container) {
                function onGenreSelect(genre) {
                    state.selectedGenre = genre;
                    Components.renderGenrePills(state.genres, container, genre, onGenreSelect);
                    resetAndLoad();
                }
                Components.renderGenrePills(state.genres, container, state.selectedGenre, onGenreSelect);
            }
        } catch (err) {
            console.error('[App] Genre load error:', err);
        }
    }

    /**
     * Update header status
     */
    async function updateStatus() {
        try {
            const status = await API.getStatus();
            const countEl = document.getElementById('total-count');
            if (countEl) {
                countEl.textContent = `${status.totalTitles} 作品`;
            }
        } catch (err) {
            // Silent fail
        }
    }

    /**
     * Update results info text
     */
    function updateResultsInfo(total) {
        if (!resultsText) return;
        const typeLabels = { all: '', movie: '映画', series: 'シリーズ' };
        const typeLabel = typeLabels[state.currentType] || '';
        const tabLabels = {
            global: '総合ランキング',
            new: `新着（${state.newArrivalsDays}日）`,
            category: state.selectedGenre
                ? `${Components.genreLabel(state.selectedGenre)} ランキング`
                : '全カテゴリ',
            search: state.searchQuery
                ? `「${state.searchQuery}」の検索結果`
                : '検索'
        };
        const prefix = typeLabel ? `${typeLabel} ` : '';

        // Score range description
        const rangeLabels = {
            'all': '',
            'none': ' 未評価',
            '0-5': ' IMDb ~5',
            '5-6': ' IMDb 5~6',
            '6-7': ' IMDb 6~7',
            '7-8': ' IMDb 7~8',
            '8-9': ' IMDb 8~9',
            '9-10': ' IMDb 9+'
        };
        const scoreDesc = rangeLabels[state.scoreRange] || '';
        resultsText.textContent = `${prefix}${tabLabels[state.currentTab]}${scoreDesc} — ${total}件`;
    }

    /**
     * Setup IntersectionObserver for infinite scroll
     */
    function setupInfiniteScroll() {
        observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !state.loading && state.hasMore) {
                    loadData();
                }
            });
        }, {
            rootMargin: '200px'
        });

        if (scrollSentinel) {
            observer.observe(scrollSentinel);
        }
    }

    function toggleElement(id, show) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', !show);
    }

    function debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    // Auto-init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { switchTab, switchType, state };
})();
