// ==UserScript==
// @name        【月白】Tobii Bonanza Stats
// @description A tool to check status from Tobii Bonanza.
// @author      星空優月 & 💟 めぐ 🍫 みん (Megumin 💥) 💟
// @iconURL     https://engage.tobii.gg/favicon.ico
// @match       *://engage.tobii.gg/*
// @grant       none
// @run-at      document-start
// @version     0.1
// ==/UserScript==

(function () {
    'use strict';

    const state = {
        endAt: null,
        points: null,
        watched: null,
        sweepName: null,};
    const captured = {
        authToken: null,
        slug: null,
        baseUrl: null,};
    const POLL_INTERVAL_MS = 60 * 60 * 1000;
    let countdownTimer = null;
    let pollTimer      = null;
    const _origFetch = window.fetch.bind(window);
    window.fetch = async function (input, init) {
        let url = '';
        let headers = null;
        if (typeof input === 'string') {
            url = input;
            headers = init?.headers;
        } else if (input instanceof Request) {
            url = input.url;
            headers = input.headers;
        } else if (input && typeof input === 'object' && input.url) {
            url = input.url;
            headers = input.headers || init?.headers;
        }

        const response = await _origFetch(input, init);
        if (url.includes('/api/sweepstake/') && !captured.authToken) {
            let auth = '';
            if (headers) {
                if (typeof headers.get === 'function') {
                    auth = headers.get('authorization') || headers.get('Authorization');
                } else {
                    auth = headers.authorization || headers.Authorization;}}

            if (auth) {
                captured.authToken = auth;
                const slugMatch = url.match(/\/sweepstake\/([^\/]+)\//)
                captured.slug    = slugMatch ? slugMatch[1] : null;
                captured.baseUrl = url.split('/api/')[0];
                schedulePoll();}}

        if (response.ok) {
            if (url.includes('/status')) {
                response.clone().json().then(handleStatus).catch(e => console.warn('Status JSON fail:', e));
            } else if (url.includes('/watched')) {
                response.clone().json().then(handleWatched).catch(e => console.warn('Watched JSON fail:', e));}}
        return response;};

    const _origXHROpen = XMLHttpRequest.prototype.open;
    const _origXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url;
        return _origXHROpen.apply(this, arguments);};
    XMLHttpRequest.prototype.send = function() {
        this.addEventListener('load', function() {
            const url = this._url || '';
            if (url.includes('/api/sweepstake/')) {
                try {
                    const data = JSON.parse(this.responseText);
                    if (url.includes('/status')) handleStatus(data);
                    if (url.includes('/watched')) handleWatched(data);
                } catch (e) {}}});
        return _origXHRSend.apply(this, arguments);};

    function handleStatus(data) {
        if (!data) return;
        if (data.sweepstake) {
            state.endAt     = data.sweepstake.endAt ?? null;
            state.sweepName = data.sweepstake.name  ?? 'Sweepstake';}
        if (data.participant) {
            state.points = data.participant.points ?? 0;}
        renderWidget();}

    function handleWatched(data) {
        if (!data) return;
        if (data.totalWatched !== undefined) {state.watched = data.totalWatched;}
        renderWidget();}

    async function pollNow() {
        if (!captured.authToken || !captured.slug || !captured.baseUrl) return;
        const base    = captured.baseUrl;
        const slug    = captured.slug;
        const headers = {
            'accept': '*/*',
            'authorization': captured.authToken,
            'cache-control': 'no-cache',
            'pragma': 'no-cache',};
        const opts = { method: 'GET', mode: 'cors', credentials: 'include', headers };

        try {
            const [statusRes, watchedRes] = await Promise.all([
                _origFetch(`${base}/api/sweepstake/${slug}/status`,  opts),
                _origFetch(`${base}/api/sweepstake/${slug}/watched`, opts),]);
            if (statusRes.ok) statusRes.json().then(handleStatus).catch(() => {});
            if (watchedRes.ok) watchedRes.json().then(handleWatched).catch(() => {});
            updateLastRefresh();} catch (e) {console.warn('Poll failed:', e);}}

    function schedulePoll() {
        if (pollTimer) return;
        pollTimer = setInterval(pollNow, POLL_INTERVAL_MS);}

    function updateLastRefresh() {
        const el = document.getElementById('tw-last-refresh');
        if (el) el.textContent = new Date().toLocaleTimeString();}

    function injectStyles() {
        if (document.getElementById('tobii-widget-styles')) return;
        const style = document.createElement('style');
        style.id = 'tobii-widget-styles';
        style.textContent = `
            #tobii-widget {position: fixed !important;top: 50% !important;right: 20px !important;transform: translateY(-50%) !important;z-index: 2147483647 !important;width: 240px !important;background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 60%, #16213e 100%) !important;border: 1px solid rgba(99, 179, 255, 0.25) !important;border-radius: 16px !important;padding: 16px 18px 14px !important;font-family: 'Segoe UI', system-ui, sans-serif !important;color: #e2e8f0 !important;box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,179,255,0.08) inset !important;backdrop-filter: blur(12px) !important;user-select: none !important;opacity: 1;transition: opacity 0.3s;display: block !important;visibility: visible !important;}
            #tobii-widget:hover { opacity: 1 !important; }
            #tobii-widget-header {display: flex !important;align-items: center !important;justify-content: space-between !important;margin-bottom: 12px !important;}
            #tobii-widget-title {font-size: 11px !important;font-weight: 700 !important;letter-spacing: 0.08em !important;text-transform: uppercase !important;color: #63b3ff !important;}
            #tobii-widget-close {cursor: pointer !important;font-size: 14px !important;color: #718096 !important;line-height: 1 !important;padding: 2px 4px !important;border-radius: 4px !important;transition: color 0.2s, background 0.2s !important;}
            #tobii-widget-close:hover { color: #fff !important; background: rgba(255,255,255,0.1) !important; }
            .tw-row {display: flex !important;align-items: center !important;justify-content: space-between !important;padding: 7px 0 !important;border-bottom: 1px solid rgba(255,255,255,0.06) !important;}
            .tw-row:last-child { border-bottom: none !important; padding-bottom: 0 !important; }
            .tw-label {font-size: 11px !important;color: #718096 !important;letter-spacing: 0.04em !important;}
            .tw-value {font-size: 13px !important;font-weight: 600 !important;color: #e2e8f0 !important;font-variant-numeric: tabular-nums !important;}
            .tw-value.highlight { color: #63b3ff !important; }
            .tw-countdown {font-size: 17px !important;font-weight: 700 !important;color: #90cdf4 !important;letter-spacing: 0.03em !important;font-variant-numeric: tabular-nums !important;}
            .tw-countdown.urgent { color: #fc8181 !important; }
            #tobii-widget-drag-handle {cursor: grab !important;padding: 2px 4px !important;border-radius: 4px !important;color: #4a5568 !important;font-size: 13px !important;transition: color 0.2s !important;}
            #tobii-widget-drag-handle:hover { color: #718096 !important; }`;
        (document.head || document.documentElement).appendChild(style);}

    function formatMinutes(totalMin) {
        if (totalMin === null || totalMin === undefined) return '—';
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        if (h > 0) return `${h} h ${m.toString().padStart(2, '0')} m`;
        return `${m} m`;}

    function getCountdown(endAtStr) {
        if (!endAtStr) return { text: '—', urgent: false };
        const end  = new Date(endAtStr).getTime();
        const now  = Date.now();
        const diff = end - now;
        if (diff <= 0) return { text: 'Ended', urgent: true };
        const days  = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const mins  = Math.floor((diff % 3600000) / 60000);
        const secs  = Math.floor((diff % 60000) / 1000);
        let text = '';
        if (days > 0)  text += `${days}d `;
        text += `${hours.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
        return { text, urgent: diff < 86400000 };}

    function renderWidget() {
        if (!document.body) {
            window.addEventListener('DOMContentLoaded', renderWidget, { once: true });
            return;}
        let widget = document.getElementById('tobii-widget');
        if (!widget) {
            injectStyles();
            widget = document.createElement('div');
            widget.id = 'tobii-widget';
            widget.innerHTML = `
                <div id="tobii-widget-header">
                    <span id="tobii-widget-drag-handle" title="Drag to move">⠿</span>
                    <span id="tobii-widget-title">Tobii Engage</span>
                    <span id="tobii-widget-close" title="Close">✕</span>
                </div>
                <div class="tw-row">
                    <span class="tw-label">Ends in</span>
                    <span id="tw-countdown" class="tw-countdown">—</span>
                </div>
                <div class="tw-row">
                    <span class="tw-label">My Points</span>
                    <span id="tw-points" class="tw-value highlight">—</span>
                </div>
                <div class="tw-row">
                    <span class="tw-label">Watched Time</span>
                    <span id="tw-watched" class="tw-value">—</span>
                </div>
                <div class="tw-row">
                    <span class="tw-label">Last refresh</span>
                    <span id="tw-last-refresh" class="tw-value" style="font-size:11px;color:#4a5568">—</span>
                </div>
            `;
            document.body.appendChild(widget);
            widget.querySelector('#tobii-widget-close').addEventListener('click', () => {
                widget.style.display = 'none';
                stopTimers();});
            makeDraggable(widget, widget.querySelector('#tobii-widget-drag-handle'));
            setupIdleFade(widget);
            if (!countdownTimer) countdownTimer = setInterval(tickCountdown, 1000);
            const observer = new MutationObserver(() => {if (!document.getElementById('tobii-widget') && widget.style.display !== 'none') {document.body.appendChild(widget);}});
            observer.observe(document.body, { childList: true });}
        const nameEl = widget.querySelector('#tobii-widget-title');
        if (nameEl && state.sweepName) nameEl.textContent = state.sweepName;
        const pointsEl = widget.querySelector('#tw-points');
        if (pointsEl) pointsEl.textContent = state.points !== null ? state.points : '—';
        const watchedEl = widget.querySelector('#tw-watched');
        if (watchedEl) watchedEl.textContent = formatMinutes(state.watched);
        tickCountdown();}

    function setupIdleFade(el) {
        let idleTimer;
        const resetIdle = () => {
            if (el.style.display === 'none') return;
            el.style.opacity = '1';
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => { el.style.opacity = '0.45'; }, 8000);};
        document.addEventListener('mousemove', resetIdle);
        resetIdle();}

    function stopTimers() {
        if (countdownTimer) clearInterval(countdownTimer);
        if (pollTimer) clearInterval(pollTimer);}

    function tickCountdown() {
        const el = document.getElementById('tw-countdown');
        if (!el || el.offsetParent === null) return;
        const { text, urgent } = getCountdown(state.endAt);
        el.textContent = text;
        el.classList.toggle('urgent', urgent);}

    function makeDraggable(el, handle) {
        let startX, startY;
        handle.addEventListener('mousedown', e => {
            e.preventDefault();
            handle.style.cursor = 'grabbing';
            const rect = el.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            el.style.transform = 'none';
            el.style.right = 'auto';
            el.style.bottom = 'auto';
            el.style.left = rect.left + 'px';
            el.style.top = rect.top + 'px';
            const onMove = ev => {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                el.style.left = (rect.left + dx) + 'px';
                el.style.top = (rect.top + dy) + 'px';};
            const onUp = () => {
                handle.style.cursor = 'grab';
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);};
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);});}
})();
