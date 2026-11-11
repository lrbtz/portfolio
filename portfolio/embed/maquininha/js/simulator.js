// Simulator panel: stands in for the card, the customer and the network around the terminal.
(function() {
    'use strict';

    const t = Strings.t.bind(Strings);

    window.Simulator = {
        init: function(engine) {
            const cardButtons = document.querySelectorAll('[data-card-entry]');
            const hint = document.getElementById('vt-sim-card-hint');
            const outcomes = document.querySelectorAll('input[name="vt-outcome"]');
            const reset = document.getElementById('vt-sim-reset');
            if (!cardButtons.length) return;

            cardButtons.forEach(function(btn) {
                btn.addEventListener('click', function() { engine.dispatch('PRESENT_CARD', btn.dataset.cardEntry); });
            });
            outcomes.forEach(function(radio) {
                radio.addEventListener('change', function() { if (radio.checked) engine.dispatch('SET_SCENARIO', radio.value); });
            });
            reset.addEventListener('click', function() { engine.dispatch('RESET'); });

            function sync(state) {
                const ST = PaymentEngine.STATUS;
                const active = (state.status === ST.WAITING_FOR_CARD || state.status === ST.REFUND_LIST) && !state.cancelPending;
                cardButtons.forEach(function(btn) { btn.disabled = !active; });
                hint.textContent = t(active ? 'sim.cardHintActive' : 'sim.cardHintIdle');
            }

            engine.subscribe(sync);
            sync(engine.getState());
        }
    };
})();
