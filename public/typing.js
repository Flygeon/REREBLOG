(function() {
    const NS = '__banner_typing__';

    function isHomePath(path) {
        const baseUrl = document.querySelector('meta[name="base-url"]')?.getAttribute('content') || '/';
        const normalizedBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
        return path === normalizedBase || path === '/' || path.replace(/\/+$/, '') === normalizedBase.replace(/\/+$/, '');
    }

    function typeText(element, text, speed) {
        speed = speed || 100;
        if (window[NS + 'timer']) {
            clearTimeout(window[NS + 'timer']);
            window[NS + 'timer'] = null;
        }
        element.textContent = '';
        let i = 0;
        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                window[NS + 'timer'] = setTimeout(type, speed);
            } else {
                window[NS + 'timer'] = null;
            }
        }
        window[NS + 'timer'] = setTimeout(type, 800);
    }

    function startTyping() {
        const subtitle = document.getElementById('banner-subtitle');
        if (!subtitle) return;
        if (window[NS + 'timer']) return;
        const text = subtitle.getAttribute('data-text') || '';
        const shouldType = subtitle.getAttribute('data-typing') === 'true';
        if (shouldType && text) {
            typeText(subtitle, text, 80);
        } else {
            subtitle.textContent = text;
        }
    }

    function stopTyping() {
        if (window[NS + 'timer']) {
            clearTimeout(window[NS + 'timer']);
            window[NS + 'timer'] = null;
        }
        const subtitle = document.getElementById('banner-subtitle');
        if (subtitle) {
            const shouldType = subtitle.getAttribute('data-typing') === 'true';
            if (shouldType) {
                subtitle.textContent = '';
            }
        }
    }

    function handlePageLoad() {
        if (isHomePath(window.location.pathname)) {
            startTyping();
        } else {
            stopTyping();
        }
    }

    function handleBeforeSwap() {
        stopTyping();
    }

    function setup() {
        if (window[NS + 'done']) return;
        window[NS + 'done'] = true;

        if (isHomePath(window.location.pathname)) {
            startTyping();
        }

        document.addEventListener('astro:page-load', handlePageLoad);
        document.addEventListener('astro:before-swap', handleBeforeSwap);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        setup();
    }
})();
