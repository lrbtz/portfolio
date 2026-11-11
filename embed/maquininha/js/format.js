// Brazilian formatting helpers (currency, date, time).
(function() {
    'use strict';

    const NBSP = '\u00a0';

    function pad(n) {
        return n < 10 ? '0' + n : String(n);
    }

    window.Format = {
        // 12550 -> "R$ 125,50" (period for thousands, comma for decimals)
        currency: function(cents) {
            const abs = Math.abs(Math.round(cents));
            const reais = Math.floor(abs / 100);
            const rest = abs % 100;
            const grouped = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            return (cents < 0 ? '-' : '') + 'R$' + NBSP + grouped + ',' + pad(rest);
        },

        // "0123" -> 123 (digits typed on the keypad are always cents)
        digitsToCents: function(digits) {
            return digits ? parseInt(digits, 10) : 0;
        },

        date: function(d) {
            return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
        },

        time: function(d) {
            return pad(d.getHours()) + ':' + pad(d.getMinutes());
        }
    };
})();
