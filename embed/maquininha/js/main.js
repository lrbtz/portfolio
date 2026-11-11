// Entry point: wires the engine, screens, simulator and header clock once the canvas is ready.
(function() {
    'use strict';

    function startClock() {
        const clock = document.getElementById('vt-clock');
        if (!clock) return;
        function tick() {
            const now = new Date();
            clock.textContent = Format.time(now);
            clock.setAttribute('datetime', now.toISOString());
        }
        tick();
        setInterval(tick, 15000);
    }

    function init() {
        Components.init();
        Screens.localizeStatic(document);
        const engine = PaymentEngine.create();
        Screens.init(engine);
        Simulator.init(engine);
        startClock();
    }

    function safeInit() {
        try { init(); } catch (err) { console.error('Init failed:', err); }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('davinci:canvas:ready', safeInit);
    } else {
        safeInit();
    }
})();
