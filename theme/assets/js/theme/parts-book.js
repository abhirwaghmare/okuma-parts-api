import PageManager from './page-manager';

const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default class PartsBook extends PageManager {
    onReady() {
        // API URL injected server-side via {{inject 'partsBookApiUrl' theme_settings.parts_book_api_url}}
        // and available on this.context. Fall back to localhost:3001 for Stencil dev.
        const configUrl = (this.context && this.context.partsBookApiUrl) || '';
        this._apiUrl = configUrl || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : '');
        this._toc = null;
        this._currentPdfId = null;
        this._currentAssemblySlug = null;
        this._currentSheetSlug = null;
        this._currentParts = [];
        this._zoomLevel = 1;
        this._activeCallout = null;

        this._initSelects();
        this._initZoom();
        this._initTooltip();
        this._loadToc();
    }

    _initSelects() {
        $('#pb-select-assembly').prop('disabled', true);
        $('#pb-select-sheet').prop('disabled', true);
    }

    _loadToc() {
        const $nav = $('.parts-book__nav');
        const $loading = $nav.find('.parts-book__loading');
        $loading.attr({ 'aria-live': 'polite', 'aria-busy': 'true' }).show();

        fetch(`${this._apiUrl}/api/parts-book/toc`, { credentials: 'same-origin' })
            .then(res => {
                if (!res.ok) throw new Error(`TOC fetch failed: ${res.status}`);
                return res.json();
            })
            .then(toc => {
                this._toc = toc;
                $loading.attr('aria-busy', 'false').hide();
                this._populateMachineSelect(toc.documents);
            })
            .catch(err => {
                console.error('Parts book TOC error:', err);
                $loading.attr('aria-busy', 'false').hide();
                $nav.find('.parts-book__error')
                    .attr('role', 'alert')
                    .text('Failed to load parts book. Please try again.')
                    .show();
            });
    }

    _populateMachineSelect(documents) {
        const $select = $('#pb-select-machine');
        $select.find('option:not(:first)').remove();

        documents.forEach(doc => {
            $select.append($('<option>', { value: doc.id, text: doc.label }));
        });

        $select.off('change.pb').on('change.pb', () => {
            const pdfId = $select.val();
            if (pdfId) this._onMachineChange(pdfId);
        });
    }

    _onMachineChange(pdfId) {
        this._currentPdfId = pdfId;
        this._currentAssemblySlug = null;
        this._currentSheetSlug = null;

        const doc = this._toc.documents.find(d => d.id === pdfId);
        if (!doc) return;

        const $assemblySelect = $('#pb-select-assembly');
        const $sheetSelect = $('#pb-select-sheet');

        $assemblySelect.find('option:not(:first)').remove();
        $sheetSelect.find('option:not(:first)').remove();
        $sheetSelect.val('').prop('disabled', true);

        doc.assemblies.forEach(assembly => {
            $assemblySelect.append($('<option>', { value: assembly.slug, text: assembly.label }));
        });

        $assemblySelect.prop('disabled', false).val('');
        $('.parts-book__workspace').removeClass('is-visible');

        $assemblySelect.off('change.pb').on('change.pb', () => {
            const assemblySlug = $assemblySelect.val();
            if (assemblySlug) this._onAssemblyChange(pdfId, assemblySlug);
        });
    }

    _onAssemblyChange(pdfId, assemblySlug) {
        this._currentAssemblySlug = assemblySlug;
        this._currentSheetSlug = null;

        const doc = this._toc.documents.find(d => d.id === pdfId);
        if (!doc) return;

        const assembly = doc.assemblies.find(a => a.slug === assemblySlug);
        if (!assembly) return;

        const $sheetSelect = $('#pb-select-sheet');
        $sheetSelect.find('option:not(:first)').remove();

        assembly.sheets.forEach(sheet => {
            $sheetSelect.append($('<option>', { value: sheet.slug, text: sheet.label }));
        });

        $sheetSelect.prop('disabled', false).val('');

        $sheetSelect.off('change.pb').on('change.pb', () => {
            const sheetSlug = $sheetSelect.val();
            if (sheetSlug) this._onSheetChange(pdfId, assemblySlug, sheetSlug);
        });
    }

    _onSheetChange(pdfId, assemblySlug, sheetSlug) {
        this._currentPdfId = pdfId;
        this._currentAssemblySlug = assemblySlug;
        this._currentSheetSlug = sheetSlug;

        const $workspace = $('.parts-book__workspace');
        $workspace.addClass('is-loading').removeClass('is-visible').attr('aria-busy', 'true');
        $('.parts-book__workspace-error').hide();

        const url = `${this._apiUrl}/api/parts-book/sheets/${pdfId}/${assemblySlug}/${sheetSlug}/parts`;

        fetch(url, { credentials: 'same-origin' })
            .then(res => {
                if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
                return res.json();
            })
            .then(sheetData => {
                this._currentParts = sheetData.parts || [];
                $workspace.removeClass('is-loading').attr('aria-busy', 'false');
                this._renderDiagram(sheetData.sheet.diagramUrl, sheetData.sheet.label);
                this._renderPartsTable(sheetData.parts);
                $workspace.addClass('is-visible');
            })
            .catch(err => {
                console.error('Parts book sheet error:', err);
                $workspace.removeClass('is-loading').attr('aria-busy', 'false');
                $('.parts-book__workspace-error')
                    .attr('role', 'alert')
                    .text('Failed to load sheet data. Please try again.')
                    .show();
            });
    }

    _renderDiagram(diagramUrl, sheetLabel) {
        this._setZoom(1);
        const $img = $('img.parts-book__diagram-img');
        $img
            .attr('alt', sheetLabel ? `Assembly diagram: ${sheetLabel}` : 'Assembly diagram')
            .off('load.pb')
            .on('load.pb', () => {
                this._renderCallouts(this._currentParts);
            })
            .attr('src', diagramUrl);

        // If the browser served the image from cache, the load event already fired.
        if ($img[0].complete) {
            this._renderCallouts(this._currentParts);
        }
    }

    _renderCallouts(parts) {
        const $layer = $('.parts-book__callouts-layer');
        $layer.empty();

        (parts || []).forEach(part => {
            if (part.calloutX == null || part.calloutY == null) return;

            const $callout = $('<div>', {
                class: 'parts-book__callout',
                role: 'button',
                tabindex: '0',
                'aria-label': `Callout ${part.calloutNumber}: ${part.partNo}`,
                'aria-pressed': 'false',
                'data-callout-no': part.calloutNumber,
                'data-part-no': part.partNo,
                text: part.calloutNumber,
            }).css({ left: `${part.calloutX}%`, top: `${part.calloutY}%` });

            $callout.on('click', () => this._selectCallout(part.calloutNumber, part.partNo));
            $callout.on('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this._selectCallout(part.calloutNumber, part.partNo);
                }
            });
            $layer.append($callout);
        });
    }

    _renderPartsTable(parts) {
        const $tbody = $('.parts-book__tbody');
        $tbody.empty();

        (parts || []).forEach(part => {
            const price = part.price != null ? `$${Number(part.price).toFixed(2)}` : '—';
            const inStockText = part.inStock ? 'In Stock' : 'Out of Stock';
            const inStockClass = part.inStock ? 'badge--in-stock' : 'badge--out-of-stock';

            const $row = $('<tr>', {
                class: 'parts-book__table-row',
                tabindex: '0',
                'aria-label': `Part ${part.calloutNumber}: ${part.partNo}`,
                'aria-current': 'false',
                'data-callout-no': part.calloutNumber,
                'data-part-no': part.partNo,
            });

            const $qtyInput = $('<input>', {
                type: 'number',
                class: 'parts-book__td-qty-input form-input',
                value: 1,
                min: 1,
                'aria-label': `Order quantity for ${part.partNo}`,
            }).css({ width: '4rem', textAlign: 'center' });

            $row.append($('<td>', { class: 'parts-book__td', text: part.calloutNumber }));
            $row.append($('<td>', { class: 'parts-book__td', text: part.partNo }));
            $row.append($('<td>', { class: 'parts-book__td', text: part.name || '—' }));
            $row.append($('<td>', { class: 'parts-book__td', text: part.description || '—' }));
            $row.append($('<td>', { class: 'parts-book__td', text: part.qty }));
            $row.append($('<td>', { class: 'parts-book__td', text: price }));
            $row.append(
                $('<td>', { class: 'parts-book__td' }).append(
                    $('<span>', { class: `badge ${inStockClass}`, text: inStockText })
                )
            );
            $row.append($('<td>', { class: 'parts-book__td parts-book__td--qty' }).append($qtyInput));

            const $actionCell = $('<td>', { class: 'parts-book__td' });
            if (part.productId) {
                $actionCell.append(
                    $('<button>', {
                        class: 'button button--small pb-table-add-to-cart',
                        'data-product-id': part.productId,
                        'data-qty': '1',
                        'aria-label': `Add ${part.description} to cart`,
                        text: 'Add to Cart',
                    })
                );
            } else {
                $actionCell.text('—');
            }
            $row.append($actionCell);

            $row.on('click', e => {
                if (!$(e.target).closest('.pb-table-add-to-cart').length) {
                    this._selectCallout(part.calloutNumber, part.partNo);
                }
            });
            $row.on('keydown', e => {
                if ((e.key === 'Enter' || e.key === ' ') && !$(e.target).closest('.pb-table-add-to-cart').length) {
                    e.preventDefault();
                    this._selectCallout(part.calloutNumber, part.partNo);
                }
            });

            $tbody.append($row);
        });

        // Event delegation for add-to-cart buttons in the table
        $('.parts-book__table').off('click.pb-table').on('click.pb-table', '.pb-table-add-to-cart', e => {
            const $btn = $(e.currentTarget);
            const productId = parseInt($btn.data('product-id'), 10);
            const $row = $btn.closest('tr');
            const qty = parseInt($row.find('.parts-book__td-qty-input').val(), 10) || 1;
            this._addToCart(productId, qty);
        });
    }

    _selectCallout(calloutNumber, partNo) {
        this._activeCallout = calloutNumber;

        $('.parts-book__callout').removeClass('parts-book__callout--active').attr('aria-pressed', 'false');
        $('.parts-book__table-row').removeClass('parts-book__table-row--active').attr('aria-current', 'false');

        const safeCalloutNo = String(calloutNumber).replace(/["\\]/g, '');
        const $callout = $(`.parts-book__callout[data-callout-no="${safeCalloutNo}"]`);
        $callout.addClass('parts-book__callout--active').attr('aria-pressed', 'true');

        const $row = $(`.parts-book__tbody tr[data-callout-no="${safeCalloutNo}"]`);
        $row.addClass('parts-book__table-row--active').attr('aria-current', 'true');

        if ($row.length) {
            $row[0].scrollIntoView({
                behavior: prefersReducedMotion() ? 'auto' : 'smooth',
                block: 'nearest',
            });
        }

        const part = this._currentParts.find(p => p.partNo === partNo);
        if (part) {
            this._showTooltip(part, $callout[0]);
        }
    }

    _showTooltip(part, calloutEl) {
        const $tooltip = $('.parts-book__tooltip');

        $('.parts-book__tooltip-part-no').text(part.partNo);
        $('.parts-book__tooltip-name').text(part.description);
        $('.parts-book__tooltip-price').text(
            part.price != null ? `$${Number(part.price).toFixed(2)}` : 'Price on request'
        );

        const $addBtn = $tooltip.find('.pb-add-to-cart');
        $addBtn.data('product-id', part.productId || null).prop('disabled', !part.productId);
        if (part.productId) {
            $addBtn.removeAttr('aria-disabled');
        } else {
            $addBtn.attr('aria-disabled', 'true');
        }

        $tooltip.find('.pb-qty-input').val(1);

        $tooltip
            .removeAttr('hidden');

        if (calloutEl) {
            this._positionTooltip($tooltip[0], calloutEl);
        }

        $tooltip.find('.parts-book__tooltip-close').trigger('focus');
    }

    _positionTooltip(tooltipEl, anchorEl) {
        const anchorRect = anchorEl.getBoundingClientRect();
        const tooltipWidth = tooltipEl.offsetWidth || 240;
        const tooltipHeight = tooltipEl.offsetHeight || 180;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = anchorRect.right + window.scrollX + 8;
        let top = anchorRect.top + window.scrollY;

        if (left + tooltipWidth > viewportWidth + window.scrollX) {
            left = anchorRect.left + window.scrollX - tooltipWidth - 8;
        }

        if (top + tooltipHeight > viewportHeight + window.scrollY) {
            top = viewportHeight + window.scrollY - tooltipHeight - 8;
        }

        $(tooltipEl).css({ left: `${left}px`, top: `${top}px` });
    }

    _hideTooltip() {
        $('.parts-book__tooltip').attr('hidden', '');
        if (this._activeCallout != null) {
            const safeActive = String(this._activeCallout).replace(/["\\]/g, '');
            $(`.parts-book__callout[data-callout-no="${safeActive}"]`).trigger('focus');
        }
    }

    _initTooltip() {
        $('.parts-book__tooltip-close').on('click', () => this._hideTooltip());

        $(document).off('keydown.pb-tooltip').on('keydown.pb-tooltip', e => {
            if (e.key === 'Escape' && !$('.parts-book__tooltip').attr('hidden')) {
                this._hideTooltip();
            }
        });

        $('.pb-qty-minus').on('click', () => {
            const $input = $('.pb-qty-input');
            const current = parseInt($input.val(), 10) || 1;
            if (current > 1) $input.val(current - 1);
        });

        $('.pb-qty-plus').on('click', () => {
            const $input = $('.pb-qty-input');
            const current = parseInt($input.val(), 10) || 1;
            $input.val(current + 1);
        });

        $('.pb-add-to-cart').on('click', () => {
            const $btn = $('.pb-add-to-cart');
            const productId = parseInt($btn.data('product-id'), 10);
            const qty = parseInt($('.pb-qty-input').val(), 10) || 1;
            if (productId) this._addToCart(productId, qty);
        });
    }

    async _addToCart(productId, quantity) {
        try {
            const cartsRes = await fetch('/api/storefront/carts', { credentials: 'same-origin' });
            if (!cartsRes.ok) throw new Error(`Carts fetch failed: ${cartsRes.status}`);
            const carts = await cartsRes.json();
            const cartId = carts.length > 0 ? carts[0].id : null;
            const url = cartId ? `/api/storefront/carts/${cartId}/items` : '/api/storefront/carts';
            const res = await fetch(url, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lineItems: [{ productId, quantity }] }),
            });
            if (!res.ok) throw new Error('Add to cart failed');
            $('[data-cart-quantity]').trigger('cart-quantity-update');
            this._showAddToCartSuccess();
        } catch (err) {
            console.error('Add to cart error:', err);
            this._showAddToCartError();
        }
    }

    _showAddToCartSuccess() {
        const $feedback = $('.parts-book__cart-feedback');
        $feedback
            .attr('role', 'status')
            .text('Item added to cart.')
            .removeClass('parts-book__cart-feedback--error')
            .addClass('parts-book__cart-feedback--success')
            .show();
        setTimeout(() => $feedback.fadeOut(), 3000);
    }

    _showAddToCartError() {
        const $feedback = $('.parts-book__cart-feedback');
        $feedback
            .attr('role', 'alert')
            .text('Could not add to cart. Please try again.')
            .removeClass('parts-book__cart-feedback--success')
            .addClass('parts-book__cart-feedback--error')
            .show();
        setTimeout(() => $feedback.fadeOut(), 4000);
    }

    _initZoom() {
        $('.parts-book__zoom-in').on('click', () => this._setZoom(this._zoomLevel + 0.25));
        $('.parts-book__zoom-out').on('click', () => this._setZoom(this._zoomLevel - 0.25));
        $('.parts-book__zoom-reset').on('click', () => this._setZoom(1.0));
    }

    _setZoom(level) {
        this._zoomLevel = Math.min(3.0, Math.max(0.5, level));
        $('.parts-book__diagram-inner').css({
            transform: `scale(${this._zoomLevel})`,
            'transform-origin': 'top left',
        });
    }
}
