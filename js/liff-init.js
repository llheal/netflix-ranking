/**
 * liff-init.js — LINE LIFF SDK initialization
 * Graceful fallback for non-LINE browsers (development mode)
 */

(function initLiff() {
    // Get LIFF ID from meta tag or default
    const liffId = document.querySelector('meta[name="liff-id"]')?.content || '';

    if (!liffId || liffId === 'your_liff_id_here') {
        console.log('[LIFF] No LIFF ID configured. Running in standalone mode.');
        return;
    }

    if (typeof liff === 'undefined') {
        console.warn('[LIFF] LIFF SDK not loaded.');
        return;
    }

    liff.init({ liffId })
        .then(() => {
            console.log('[LIFF] Initialized successfully.');
            console.log('[LIFF] Running in LINE:', liff.isInClient());
            console.log('[LIFF] OS:', liff.getOS());

            // If not logged in, redirect
            if (!liff.isLoggedIn()) {
                // Optional: auto-login
                // liff.login();
            }
        })
        .catch((err) => {
            console.error('[LIFF] Init failed:', err);
            // App continues to work without LIFF
        });
})();
