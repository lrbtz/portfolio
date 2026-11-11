// Screens: maps engine state to templates, wires touch/keyboard input, and manages focus, announcements and the cancel dialog.
(function() {
    'use strict';

    const S = PaymentEngine.STATUS;
    const t = Strings.t.bind(Strings);

    let engine, screenEl, layerEl, dialogEl, statusEl, terminalEl;
    let lastRenderKey = null;
    let lastStatusKey = null;
    // UI-only state (not part of the payment): total panel expanded, home notice visible
    const ui = { totalOpen: true, homeNotice: false, noticeTimer: null, timeEdit: null }; // timeEdit: { field, digits } while the filter's time keypad is open

    function methodLabel(method) {
        return t('method.labels.' + method);
    }

    function installmentsText(state, p) {
        if (state.method !== 'credit') return null;
        return p.count > 1 ? t('installments.row', { count: p.count, amount: Format.currency(p.installmentCents) }) : t('summary.single');
    }

    function transactionRows(state) {
        const when = state.completedAt || new Date();
        if (state.mode === 'refund') {
            const tx = refundTx(state.refundTxId);
            return [
                { label: t('refund.amountRow'), value: Format.currency(state.amountCents), strong: true },
                { label: t('refund.aut'), value: tx ? tx.aut : '' },
                { label: t('refund.card'), value: tx ? maskCard(tx) : '' },
                { label: t('summary.method'), value: tx ? txType(tx) : '' },
                { label: t('summary.date'), value: Format.date(when) },
                { label: t('summary.time'), value: Format.time(when) },
                { label: t('summary.transaction'), value: '#' + state.transactionId }
            ];
        }
        const p = PaymentEngine.pricing(state);
        const rows = [{ label: t('summary.amount'), value: Format.currency(state.amountCents) }];
        if (p.feeCents > 0 && (state.method === 'credit')) rows.push({ label: t('summary.fees'), value: Format.currency(p.feeCents) });
        if (p.feeCents > 0 && state.passFees) rows.push({ label: t('summary.total'), value: Format.currency(p.totalCents), strong: true });
        rows.push({ label: t('summary.method'), value: methodLabel(state.method) });
        const inst = installmentsText(state, p);
        if (inst) rows.push({ label: t('summary.installments'), value: inst });
        rows.push(
            { label: t('summary.date'), value: Format.date(when) },
            { label: t('summary.time'), value: Format.time(when) },
            { label: t('summary.transaction'), value: '#' + state.transactionId }
        );
        return rows;
    }

    function refundTx(id) {
        return PaymentEngine.CONFIG.refundTransactions.filter(function(tx) { return tx.id === id; })[0];
    }
    function maskCard(tx) { return '1234******' + tx.card; }
    function txType(tx) {
        if (tx.method === 'debit') return t('refund.types.debit');
        if (tx.method === 'voucher') return t('refund.types.voucher');
        return tx.installments > 1 ? t('refund.types.installments', { count: tx.installments }) : t('refund.types.single');
    }
    function txDate(tx) {
        const d = new Date(); d.setDate(d.getDate() - tx.daysAgo);
        return d;
    }

    // "Estorno": list of transactions (home list or search results), with a period/card header for results
    function refundListView(state) {
        const isResults = state.status === S.REFUND_RESULTS;
        const cards = state.refundResults.map(refundTx).filter(Boolean).map(function(tx) {
            return {
                id: tx.id, valueText: Format.currency(tx.cents), aut: tx.aut, dateText: Format.date(txDate(tx)), timeText: tx.time,
                mask: maskCard(tx), typeText: txType(tx)
            };
        });
        let header = null;
        if (isResults) {
            const f = state.refundFilter;
            if (state.refundSource === 'card') {
                header = { title: t('refund.cardHeader'), rows: [{ label: t('refund.card'), value: '1234******' + PaymentEngine.CONFIG.tappedCard }] };
            } else {
                const today = new Date(), yest = new Date(); yest.setDate(yest.getDate() - 1);
                const week = new Date(); week.setDate(week.getDate() - 7);
                const dateText = f.period === 'yesterday' ? Format.date(yest)
                    : f.period === 'week' ? Format.date(week) + ' – ' + Format.date(today) : Format.date(today);
                header = { title: t('refund.periodHeader'), rows: [
                    { label: t('refund.date'), value: dateText },
                    { label: t('refund.time'), value: f.start + ' às ' + f.end }
                ] };
            }
        }
        return { template: 'screen-refund-list', data: {
            title: t('refund.title'), hint: isResults ? '' : t('refund.listHint'), header: header, cards: cards,
            empty: cards.length === 0, emptyTitle: t('refund.emptyTitle'), emptyText: t('refund.emptyText'), nowLabel: t('refund.now'),
            actions: [{ kind: 'secondary', action: 'OPEN_REFUND_FILTER', icon: 'line.3.horizontal.decrease', label: t(isResults ? 'refund.newFilter' : 'refund.filter') }]
        } };
    }

    // HH:mm text for up to 4 typed digits, e.g. '143' -> '14:3_'
    function timeDisplay(digits) {
        const d = (digits + '____').slice(0, 4);
        return d.slice(0, 2) + ':' + d.slice(2);
    }

    function timeValid(digits) {
        return digits.length === 4 && +digits.slice(0, 2) <= 23 && +digits.slice(2) <= 59;
    }

    function refundTimeView() {
        const te = ui.timeEdit;
        const full = te.digits.length === 4;
        return { template: 'screen-refund-time', data: {
            title: t('refund.title'),
            label: t(te.field === 'start' ? 'refund.startTime' : 'refund.endTime'),
            timeText: timeDisplay(te.digits), empty: !te.digits.length, invalid: full && !timeValid(te.digits),
            errorMessage: full && !timeValid(te.digits) ? t('refund.timeInvalid') : '',
            actions: [
                { kind: 'primary', ui: 'time-confirm', label: t('refund.timeConfirm'), disabled: !timeValid(te.digits) },
                { kind: 'secondary', ui: 'time-cancel', label: t('refund.timeCancel') }
            ]
        } };
    }

    function refundFilterView(state) {
        if (ui.timeEdit) return refundTimeView();
        const f = state.refundFilter;
        const periods = ['today', 'yesterday', 'week'].map(function(v) {
            return { value: v, label: t('refund.periods.' + v), selected: f.period === v };
        });
        return { template: 'screen-refund-filter', data: {
            title: t('refund.title'), subtitle: t('refund.filterTitle'),
            periodLabel: t('refund.period'), periodPlaceholder: t('refund.periodPlaceholder'), noPeriod: f.period === '', periods: periods,
            timeLabel: t('refund.timeRange'), startLabel: t('refund.startTime'), endLabel: t('refund.endTime'), start: f.start, end: f.end,
            nsuLabel: t('refund.nsu'), nsuPlaceholder: t('refund.nsuPlaceholder'), nsu: f.nsu, optional: t('refund.optional'),
            actions: [
                { kind: 'secondary', action: 'SEARCH_BY_CARD', icon: 'wave.3.right', label: t('refund.searchByCard') },
                { kind: 'primary', action: 'SEARCH_REFUND', label: t('refund.search'), disabled: f.period === '' }
            ]
        } };
    }

    function refundConfirmView(state) {
        const tx = refundTx(state.refundTxId);
        return { template: 'screen-refund-confirm', data: {
            title: t('refund.title'), question: t('refund.confirmTitle'), no: t('refund.no'), yes: t('refund.yes'),
            rows: tx ? [
                { label: t('refund.value'), value: Format.currency(tx.cents), strong: true },
                { label: t('refund.aut'), value: tx.aut },
                { label: t('refund.card'), value: maskCard(tx) },
                { label: t('summary.method'), value: txType(tx) },
                { label: t('refund.date'), value: Format.date(txDate(tx)) + ' ' + tx.time }
            ] : []
        } };
    }

    // Title shown in the top bar of the payment steps, e.g. "Pague com cartão de crédito parcelado"
    function payTitle(state) {
        const base = t('config.payTitle.' + state.method);
        if (state.method !== 'credit') return base;
        return base + ' ' + t(state.creditType === 'installments' ? 'config.payInstallments' : 'config.paySingle');
    }

    function cancelLink() {
        return { kind: 'link', action: 'REQUEST_CANCEL', label: t('actions.cancel') };
    }

    function amountView(state) {
        const chips = PaymentEngine.CONFIG.quickAmountsCents.map(function(c) {
            return {
                cents: c,
                text: Format.currency(c).replace(/^R\$\s/, ''),
                ariaLabel: t('amount.quickUse', { amount: Format.currency(c) })
            };
        });
        const empty = state.digits === '';
        return { template: 'screen-amount', data: {
            title: t('home.title'), // visible in the top bar next to the back arrow
            amountLabel: t('amount.label'),
            amountText: Format.currency(Format.digitsToCents(state.digits)),
            empty: empty,
            invalid: !!state.error,
            errorMessage: state.error ? t('amount.errors.' + state.error) : '',
            chips: chips,
            actions: [{ kind: 'primary', action: 'CONFIRM_AMOUNT', label: t('actions.continue'), disabled: empty }]
        } };
    }

    function configView(state) {
        const p = PaymentEngine.pricing(state);
        const can = PaymentEngine.canInstall(state.amountCents);
        const installed = state.creditType === 'installments';
        const isPix = state.method === 'pix';

        const methodIcons = { credit: 'creditcard', debit: 'creditcard.fill', voucher: 'ticket', pix: 'qrcode' };

        const creditRows = [
            { action: 'SET_CREDIT_TYPE', value: 'single', label: t('config.single'), selected: !installed },
            {
                action: installed ? 'EDIT_INSTALLMENTS' : 'SET_CREDIT_TYPE', value: 'installments',
                label: installed ? t('config.installmentsSelected', { count: state.installments }) : t('config.installments'),
                selected: installed, trailingIcon: installed ? 'pencil' : '', disabled: !can,
                hint: can ? '' : t('config.installmentsUnavailable', { amount: Format.currency(PaymentEngine.CONFIG.minInstallmentCents * 2) })
            }
        ];

        const showFees = state.method === 'credit'; // fee rows are hidden for debit, voucher (and Pix has none)
        const totalRows = [];
        if (p.count > 1) totalRows.push({ label: t('config.installmentsOf', { count: p.count }), value: Format.currency(p.installmentCents) });
        if (showFees) totalRows.push({ label: t('config.fees'), value: Format.currency(p.feeCents) });
        if (showFees && !state.passFees) totalRows.push({ label: t('config.youReceive'), value: Format.currency(p.receiveCents) });
        totalRows.push({ label: t('config.totalValue'), value: Format.currency(p.totalCents), strong: true });

        return { template: 'screen-config', data: {
            title: payTitle(state),
            methodLabel: t('config.' + state.method),
            methodIcon: methodIcons[state.method],
            isCredit: state.method === 'credit',
            isPix: isPix,
            pixInfo: t('config.pixInfo'),
            showSettings: state.method === 'credit' && installed,
            creditRows: creditRows,
            // "Repassar taxas" only applies to parcelado credit
            togglesTop: state.method === 'credit' && installed ? [{ label: t('config.passFees'), help: t('config.feesHelp'), value: 'passFees', checked: state.passFees, stateText: t(state.passFees ? 'config.yes' : 'config.no') }] : [],
            togglesBottom: [], // "Receba na hora" toggle hidden; instantSettlement stays on (default)
            totalOpen: true, // the breakdown is always visible so fees show before confirming
            totalValueText: Format.currency(p.totalCents),
            totalRows: totalRows,
            ctaLabel: isPix ? t('config.pixCta') : t('actions.pay'),
            ctaIcon: isPix ? 'qrcode' : 'checkmark'
        } };
    }

    function installmentsView(state) {
        const rows = PaymentEngine.installmentOptions(state).map(function(o) {
            return {
                action: 'SELECT_INSTALLMENTS', value: o.count, disabled: !o.available,
                selected: state.creditType === 'installments' && state.installments === o.count,
                label: t('installments.row', { count: o.count, amount: Format.currency(o.installmentCents) }),
                hint: !o.available ? t('installments.unavailable', { amount: Format.currency(PaymentEngine.CONFIG.minInstallmentCents) })
                    : t('installments.rate', { rate: o.rate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }) + ' - ' + (state.passFees ? t('installments.totalHint', { amount: Format.currency(o.totalCents) })
                    : t('installments.receiveHint', { amount: Format.currency(o.receiveCents) }))
            };
        });
        return { template: 'screen-installments', data: { rows: rows } };
    }

    function declinedView(state) {
        if (state.mode === 'refund') {
            return {
                template: 'screen-result',
                data: { variant: 'error', icon: 'xmark', title: t('refund.declinedTitle'), message: t('refund.declinedMessage'),
                        rows: [{ label: t('refund.amountRow'), value: Format.currency(state.amountCents) }],
                        actions: [{ kind: 'primary', action: 'RETRY', icon: 'arrow.clockwise', label: t('actions.retry') },
                                  { kind: 'link', action: 'CANCEL_SALE', label: t('refund.cancel') }] }
            };
        }
        const messages = { declined: 'declined.message', timeout: 'declined.timeoutMessage', pin_blocked: 'declined.pinBlockedMessage' };
        const actions = [{ kind: 'primary', action: 'CHANGE_METHOD', label: t('actions.otherMethod') }];
        if (state.reason === 'timeout') {
            actions[0].kind = 'secondary';
            actions.unshift({ kind: 'primary', action: 'RETRY', icon: 'arrow.clockwise', label: t('actions.retry') });
        }
        actions.push({ kind: 'link', action: 'CANCEL_SALE', label: t('actions.cancel') });
        return {
            template: 'screen-result',
            data: { variant: 'error', icon: 'xmark', title: t('declined.title'), message: t(messages[state.reason] || 'declined.message'),
                    rows: [{ label: t('summary.amount'), value: Format.currency(PaymentEngine.pricing(state).totalCents) }], actions: actions }
        };
    }

    // Returns { template, data } for the current engine state
    function viewFor(state) {
        switch (state.status) {
            case S.IDLE:
                return { template: 'screen-home', data: { notice: ui.homeNotice ? t('home.notice') : '' } };

            case S.ENTERING_AMOUNT:
                return amountView(state);

            case S.CONFIGURING:
                return state.installmentsOpen ? installmentsView(state) : configView(state);

            case S.WAITING_FOR_CARD:
                return { template: 'screen-card', data: {
                    reading: false, showBack: true, amountText: state.mode === 'refund' ? '' : Format.currency(PaymentEngine.pricing(state).totalCents),
                    topTitle: state.mode === 'refund' ? '' : payTitle(state),
                    title: t('card.waitingTitle'), message: t(state.mode === 'refund' ? 'refund.cardMessage' : 'card.waitingMessage'), actions: state.mode === 'refund' ? [] : [cancelLink()]
                } };

            case S.READING_CARD:
                return { template: 'screen-card', data: {
                    reading: true, showBack: false, amountText: state.mode === 'refund' ? '' : Format.currency(PaymentEngine.pricing(state).totalCents),
                    topTitle: state.mode === 'refund' ? '' : payTitle(state),
                    title: t('card.readingTitle'), message: t('card.readingMessage'), actions: []
                } };

            case S.REQUESTING_PIN: {
                const dots = [];
                for (let i = 0; i < PaymentEngine.CONFIG.pinMax; i++) dots.push({ filled: i < state.pin.length });
                const errorKey = { wrong: 'pin.wrong', wrong_last: 'pin.wrongLast' }[state.error];
                return { template: 'screen-pin', data: {
                    dots: dots,
                    pinAriaLabel: state.pin.length ? t('pin.digitsEntered', { count: state.pin.length }) : t('pin.noDigits'),
                    errorMessage: errorKey ? t(errorKey) : '',
                    actions: [
                        { kind: 'primary', action: 'PIN_CONFIRM', label: t('actions.confirm'), disabled: state.pin.length < PaymentEngine.CONFIG.pinMin },
                        cancelLink()
                    ]
                } };
            }

            case S.WAITING_FOR_PIX:
                return { template: 'screen-pix', data: {
                    amountText: Format.currency(state.amountCents), qrSvg: Components.qrSvg(state.transactionId),
                    waitingText: t('pix.waiting'), actions: [cancelLink()]
                } };

            case S.REFUND_LIST:
            case S.REFUND_RESULTS:
                return refundListView(state);

            case S.REFUND_FILTER:
                return refundFilterView(state);

            case S.REFUND_SEARCHING:
                return { template: 'screen-processing', data: { title: t('refund.searchingTitle'), message: t('refund.searchingMessage') } };

            case S.REFUND_CONFIRM:
                return refundConfirmView(state);

            case S.PROCESSING:
                return { template: 'screen-processing', data: state.mode === 'refund'
                    ? { title: t('refund.processingTitle'), message: t('processing.message') }
                    : { title: t('processing.title'), message: t('processing.message') } };

            case S.APPROVED:
                return { template: 'screen-result', data: {
                    variant: 'success', icon: 'checkmark', title: t(state.mode === 'refund' ? 'refund.approvedTitle' : 'approved.title'), rows: transactionRows(state),
                    actions: [
                        { kind: 'primary', action: 'PRINT', label: t('actions.print') },
                        { kind: 'outline', action: 'NEW_SALE', label: t('actions.newSale') }
                    ]
                } };

            case S.DECLINED:
                return declinedView(state);

            case S.CANCELLED:
                return { template: 'screen-result', data: {
                    variant: 'neutral', icon: 'slash.circle', title: t('cancelled.title'), message: t(state.mode === 'refund' ? 'refund.cancelledMessage' : 'cancelled.message'),
                    actions: [{ kind: 'primary', action: 'NEW_SALE', label: t('actions.newSale') }]
                } };

            case S.RECEIPT:
                return { template: 'screen-receipt', data: {
                    rows: transactionRows(state),
                    prompt: t('receipt.prompt'),
                    receiptTitle: t(state.mode === 'refund' ? 'refund.receiptTitle' : 'receipt.title'),
                    statusTag: t(state.mode === 'refund' ? 'refund.receiptTag' : 'receipt.approvedTag'),
                    printing: state.printing,
                    printingText: t('receipt.printing'),
                    notice: state.notice === 'printed' ? t('receipt.printed') : '',
                    actions: [
                        { kind: 'secondary', action: 'PRINT', icon: 'printer', label: t('actions.print'), disabled: state.printing },
                        { kind: 'primary', action: 'NEW_SALE', label: t('actions.newSale'), disabled: state.printing }
                    ]
                } };
        }
        return { template: 'screen-home', data: {} };
    }

    function focusSignature(el) {
        if (!el || !screenEl.contains(el)) return null;
        const d = el.dataset;
        if (d.key) return '[data-key="' + d.key + '"]';
        if (d.ui) return '[data-ui="' + d.ui + '"]';
        if (d.action) return '[data-action="' + d.action + '"]' + (d.value !== undefined ? '[data-value="' + d.value + '"]' : '');
        return null;
    }

    function render(state) {
        if (ui.timeEdit && state.status !== S.REFUND_FILTER) ui.timeEdit = null;
        // Dialog visibility and the simulator scenario never change what the screen shows
        const keyState = Object.assign({}, state, { cancelPending: false, scenario: null, refundFilter: { period: state.refundFilter.period }, ui: { totalOpen: ui.totalOpen, homeNotice: ui.homeNotice, timeEdit: ui.timeEdit } });
        const renderKey = JSON.stringify(keyState, function(k, v) { return k === 'completedAt' ? String(v) : v; });

        if (renderKey !== lastRenderKey) {
            const statusKey = state.status + '|' + state.installmentsOpen;
            const sameScreen = statusKey === lastStatusKey;
            const signature = sameScreen ? focusSignature(document.activeElement) : null;

            const view = viewFor(state);
            screenEl.innerHTML = Components.render(view.template, view.data);

            if (sameScreen) {
                const target = signature && screenEl.querySelector(signature + ':not([disabled])');
                if (target) target.focus({ preventScroll: true });
            } else {
                screenEl.focus({ preventScroll: true });
                const title = screenEl.querySelector('#vt-title');
                statusEl.textContent = '';
                statusEl.textContent = title ? title.textContent : '';
            }
            lastRenderKey = renderKey;
            lastStatusKey = statusKey;
        }

        syncDialog(state.cancelPending);
    }

    function setInert(on) {
        if (on) screenEl.setAttribute('inert', ''); else screenEl.removeAttribute('inert');
    }

    function syncDialog(open) {
        if (open && !dialogEl.open) {
            layerEl.hidden = false;
            dialogEl.show();
            setInert(true);
            document.getElementById('vt-dialog-resume').focus();
        } else if (!open && dialogEl.open) {
            dialogEl.close();
            layerEl.hidden = true;
            setInert(false);
            screenEl.focus({ preventScroll: true });
        }
    }

    function onUiAction(name, el) {
        if (name === 'time-edit') {
            ui.timeEdit = { field: el.dataset.field, digits: '' };
        } else if (name === 'time-cancel') {
            ui.timeEdit = null;
        } else if (name === 'time-confirm') {
            if (!timeValid(ui.timeEdit.digits)) return;
            const d = ui.timeEdit.digits;
            engine.dispatch('SET_REFUND_FIELD', { field: ui.timeEdit.field, value: d.slice(0, 2) + ':' + d.slice(2) });
            ui.timeEdit = null;
        } else if (name === 'toggle-total') {
            ui.totalOpen = !ui.totalOpen;
        } else if (name === 'tab-notice') {
            ui.homeNotice = true;
            clearTimeout(ui.noticeTimer);
            ui.noticeTimer = setTimeout(function() { ui.homeNotice = false; render(engine.getState()); }, 2600);
        }
        render(engine.getState());
    }

    function onTimeKey(key) {
        const te = ui.timeEdit;
        if (key === 'clear') te.digits = '';
        else if (key === 'backspace') te.digits = te.digits.slice(0, -1);
        else if (te.digits.length < 4) te.digits += key;
        render(engine.getState());
    }

    function onScreenClick(e) {
        const keyBtn = e.target.closest('[data-key]');
        if (keyBtn) {
            const key = keyBtn.dataset.key;
            if (ui.timeEdit) { onTimeKey(key); return; }
            const pinMode = engine.getState().status === S.REQUESTING_PIN;
            if (key === 'clear') engine.dispatch('KEY_CLEAR');
            else if (key === 'backspace') engine.dispatch('KEY_BACKSPACE');
            else engine.dispatch(pinMode ? 'PIN_DIGIT' : 'KEY_DIGIT', key);
            return;
        }
        const uiBtn = e.target.closest('[data-ui]');
        if (uiBtn) { onUiAction(uiBtn.dataset.ui, uiBtn); return; }
        const actionBtn = e.target.closest('[data-action]');
        if (actionBtn && !actionBtn.disabled) engine.dispatch(actionBtn.dataset.action, actionBtn.dataset.value);
    }

    // Physical keyboard support for the amount and PIN keypads
    function onKeydown(e) {
        if (!terminalEl.isConnected) return;
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        const state = engine.getState();

        if (e.key === 'Escape') {
            if (state.cancelPending) engine.dispatch('RESUME');
            else engine.dispatch('REQUEST_CANCEL');
            return;
        }
        if (state.cancelPending) return;
        if (ui.timeEdit) {
            if (/^\d$/.test(e.key)) onTimeKey(e.key);
            else if (e.key === 'Backspace') onTimeKey('backspace');
            else if (e.key === 'Delete') onTimeKey('clear');
            else if (e.key === 'Enter' && tag !== 'button') onUiAction('time-confirm');
            return;
        }
        const entering = state.status === S.ENTERING_AMOUNT;
        const pin = state.status === S.REQUESTING_PIN;
        if (!entering && !pin) return;

        if (/^\d$/.test(e.key)) engine.dispatch(entering ? 'KEY_DIGIT' : 'PIN_DIGIT', e.key);
        else if (e.key === 'Backspace') engine.dispatch('KEY_BACKSPACE');
        else if (e.key === 'Delete') engine.dispatch('KEY_CLEAR');
        else if (e.key === 'Enter' && tag !== 'button') engine.dispatch(entering ? 'CONFIRM_AMOUNT' : 'PIN_CONFIRM');
    }

    function localizeStatic(root) {
        root.querySelectorAll('[data-i18n]').forEach(function(el) {
            el.textContent = t(el.dataset.i18n);
        });
    }

    window.Screens = {
        localizeStatic: localizeStatic,

        init: function(eng) {
            engine = eng;
            terminalEl = document.getElementById('vt-terminal');
            screenEl = document.getElementById('vt-screen');
            layerEl = document.getElementById('vt-dialog-layer');
            dialogEl = document.getElementById('vt-cancel-dialog');
            statusEl = document.getElementById('vt-status');
            if (!terminalEl || !screenEl) return;

            screenEl.addEventListener('click', onScreenClick);
            // Refund filter fields update the engine as the designer types; only the period re-renders the screen
            function onField(e) {
                const el = e.target.closest('[data-field]');
                if (el) engine.dispatch('SET_REFUND_FIELD', { field: el.dataset.field, value: el.value });
            }
            screenEl.addEventListener('input', onField);
            screenEl.addEventListener('change', onField);
            document.addEventListener('keydown', onKeydown);
            document.getElementById('vt-dialog-resume').addEventListener('click', function() { engine.dispatch('RESUME'); });
            document.getElementById('vt-dialog-confirm').addEventListener('click', function() { engine.dispatch('CONFIRM_CANCEL'); });
            engine.subscribe(render);
            render(engine.getState());
        }
    };
})();
