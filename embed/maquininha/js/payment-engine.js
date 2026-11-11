// Mock payment engine: a UI-agnostic state machine. No DOM, no real payment providers, no card data.
(function() {
    'use strict';

    const CONFIG = {
        minCents: 100,                 // R$ 1,00
        maxDigits: 7,                  // R$ 99.999,99
        contactlessLimitCents: 20000,  // up to R$ 200,00 by tap needs no PIN
        minInstallmentCents: 500,      // each installment must be at least R$ 5,00
        installmentOptions: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        quickAmountsCents: [10000, 75000, 5000],
        pinMin: 4,
        pinMax: 6,
        maxPinAttempts: 3,
        mockPin: '1234',
        brandGroups: ['mastercard-visa', 'elo-hipercard'],
        // Mock fee table, % of the amount. Credit grows with the number of installments.
        rates: { debit: 2.87, voucher: 3.5, creditBase: 6.372, creditStep: 1.5242, instantOffDebit: 1.0, instantOffCredit: 3.0, instantOffVoucher: 0.5, brandGroup2Extra: 0.5 },
        refundTransactions: [
            { id: 1, cents: 7500,  aut: '498568', card: '1234', daysAgo: 0, time: '14:00', method: 'credit',  installments: 1 },
            { id: 2, cents: 15000, aut: '498569', card: '5678', daysAgo: 0, time: '15:00', method: 'credit',  installments: 1 },
            { id: 3, cents: 20000, aut: '498570', card: '9012', daysAgo: 0, time: '16:00', method: 'debit',   installments: 1 },
            { id: 4, cents: 30000, aut: '498571', card: '3456', daysAgo: 0, time: '17:30', method: 'credit',  installments: 3 },
            { id: 5, cents: 4590,  aut: '498512', card: '1234', daysAgo: 1, time: '10:15', method: 'credit',  installments: 1 },
            { id: 6, cents: 12000, aut: '498377', card: '1234', daysAgo: 3, time: '18:40', method: 'voucher', installments: 1 }
        ],
        tappedCard: '1234',           // card the simulator presents when searching refunds by card
        timing: { searchMs: 1600, readingMs: 1400, processingMs: 2400, timeoutExtraMs: 4000, pixMs: 5500, printMs: 1800 }
    };

    const STATUS = {
        IDLE: 'idle',
        ENTERING_AMOUNT: 'entering_amount',
        CONFIGURING: 'configuring_payment',
        WAITING_FOR_CARD: 'waiting_for_card',
        READING_CARD: 'reading_card',
        REQUESTING_PIN: 'requesting_pin',
        WAITING_FOR_PIX: 'waiting_for_pix',
        PROCESSING: 'processing',
        APPROVED: 'approved',
        DECLINED: 'declined',
        CANCELLED: 'cancelled',
        RECEIPT: 'receipt',
        REFUND_LIST: 'refund_list',
        REFUND_FILTER: 'refund_filter',
        REFUND_SEARCHING: 'refund_searching',
        REFUND_RESULTS: 'refund_results',
        REFUND_CONFIRM: 'refund_confirm'
    };

    // Statuses where the operator may abandon the sale (after confirming)
    const CANCELLABLE = [STATUS.WAITING_FOR_CARD, STATUS.REQUESTING_PIN, STATUS.WAITING_FOR_PIX];
    // Actions still accepted while the cancel confirmation is open
    const DIALOG_ACTIONS = ['RESUME', 'CONFIRM_CANCEL', 'SET_SCENARIO', 'RESET'];

    function freshState(scenario) {
        return {
            status: STATUS.IDLE,
            mode: 'card',          // card | pix | refund
            digits: '',
            amountCents: 0,
            method: 'credit',      // credit | debit | voucher | pix
            creditType: 'single',  // single | installments
            installments: 1,
            installmentsOpen: false,
            passFees: true,
            instantSettlement: true,
            brandGroup: 0,
            entry: null,           // contactless | chip | swipe
            pin: '',
            pinAttempts: 0,
            error: null,           // invalid | min | max | wrong | wrong_last
            reason: null,          // declined | timeout | pin_blocked
            cancelPending: false,
            transactionId: null,
            completedAt: null,
            printing: false,
            notice: null,          // printed
            scenario: scenario || 'approved',
            refundFilter: { period: '', start: '00:00', end: '23:59', nsu: '' }, // period: today | yesterday | week
            refundResults: [],     // transaction ids shown in the list/results
            refundSource: 'list',  // list | filter | card
            refundBack: 'list',    // where Não / back from the filter returns: list | results
            refundTxId: null,
            refundedIds: []        // kept across sales so refunded transactions disappear
        };
    }

    // Fee, total and installment value for a given state (or hypothetical overrides)
    function pricing(state, overrides) {
        const s = Object.assign({}, state, overrides || {});
        const r = CONFIG.rates;
        let rate = 0;
        if (s.method === 'debit') rate = r.debit - (s.instantSettlement ? 0 : r.instantOffDebit);
        else if (s.method === 'voucher') rate = r.voucher - (s.instantSettlement ? 0 : r.instantOffVoucher);
        else if (s.method === 'credit') {
            const n = s.creditType === 'installments' ? s.installments : 1;
            rate = r.creditBase + (n - 1) * r.creditStep - (s.instantSettlement ? 0 : r.instantOffCredit);
        }
        if (s.method !== 'pix' && s.brandGroup === 1) rate += r.brandGroup2Extra;
        const feeCents = Math.round(s.amountCents * rate / 100);
        const totalCents = s.passFees ? s.amountCents + feeCents : s.amountCents;
        const count = s.method === 'credit' && s.creditType === 'installments' ? s.installments : 1;
        return {
            rate: rate,
            feeCents: feeCents,
            totalCents: totalCents,
            receiveCents: s.passFees ? s.amountCents : s.amountCents - feeCents,
            count: count,
            installmentCents: Math.floor(totalCents / count)
        };
    }

    function needsPin(state) {
        return state.entry !== 'contactless' || pricing(state).totalCents > CONFIG.contactlessLimitCents;
    }

    function installmentOptions(state) {
        return CONFIG.installmentOptions.map(function(count) {
            const p = pricing(state, { method: 'credit', creditType: 'installments', installments: count });
            return { count: count, rate: p.rate, installmentCents: p.installmentCents, totalCents: p.totalCents, receiveCents: p.receiveCents, available: p.installmentCents >= CONFIG.minInstallmentCents };
        });
    }

    function canInstall(amountCents) {
        return Math.floor(amountCents / 2) >= CONFIG.minInstallmentCents;
    }

    function create(options) {
        const timing = Object.assign({}, CONFIG.timing, options && options.timing);
        const listeners = [];
        const timers = { main: null, print: null };
        let state = freshState();
        let lastTransactionId = 0;

        function nextTransactionId() {
            // Deterministic and realistic-looking: first sale is always #849321
            lastTransactionId = lastTransactionId
                ? 100000 + ((lastTransactionId * 7919 + 13) % 900000)
                : 849321;
            return lastTransactionId;
        }

        function emit() {
            const snapshot = Object.assign({}, state);
            listeners.forEach(function(fn) { fn(snapshot); });
        }

        function set(patch) {
            state = Object.assign({}, state, patch);
            emit();
        }

        function clearTimer(name) {
            if (timers[name]) { clearTimeout(timers[name]); timers[name] = null; }
        }

        function schedule(name, ms, fn) {
            clearTimer(name);
            timers[name] = setTimeout(function() { timers[name] = null; fn(); }, ms);
        }

        // Fields that belong to a single payment attempt
        function attemptReset() {
            return { entry: null, pin: '', pinAttempts: 0, error: null, reason: null, cancelPending: false, transactionId: null, completedAt: null };
        }

        function approve() {
            const refunded = state.mode === 'refund' && state.refundTxId ? state.refundedIds.concat(state.refundTxId) : state.refundedIds;
            set({ status: STATUS.APPROVED, completedAt: new Date(), error: null, refundedIds: refunded });
        }

        function decline(reason) {
            set({ status: STATUS.DECLINED, reason: reason, completedAt: new Date(), pin: '', error: null });
        }

        // Applies the simulated outcome after `baseMs`
        function scheduleOutcome(baseMs) {
            const scenario = state.scenario;
            if (scenario === 'timeout') {
                schedule('main', baseMs + timing.timeoutExtraMs, function() { decline('timeout'); });
            } else if (scenario === 'declined') {
                schedule('main', baseMs, function() { decline('declined'); });
            } else {
                schedule('main', baseMs, approve);
            }
        }

        function startProcessing() {
            set({ status: STATUS.PROCESSING, transactionId: nextTransactionId(), pin: '', error: null });
            scheduleOutcome(timing.processingMs);
        }

        function goWaitingForCard() {
            clearTimer('main');
            set(Object.assign(attemptReset(), { status: STATUS.WAITING_FOR_CARD, installmentsOpen: false }));
        }

        function goWaitingForPix() {
            clearTimer('main');
            set(Object.assign(attemptReset(), { status: STATUS.WAITING_FOR_PIX, method: 'pix', transactionId: nextTransactionId() }));
            scheduleOutcome(timing.pixMs);
        }

        function goConfiguring(patch) {
            clearTimer('main');
            set(Object.assign(attemptReset(), { status: STATUS.CONFIGURING, mode: 'card', installmentsOpen: false }, patch || {}));
        }

        function visibleRefunds() {
            return CONFIG.refundTransactions.filter(function(tx) { return state.refundedIds.indexOf(tx.id) === -1; });
        }

        // Applies the filter form (period, time range, NSU) or the tapped card to the mock transactions
        function searchRefunds() {
            const f = state.refundFilter;
            return visibleRefunds().filter(function(tx) {
                if (state.refundSource === 'card') return tx.card === CONFIG.tappedCard;
                if (f.period === 'today' && tx.daysAgo !== 0) return false;
                if (f.period === 'yesterday' && tx.daysAgo !== 1) return false;
                if (f.period === 'week' && tx.daysAgo > 7) return false;
                if (f.start && tx.time < f.start) return false;
                if (f.end && tx.time > f.end) return false;
                if (f.nsu && tx.aut.indexOf(f.nsu.trim()) === -1) return false;
                return true;
            }).map(function(tx) { return tx.id; });
        }

        function goSearching() {
            clearTimer('main');
            set({ status: STATUS.REFUND_SEARCHING, error: null });
            schedule('main', timing.searchMs, function() {
                set({ status: STATUS.REFUND_RESULTS, refundResults: searchRefunds() });
            });
        }

        function backToRefundList() {
            const ids = visibleRefunds().map(function(tx) { return tx.id; });
            set({ status: STATUS.REFUND_LIST, refundSource: 'list', refundResults: ids, refundTxId: null, error: null });
        }

        const handlers = {
            // payload: 'credit' (default) | 'debit' | 'voucher' | 'pix'
            START_SALE: function(kind) {
                if (state.status !== STATUS.IDLE) return;
                const pix = kind === 'pix';
                set({
                    status: STATUS.ENTERING_AMOUNT,
                    mode: pix ? 'pix' : 'card',
                    method: pix ? 'pix' : (kind === 'voucher' || kind === 'debit' ? kind : 'credit'),
                    creditType: 'single', installments: 1, passFees: false
                });
            },

            // Refund ("Estorno"): list of recent transactions (or filter / tap the card) → confirm → processing → result
            START_REFUND: function() {
                if (state.status !== STATUS.IDLE) return;
                set({ mode: 'refund', method: 'credit', creditType: 'single', installments: 1, passFees: false });
                backToRefundList();
            },
            OPEN_REFUND_FILTER: function() {
                if (state.status !== STATUS.REFUND_LIST && state.status !== STATUS.REFUND_RESULTS) return;
                set({
                    status: STATUS.REFUND_FILTER, refundBack: state.status === STATUS.REFUND_RESULTS ? 'results' : 'list',
                    refundFilter: { period: '', start: '00:00', end: '23:59', nsu: '' }
                });
            },
            // payload: { field: 'period' | 'start' | 'end' | 'nsu', value }
            SET_REFUND_FIELD: function(p) {
                if (state.status !== STATUS.REFUND_FILTER || !p) return;
                if (['period', 'start', 'end', 'nsu'].indexOf(p.field) === -1) return;
                const f = Object.assign({}, state.refundFilter); f[p.field] = String(p.value);
                set({ refundFilter: f });
            },
            SEARCH_REFUND: function() {
                if (state.status !== STATUS.REFUND_FILTER || !state.refundFilter.period) return;
                set({ refundSource: 'filter' });
                goSearching();
            },
            SEARCH_BY_CARD: function() {
                if (state.status !== STATUS.REFUND_FILTER) return;
                set(Object.assign(attemptReset(), { status: STATUS.WAITING_FOR_CARD, refundSource: 'card' }));
            },
            SELECT_REFUND: function(id) {
                if (state.status !== STATUS.REFUND_LIST && state.status !== STATUS.REFUND_RESULTS) return;
                const n = parseInt(id, 10);
                if (!CONFIG.refundTransactions.some(function(tx) { return tx.id === n; })) return;
                set({ status: STATUS.REFUND_CONFIRM, refundTxId: n, refundBack: state.status === STATUS.REFUND_RESULTS ? 'results' : 'list' });
            },
            // "Não"
            DECLINE_REFUND: function() {
                if (state.status !== STATUS.REFUND_CONFIRM) return;
                set({ status: state.refundBack === 'results' ? STATUS.REFUND_RESULTS : STATUS.REFUND_LIST, refundTxId: null });
            },
            // "Sim"
            CONFIRM_REFUND: function() {
                if (state.status !== STATUS.REFUND_CONFIRM) return;
                const tx = CONFIG.refundTransactions.filter(function(x) { return x.id === state.refundTxId; })[0];
                if (!tx) return;
                set({
                    amountCents: tx.cents, method: tx.method, creditType: tx.installments > 1 ? 'installments' : 'single',
                    installments: tx.installments, passFees: false
                });
                startProcessing();
            },

            KEY_DIGIT: function(digit) {
                if (state.status !== STATUS.ENTERING_AMOUNT) return;
                const d = String(digit);
                if (!/^\d$/.test(d)) return;
                if (state.digits.length >= CONFIG.maxDigits) { set({ error: 'max' }); return; }
                set({ digits: (state.digits + d).replace(/^0+/, ''), error: null });
            },
            KEY_BACKSPACE: function() {
                if (state.status === STATUS.ENTERING_AMOUNT) set({ digits: state.digits.slice(0, -1), error: null });
                else if (state.status === STATUS.REQUESTING_PIN) set({ pin: state.pin.slice(0, -1), error: null });
            },
            KEY_CLEAR: function() {
                if (state.status === STATUS.ENTERING_AMOUNT) set({ digits: '', error: null });
                else if (state.status === STATUS.REQUESTING_PIN) set({ pin: '', error: null });
            },
            SET_AMOUNT: function(cents) {
                const n = parseInt(cents, 10);
                if (state.status !== STATUS.ENTERING_AMOUNT || !(n > 0)) return;
                set({ digits: String(n), error: null });
            },
            PIN_DIGIT: function(digit) {
                if (state.status !== STATUS.REQUESTING_PIN) return;
                if (state.pin.length >= CONFIG.pinMax) return;
                set({ pin: state.pin + String(digit), error: null });
            },

            CONFIRM_AMOUNT: function() {
                if (state.status !== STATUS.ENTERING_AMOUNT) return;
                const cents = Format.digitsToCents(state.digits);
                if (cents === 0) { set({ error: 'invalid' }); return; }
                if (cents < CONFIG.minCents) { set({ error: 'min' }); return; }
                set({ amountCents: cents, error: null });
                if (state.mode === 'pix') goWaitingForPix();
                else goConfiguring({ creditType: 'single', installments: 1 });
            },

            // Payment setup screen
            SET_CARD_TYPE: function(type) {
                if (state.status !== STATUS.CONFIGURING || state.installmentsOpen) return;
                if (['credit', 'debit', 'voucher', 'pix'].indexOf(type) === -1) return;
                set({ method: type, creditType: 'single', installments: 1, passFees: false });
            },
            SET_CREDIT_TYPE: function(type) {
                if (state.status !== STATUS.CONFIGURING || state.method !== 'credit') return;
                if (type === 'single') set({ creditType: 'single', installments: 1, passFees: false });
                else if (type === 'installments' && canInstall(state.amountCents)) set({ installmentsOpen: true });
            },
            EDIT_INSTALLMENTS: function() {
                if (state.status === STATUS.CONFIGURING && state.method === 'credit' && canInstall(state.amountCents)) set({ installmentsOpen: true });
            },
            SELECT_INSTALLMENTS: function(count) {
                if (state.status !== STATUS.CONFIGURING || !state.installmentsOpen) return;
                const n = parseInt(count, 10);
                const opt = installmentOptions(state).filter(function(o) { return o.count === n; })[0];
                if (!opt || !opt.available) return;
                set({ creditType: 'installments', installments: n, installmentsOpen: false });
            },
            TOGGLE_OPTION: function(name) {
                if (state.status !== STATUS.CONFIGURING) return;
                if (name === 'passFees' || name === 'instantSettlement') {
                    const patch = {}; patch[name] = !state[name]; set(patch);
                }
            },
            CYCLE_BRAND: function(delta) {
                if (state.status !== STATUS.CONFIGURING) return;
                const n = CONFIG.brandGroups.length;
                set({ brandGroup: (state.brandGroup + (parseInt(delta, 10) || 1) + n) % n });
            },
            PAY: function() {
                if (state.status !== STATUS.CONFIGURING || state.installmentsOpen) return;
                if (state.method === 'pix') goWaitingForPix(); else goWaitingForCard();
            },

            BACK: function() {
                if (state.cancelPending) return;
                switch (state.status) {
                    case STATUS.ENTERING_AMOUNT: set({ status: STATUS.IDLE, digits: '', error: null }); break;
                    case STATUS.CONFIGURING:
                        if (state.installmentsOpen) set({ installmentsOpen: false });
                        else set({ status: STATUS.ENTERING_AMOUNT, error: null });
                        break;
                    case STATUS.WAITING_FOR_CARD:
                        if (state.mode === 'refund') { clearTimer('main'); set(Object.assign(attemptReset(), { status: STATUS.REFUND_FILTER })); }
                        else goConfiguring();
                        break;
                    case STATUS.REFUND_LIST: set({ status: STATUS.IDLE, mode: 'card' }); break;
                    case STATUS.REFUND_FILTER: set({ status: state.refundBack === 'results' ? STATUS.REFUND_RESULTS : STATUS.REFUND_LIST }); break;
                    case STATUS.REFUND_RESULTS: backToRefundList(); break;
                    case STATUS.REFUND_CONFIRM: handlers.DECLINE_REFUND(); break;
                    case STATUS.WAITING_FOR_PIX:
                        // Pix started from the setup screen goes back there; the home shortcut goes back to the amount
                        if (state.mode === 'pix') { clearTimer('main'); set(Object.assign(attemptReset(), { status: STATUS.ENTERING_AMOUNT })); }
                        else goConfiguring({ method: 'pix' });
                        break;
                }
            },

            REQUEST_CANCEL: function() {
                if (CANCELLABLE.indexOf(state.status) === -1 || state.mode === 'refund') return;
                if (state.status === STATUS.WAITING_FOR_PIX) clearTimer('main');
                set({ cancelPending: true });
            },
            RESUME: function() {
                if (!state.cancelPending) return;
                set({ cancelPending: false });
                if (state.status === STATUS.WAITING_FOR_PIX) scheduleOutcome(timing.pixMs);
            },
            CONFIRM_CANCEL: function() {
                if (!state.cancelPending) return;
                clearTimer('main');
                set({ status: STATUS.CANCELLED, cancelPending: false, pin: '', error: null });
            },
            CANCEL_SALE: function() {
                if (state.status !== STATUS.DECLINED) return;
                set({ status: STATUS.CANCELLED });
            },

            PRESENT_CARD: function(entry) {
                const refundList = state.mode === 'refund' && state.status === STATUS.REFUND_LIST;
                if (state.status !== STATUS.WAITING_FOR_CARD && !refundList) return;
                if (['contactless', 'chip', 'swipe'].indexOf(entry) === -1) return;
                set({ entry: entry, status: STATUS.READING_CARD, refundSource: state.mode === 'refund' ? 'card' : state.refundSource });
                if (state.mode === 'refund') { schedule('main', timing.readingMs, goSearching); return; }
                schedule('main', timing.readingMs, function() {
                    if (needsPin(state)) set({ status: STATUS.REQUESTING_PIN, pin: '', pinAttempts: 0, error: null });
                    else startProcessing();
                });
            },
            PIN_CONFIRM: function() {
                if (state.status !== STATUS.REQUESTING_PIN || state.pin.length < CONFIG.pinMin) return;
                if (state.pin === CONFIG.mockPin) { startProcessing(); return; }
                const attempts = state.pinAttempts + 1;
                if (attempts >= CONFIG.maxPinAttempts) { set({ pinAttempts: attempts }); decline('pin_blocked'); return; }
                set({ pinAttempts: attempts, pin: '', error: attempts === CONFIG.maxPinAttempts - 1 ? 'wrong_last' : 'wrong' });
            },

            RETRY: function() {
                if (state.status !== STATUS.DECLINED) return;
                if (state.mode === 'refund') { set({ status: STATUS.REFUND_CONFIRM, reason: null, pin: '', error: null }); return; }
                if (state.reason !== 'timeout') return;
                if (state.method === 'pix') goWaitingForPix(); else goWaitingForCard();
            },
            // "Usar outra forma de pagamento": back to the setup screen as a card payment
            CHANGE_METHOD: function() {
                if (state.status !== STATUS.DECLINED) return;
                goConfiguring({ method: state.method === 'pix' ? 'credit' : state.method, creditType: 'single', installments: 1 });
            },

            CONTINUE: function() {
                if (state.status === STATUS.APPROVED) set({ status: STATUS.RECEIPT, printing: false, notice: null });
            },
            PRINT: function() {
                if (state.status !== STATUS.APPROVED && state.status !== STATUS.RECEIPT) return;
                if (state.printing) return;
                set({ status: STATUS.RECEIPT, printing: true, notice: null });
                schedule('print', timing.printMs, function() { set({ printing: false, notice: 'printed' }); });
            },
            // Back to the "Vender" home
            NEW_SALE: function() {
                if (state.status !== STATUS.RECEIPT && state.status !== STATUS.CANCELLED && state.status !== STATUS.APPROVED) return;
                clearTimer('main'); clearTimer('print');
                state = Object.assign(freshState(state.scenario), { refundedIds: state.refundedIds });
                emit();
            },

            DISMISS_NOTICE: function() {
                set({ error: null, notice: null });
            },
            SET_SCENARIO: function(value) {
                if (['approved', 'declined', 'timeout'].indexOf(value) !== -1) set({ scenario: value });
            },
            RESET: function() {
                clearTimer('main'); clearTimer('print');
                state = freshState(state.scenario);
                emit();
            }
        };

        return {
            getState: function() { return Object.assign({}, state); },
            subscribe: function(fn) { listeners.push(fn); },
            dispatch: function(type, payload) {
                const handler = handlers[type];
                if (!handler) return;
                if (state.cancelPending && DIALOG_ACTIONS.indexOf(type) === -1) return;
                handler(payload);
            }
        };
    }

    window.PaymentEngine = {
        create: create,
        STATUS: STATUS,
        CONFIG: CONFIG,
        pricing: pricing,
        needsPin: needsPin,
        installmentOptions: installmentOptions,
        canInstall: canInstall
    };
})();
