// Handlebars setup: helpers, partials (reusable UI components) and a render cache.
(function() {
    'use strict';

    const compiled = {};

    function registerHelpers() {
        // {{t 'amount.title'}} -> PT-BR string from js/strings.js
        Handlebars.registerHelper('t', function(key, options) {
            return Strings.t(key, options && options.hash);
        });
        Handlebars.registerHelper('eq', function(a, b) { return a === b; });
    }

    function registerPartials() {
        document.querySelectorAll('script[type="text/x-handlebars-template"][id^="partial-"]').forEach(function(el) {
            Handlebars.registerPartial(el.id.replace('partial-', ''), el.innerHTML);
        });
    }

    function render(templateId, data) {
        if (!compiled[templateId]) {
            const el = document.getElementById(templateId);
            if (!el) throw new Error('Template not found: ' + templateId);
            compiled[templateId] = Handlebars.compile(el.innerHTML);
        }
        return compiled[templateId](data || {});
    }

    // Decorative, deterministic QR-like pattern (NOT a real Pix code). Seeded so it stays stable per transaction.
    function qrSvg(seed) {
        const size = 25;
        const quiet = 2;
        let s = (seed || 1) % 2147483647;
        function rand() { s = (s * 48271) % 2147483647; return s / 2147483647; }

        function inFinder(x, y) {
            const corners = [[0, 0], [size - 7, 0], [0, size - 7]];
            return corners.some(function(c) { return x >= c[0] && x < c[0] + 7 && y >= c[1] && y < c[1] + 7; });
        }
        function finderOn(x, y) {
            const corners = [[0, 0], [size - 7, 0], [0, size - 7]];
            return corners.some(function(c) {
                const dx = x - c[0], dy = y - c[1];
                if (dx < 0 || dx > 6 || dy < 0 || dy > 6) return false;
                const ring = dx === 0 || dx === 6 || dy === 0 || dy === 6;
                const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
                return ring || core;
            });
        }

        let path = '';
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const on = inFinder(x, y) ? finderOn(x, y) : rand() > 0.52;
                if (on) path += 'M' + (x + quiet) + ' ' + (y + quiet) + 'h1v1h-1z';
            }
        }
        const total = size + quiet * 2;
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total + '" shape-rendering="crispEdges" aria-hidden="true">' +
            '<rect width="' + total + '" height="' + total + '" fill="#fff"/><path d="' + path + '" fill="#09002B"/></svg>';
    }

    window.Components = {
        init: function() {
            registerHelpers();
            registerPartials();
        },
        render: render,
        qrSvg: qrSvg
    };
})();
