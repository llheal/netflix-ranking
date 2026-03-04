/**
 * api.js — Backend API client
 * Fetch wrapper for all backend endpoints with error handling
 */

const API = (() => {
    // Production: VPS backend, Development: local server
    const BASE_URL = window.location.hostname === 'localhost'
        ? window.location.origin
        : 'https://netflix.km-studio.top';

    /**
     * Generic fetch with retry logic
     */
    async function request(endpoint, retries = 2) {
        const url = `${BASE_URL}${endpoint}`;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return await res.json();
            } catch (err) {
                if (attempt === retries) {
                    console.error(`[API] Failed: ${endpoint}`, err);
                    throw err;
                }
                await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
            }
        }
    }

    /**
     * Build filter query string parts
     */
    function filterParams(type, filters = {}) {
        let params = '';
        if (type && type !== 'all') params += `&type=${type}`;
        if (filters.scoreRange && filters.scoreRange !== 'all') {
            params += `&scoreRange=${filters.scoreRange}`;
        }
        if (filters.yearRange && filters.yearRange !== 'all') {
            params += `&yearRange=${filters.yearRange}`;
        }
        if (filters.votesMin && filters.votesMin !== 'all') {
            params += `&votesMin=${filters.votesMin}`;
        }
        if (filters.country && filters.country !== 'all') {
            params += `&country=${filters.country}`;
        }
        if (filters.sortBy && filters.sortBy !== 'score_desc') {
            params += `&sortBy=${filters.sortBy}`;
        }
        return params;
    }

    return {
        getRankings(page = 1, limit = 20, type = 'all', filters = {}) {
            return request(`/api/rankings?page=${page}&limit=${limit}${filterParams(type, filters)}`);
        },

        getNewArrivals(days = 30, page = 1, limit = 20, type = 'all', filters = {}) {
            return request(`/api/rankings/new?days=${days}&page=${page}&limit=${limit}${filterParams(type, filters)}`);
        },

        getGenres() {
            return request('/api/genres');
        },

        getGenreRankings(genre, page = 1, limit = 20, type = 'all', filters = {}) {
            return request(`/api/rankings/genre/${encodeURIComponent(genre)}?page=${page}&limit=${limit}${filterParams(type, filters)}`);
        },

        search(query, page = 1, limit = 20, type = 'all', filters = {}) {
            return request(`/api/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}${filterParams(type, filters)}`);
        },

        getStatus() {
            return request('/api/status');
        }
    };
})();
