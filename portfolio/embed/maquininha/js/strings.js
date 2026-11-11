// All user-facing copy, in Portuguese (pt) and English (en). Everything the UI shows comes from here.
(function() {
    'use strict';

    const pt = {
        common: { close: 'Fechar', back: 'Voltar' },
        home: {
            title: 'Início',
            banner: 'Receba na hora ativado',
            credit: 'Crédito',
            creditText: 'À vista ou parcelado',
            debit: 'Débito',
            debitText: 'Receber com cartão de débito',
            pixTitle: 'Pix',
            pixText: 'Receber por código ou chave',
            voucherTitle: 'Voucher',
            voucherText: 'Vale-refeição e vale-alimentação',
            notice: 'Esta área não faz parte do protótipo.',
            tabs: { home: 'Início', transactions: 'Transações', refund: 'Estorno', label: 'Navegação principal' }
        },
        actions: {
            newSale: 'Nova venda',
            continue: 'Continuar',
            confirm: 'Confirmar',
            cancel: 'Cancelar venda',
            print: 'Imprimir comprovante',
            retry: 'Tentar novamente',
            otherMethod: 'Usar outra forma de pagamento',
            pay: 'Confirmar'
        },
        keypad: {
            label: 'Teclado numérico',
            clear: 'Limpar',
            backspace: 'Apagar último dígito'
        },
        amount: {
            title: 'Digite o valor',
            label: 'Valor da venda',
            quickLabel: 'Valores rápidos',
            quickUse: 'Usar valor {amount}',
            errors: {
                invalid: 'Digite um valor válido.',
                min: 'O valor mínimo para esta transação é R$ 1,00.',
                max: 'O valor máximo para esta transação é R$ 99.999,99.'
            }
        },
        config: {
            typeLabel: 'Tipo de cartão',
            payTitle: { credit: 'Pague com cartão de crédito', debit: 'Pague com cartão de débito', voucher: 'Pague com voucher', pix: 'Pague com Pix' },
            payInstallments: 'parcelado',
            paySingle: 'à vista',
            feesHelp: 'Quem paga a taxa de parcelamento',
            yes: 'Sim',
            no: 'Não',
            credit: 'Crédito',
            debit: 'Débito',
            voucher: 'Voucher',
            pix: 'Pix',
            pixInfo: 'Sem taxas. O cliente paga lendo o QR Code no app do banco.',
            pixCta: 'Gerar QR Code Pix',
            single: 'À vista',
            installments: 'Parcelado',
            installmentsSelected: 'Parcelado – {count}x',
            installmentsUnavailable: 'Disponível a partir de {amount}',
            editInstallments: 'Editar parcelas',
            passFees: 'Repassar taxas',
            brand: 'Bandeira',
            brandPrev: 'Bandeira anterior',
            brandNext: 'Próxima bandeira',
            brandGroups: ['Mastercard e Visa', 'Elo e Hipercard'],
            instant: 'Receba na hora',
            total: 'Total',
            fees: 'Taxas',
            totalValue: 'Valor total',
            installmentsOf: 'Em {count}x de',
            youReceive: 'Você receberá',
            expand: 'Mostrar detalhes do total',
            collapse: 'Ocultar detalhes do total'
        },
        installments: {
            title: 'Escolha o número de parcelas',
            row: '{count}x de {amount}',
            rate: 'Taxa de {rate}%',
            totalHint: 'Total de {amount}',
            receiveHint: 'Você recebe {amount}',
            unavailable: 'Parcela mínima de {amount}'
        },
        method: { labels: { credit: 'Crédito', debit: 'Débito', pix: 'Pix', voucher: 'Voucher' } },
        card: {
            waitingTitle: 'Aproxime, insira ou passe o cartão',
            waitingMessage: 'Aguardando o cartão do cliente.',
            readingTitle: 'Lendo o cartão',
            readingMessage: 'Não remova o cartão.'
        },
        pin: {
            title: 'Digite sua senha',
            hint: 'Digite de 4 a 6 dígitos.',
            digitsEntered: '{count} dígitos digitados',
            noDigits: 'Nenhum dígito digitado',
            wrong: '<strong>Senha incorreta.</strong> Você ainda pode tentar novamente.',
            wrongLast: '<strong>Senha incorreta.</strong> Resta apenas 1 tentativa.'
        },
        processing: {
            title: 'Processando pagamento',
            message: 'Aguarde um instante. Não remova o cartão.'
        },
        pix: {
            title: 'Pague com Pix',
            qrLabel: 'QR Code do Pix para pagamento',
            instruction: 'Peça ao cliente para ler o QR Code no app do banco.',
            waiting: 'Aguardando pagamento'
        },
        approved: { title: 'Pagamento aprovado' },
        declined: {
            title: 'Pagamento não aprovado',
            message: 'Não foi possível concluir o pagamento.',
            timeoutMessage: 'Não foi possível concluir o pagamento. Tente novamente ou escolha outra forma de pagamento.',
            pinBlockedMessage: 'Senha bloqueada por excesso de tentativas. Use outro cartão ou outra forma de pagamento.'
        },
        cancelled: {
            title: 'Operação cancelada',
            message: 'Nenhum valor foi cobrado do cliente.'
        },
        cancelDialog: {
            title: 'Cancelar operação?',
            text: 'Tem certeza de que deseja cancelar esta operação?',
            resume: 'Continuar pagamento',
            confirm: 'Cancelar operação'
        },
        summary: {
            amount: 'Valor',
            fees: 'Taxas',
            total: 'Valor total',
            method: 'Forma de pagamento',
            installments: 'Parcelas',
            date: 'Data',
            time: 'Hora',
            transaction: 'Transação',
            single: 'À vista'
        },
        receipt: {
            prompt: 'Deseja imprimir o comprovante?',
            title: 'COMPROVANTE DE PAGAMENTO',
            approvedTag: 'Aprovada',
            printing: 'Imprimindo comprovante',
            printed: '<strong>Comprovante impresso.</strong> Retire a via do cliente.'
        },
        refund: {
            title: 'Estorno',
            listHint: 'Selecione uma transação ou aproxime o cartão.',
            filterTitle: 'Filtro',
            period: 'Selecione o período',
            periodPlaceholder: 'Período',
            periods: { today: 'Hoje', yesterday: 'Ontem', week: 'Últimos 7 dias' },
            timeRange: 'Insira o horário inicial e final',
            startTime: 'Hora inicial',
            endTime: 'Hora final',
            nsu: 'Insira o NSU',
            nsuPlaceholder: 'Ex. 000000',
            optional: '*Campo opcional',
            timeInvalid: 'Insira um horário válido (00:00 a 23:59).',
            timeConfirm: 'Confirmar',
            timeCancel: 'Cancelar',
            search: 'Buscar',
            searchByCard: 'Buscar por cartão',
            filter: 'Filtrar',
            newFilter: 'Novo filtro',
            searchingTitle: 'Buscando transações',
            searchingMessage: 'Isso pode levar alguns segundos.',
            periodHeader: 'Período',
            cardHeader: 'Cartão',
            date: 'Data',
            time: 'Horário',
            card: 'Cartão',
            value: 'Valor',
            aut: 'Aut.',
            now: 'Estornar agora',
            emptyTitle: 'Nenhuma transação encontrada',
            emptyText: 'Tente outro período ou busque pelo cartão.',
            confirmTitle: 'Deseja realmente estornar?',
            no: 'Não',
            yes: 'Sim',
            cardMessage: 'Aguardando o cartão usado na compra.',
            processingTitle: 'Processando estorno',
            approvedTitle: 'Estorno aprovado',
            declinedTitle: 'Estorno não aprovado',
            declinedMessage: 'Não foi possível concluir o estorno. Tente novamente.',
            cancelledMessage: 'Nenhum valor foi devolvido ao cliente.',
            cancel: 'Cancelar estorno',
            amountRow: 'Valor estornado',
            receiptTitle: 'COMPROVANTE DE ESTORNO',
            receiptTag: 'Estornado',
            types: { single: 'Crédito à vista', installments: 'Crédito {count}x', debit: 'Débito', voucher: 'Voucher' }
        },
        sim: {
            title: 'Simulador',
            cardLabel: 'Cartão do cliente',
            tap: 'Aproximar cartão',
            insert: 'Inserir cartão',
            swipe: 'Passar cartão',
            cardHintIdle: 'Os botões ficam ativos quando o app pede o cartão.',
            cardHintActive: 'Escolha como o cliente apresenta o cartão.',
            outcomeLabel: 'Resultado do pagamento',
            outcomeApproved: 'Aprovado',
            outcomeDeclined: 'Negado',
            outcomeTimeout: 'Tempo esgotado',
            pinHint: 'Senha de teste: 1234. Pagamentos por aproximação de até R$ 200,00 não pedem senha.',
            reset: 'Reiniciar app'
        }
    };

    const en = {
        common: { close: 'Close', back: 'Back' },
        home: {
            title: 'Home',
            banner: 'Instant settlement on',
            credit: 'Credit',
            creditText: 'Single payment or installments',
            debit: 'Debit',
            debitText: 'Accept debit cards',
            pixTitle: 'Pix',
            pixText: 'Receive by code or key',
            voucherTitle: 'Voucher',
            voucherText: 'Meal and food vouchers',
            notice: 'This area is not part of the prototype.',
            tabs: { home: 'Home', transactions: 'Transactions', refund: 'Refund', label: 'Main navigation' }
        },
        actions: {
            newSale: 'New sale',
            continue: 'Continue',
            confirm: 'Confirm',
            cancel: 'Cancel sale',
            print: 'Print receipt',
            retry: 'Try again',
            otherMethod: 'Use another payment method',
            pay: 'Confirm'
        },
        keypad: {
            label: 'Numeric keypad',
            clear: 'Clear',
            backspace: 'Delete last digit'
        },
        amount: {
            title: 'Enter the amount',
            label: 'Sale amount',
            quickLabel: 'Quick amounts',
            quickUse: 'Use amount {amount}',
            errors: {
                invalid: 'Enter a valid amount.',
                min: 'The minimum amount for this transaction is R$ 1,00.',
                max: 'The maximum amount for this transaction is R$ 99.999,99.'
            }
        },
        config: {
            typeLabel: 'Card type',
            payTitle: { credit: 'Pay with credit card', debit: 'Pay with debit card', voucher: 'Pay with voucher', pix: 'Pay with Pix' },
            payInstallments: 'in installments',
            paySingle: 'single payment',
            feesHelp: 'Who pays the installment fee',
            yes: 'Yes',
            no: 'No',
            credit: 'Credit',
            debit: 'Debit',
            voucher: 'Voucher',
            pix: 'Pix',
            pixInfo: 'No fees. The customer pays by scanning the QR code in their bank app.',
            pixCta: 'Generate Pix QR code',
            single: 'Single payment',
            installments: 'Installments',
            installmentsSelected: 'Installments – {count}x',
            installmentsUnavailable: 'Available from {amount}',
            editInstallments: 'Edit installments',
            passFees: 'Pass on fees',
            brand: 'Card brand',
            brandPrev: 'Previous brand',
            brandNext: 'Next brand',
            brandGroups: ['Mastercard and Visa', 'Elo and Hipercard'],
            instant: 'Instant settlement',
            total: 'Total',
            fees: 'Fees',
            totalValue: 'Total amount',
            installmentsOf: 'In {count}x of',
            youReceive: 'You will receive',
            expand: 'Show total details',
            collapse: 'Hide total details'
        },
        installments: {
            title: 'Choose the number of installments',
            row: '{count}x of {amount}',
            rate: 'Fee of {rate}%',
            totalHint: 'Total of {amount}',
            receiveHint: 'You receive {amount}',
            unavailable: 'Minimum installment of {amount}'
        },
        method: { labels: { credit: 'Credit', debit: 'Debit', pix: 'Pix', voucher: 'Voucher' } },
        card: {
            waitingTitle: 'Tap, insert, or swipe the card',
            waitingMessage: 'Waiting for the customer\'s card.',
            readingTitle: 'Reading the card',
            readingMessage: 'Do not remove the card.'
        },
        pin: {
            title: 'Enter your PIN',
            hint: 'Enter 4 to 6 digits.',
            digitsEntered: '{count} digits entered',
            noDigits: 'No digits entered',
            wrong: '<strong>Wrong PIN.</strong> You can try again.',
            wrongLast: '<strong>Wrong PIN.</strong> Only 1 attempt left.'
        },
        processing: {
            title: 'Processing payment',
            message: 'Please wait. Do not remove the card.'
        },
        pix: {
            title: 'Pay with Pix',
            qrLabel: 'Pix QR code for payment',
            instruction: 'Ask the customer to scan the QR code in their bank app.',
            waiting: 'Waiting for payment'
        },
        approved: { title: 'Payment approved' },
        declined: {
            title: 'Payment not approved',
            message: 'The payment could not be completed.',
            timeoutMessage: 'The payment could not be completed. Try again or choose another payment method.',
            pinBlockedMessage: 'PIN blocked after too many attempts. Use another card or payment method.'
        },
        cancelled: {
            title: 'Operation canceled',
            message: 'The customer was not charged.'
        },
        cancelDialog: {
            title: 'Cancel operation?',
            text: 'Are you sure you want to cancel this operation?',
            resume: 'Continue payment',
            confirm: 'Cancel operation'
        },
        summary: {
            amount: 'Amount',
            fees: 'Fees',
            total: 'Total amount',
            method: 'Payment method',
            installments: 'Installments',
            date: 'Date',
            time: 'Time',
            transaction: 'Transaction',
            single: 'Single payment'
        },
        receipt: {
            prompt: 'Print the receipt?',
            title: 'PAYMENT RECEIPT',
            approvedTag: 'Approved',
            printing: 'Printing receipt',
            printed: '<strong>Receipt printed.</strong> Hand over the customer copy.'
        },
        refund: {
            title: 'Refund',
            listHint: 'Select a transaction or tap the card.',
            filterTitle: 'Filter',
            period: 'Select the period',
            periodPlaceholder: 'Period',
            periods: { today: 'Today', yesterday: 'Yesterday', week: 'Last 7 days' },
            timeRange: 'Enter the start and end time',
            startTime: 'Start time',
            endTime: 'End time',
            nsu: 'Enter the NSU',
            nsuPlaceholder: 'E.g. 000000',
            optional: '*Optional field',
            timeInvalid: 'Enter a valid time (00:00 to 23:59).',
            timeConfirm: 'Confirm',
            timeCancel: 'Cancel',
            search: 'Search',
            searchByCard: 'Search by card',
            filter: 'Filter',
            newFilter: 'New filter',
            searchingTitle: 'Searching transactions',
            searchingMessage: 'This may take a few seconds.',
            periodHeader: 'Period',
            cardHeader: 'Card',
            date: 'Date',
            time: 'Time',
            card: 'Card',
            value: 'Amount',
            aut: 'Auth.',
            now: 'Refund now',
            emptyTitle: 'No transactions found',
            emptyText: 'Try another period or search by card.',
            confirmTitle: 'Do you really want to refund?',
            no: 'No',
            yes: 'Yes',
            cardMessage: 'Waiting for the card used in the purchase.',
            processingTitle: 'Processing refund',
            approvedTitle: 'Refund approved',
            declinedTitle: 'Refund not approved',
            declinedMessage: 'The refund could not be completed. Try again.',
            cancelledMessage: 'No amount was returned to the customer.',
            cancel: 'Cancel refund',
            amountRow: 'Refunded amount',
            receiptTitle: 'REFUND RECEIPT',
            receiptTag: 'Refunded',
            types: { single: 'Credit, single payment', installments: 'Credit {count}x', debit: 'Debit', voucher: 'Voucher' }
        },
        sim: {
            title: 'Simulator',
            cardLabel: 'Customer card',
            tap: 'Tap card',
            insert: 'Insert card',
            swipe: 'Swipe card',
            cardHintIdle: 'The buttons become active when the app asks for the card.',
            cardHintActive: 'Choose how the customer presents the card.',
            outcomeLabel: 'Payment result',
            outcomeApproved: 'Approved',
            outcomeDeclined: 'Declined',
            outcomeTimeout: 'Timed out',
            pinHint: 'Test PIN: 1234. Contactless payments up to R$ 200,00 do not ask for a PIN.',
            reset: 'Restart app'
        }
    };

    // Language comes from the page that embeds the prototype (?lang=en|pt); falls back to the browser language
    function detectLang() {
        const fromUrl = new URLSearchParams(window.location.search).get('lang');
        if (fromUrl === 'en' || fromUrl === 'pt') return fromUrl;
        return /^pt/i.test(navigator.language || '') ? 'pt' : 'en';
    }

    const lang = detectLang();
    const Strings = lang === 'en' ? en : pt;
    document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';

    function lookup(path) {
        return path.split('.').reduce(function(obj, key) {
            return obj && obj[key] !== undefined ? obj[key] : undefined;
        }, Strings);
    }

    // Returns the string for a dotted key, replacing {token} placeholders.
    Strings.t = function(path, tokens) {
        const value = lookup(path);
        if (typeof value !== 'string') {
            console.warn('Missing string:', path);
            return '';
        }
        if (!tokens) return value;
        return value.replace(/\{(\w+)\}/g, function(_, k) {
            return tokens[k] !== undefined ? tokens[k] : '';
        });
    };

    Strings.lang = lang;
    window.Strings = Strings;
})();
