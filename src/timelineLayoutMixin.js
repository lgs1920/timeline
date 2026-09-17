/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: timelineLayoutMixin.js
 *
 * Author : LGS1920 Team
 * email: studio@lgs1920.fr
 *
 * Created on: 2026-09-17
 * Last modified: 2026-09-17
 *
 *
 * Copyright © 2026 LGS1920
 ******************************************************************************/

import * as timelineUtils from './timelineUtils.js'

/**
 * Add timeline rendering, structure, and layout methods to a timeline host.
 *
 * @param {typeof HTMLElement} Base - Host class.
 * @returns {typeof HTMLElement} Extended host class.
 */
export const TimelineLayoutMixin = Base => class extends Base {
    _render = (options = {}) => {
        const startedAt = globalThis.performance?.now?.() ?? Date.now()
        const phase = this._projection ? 'active' : 'empty'
        this._renderStructure(options)
        console.log('[LGS1920Timeline] render', {
            phase,
            durationMs: Number(((globalThis.performance?.now?.() ?? Date.now()) - startedAt).toFixed(2)),
        })
    }

    /**
     * Cancel a deferred vertical scroll restoration.
     */
    _cancelVerticalScrollRestore = () => {
        if (this._verticalScrollRestoreFrame !== null) globalThis.cancelAnimationFrame?.(this._verticalScrollRestoreFrame)
        this._verticalScrollRestoreFrame = null
        this._verticalScrollRestoreTarget = null
    }

    /**
     * Restore both synchronized vertical views after the new layout has settled.
     *
     * @param {number} scrollTop - Target vertical scroll offset.
     */
    _restoreVerticalScroll = scrollTop => {
        const target = Math.max(0, Number(scrollTop) || 0)
        const canDefer = typeof globalThis.requestAnimationFrame === 'function'
        this._lastVerticalScrollTop = target
        this._verticalScrollRestoreTarget = target > 0 ? target : null
        const apply = targetValue => {
            const tracksViewport = this._tracksViewport
            if (!tracksViewport) return
            tracksViewport.scrollTop = targetValue
            const legend = this._root.querySelector('[data-scroll-view="legend"]')
            if (legend) legend.scrollTop = targetValue
            this._updateScrollbars()
        }
        apply(target)
        if (!canDefer) {
            this._verticalScrollRestoreTarget = null
            return
        }
        if (this._verticalScrollRestoreFrame !== null) return
        this._verticalScrollRestoreFrame = globalThis.requestAnimationFrame(() => {
            this._verticalScrollRestoreFrame = globalThis.requestAnimationFrame(() => {
                this._verticalScrollRestoreFrame = null
                const pendingTarget = this._verticalScrollRestoreTarget
                if (pendingTarget === null) return
                this._verticalScrollRestoreTarget = null
                this._lastVerticalScrollTop = pendingTarget
                apply(pendingTarget)
            })
        })
    }

    /**
     * Get the synchronized vertical scroll position of the track views.
     *
     * @returns {number} Vertical scroll offset in pixels.
     */
    get verticalScrollTop() {
        return Math.max(0, Number(this._tracksViewport?.scrollTop ?? this._lastVerticalScrollTop ?? 0) || 0)
    }

    /**
     * Restore the synchronized vertical scroll position of the track views.
     *
     * @param {number} value - Vertical scroll offset in pixels.
     */
    set verticalScrollTop(value) {
        this._restoreVerticalScroll(value)
    }

    _renderStructure = ({replaceRoot = false} = {}) => {
        this._reconcileClipSelection()
        if (!this._visible || !this._projection) {
            this._cancelBuildingCompletion()
            this._cancelLegendWidthCorrection()
            this._building = this._visible
                && !this._initialBuildComplete
                && this._timelineConfig.showBuildingOverlay !== false
            // Keep the host in the layout while the initial projection is pending so
            // the opaque construction overlay can cover the first incomplete frame.
            this.hidden = !this._building && (!this._visible || !this._projection)
            this._finishScrollbarDrag()
            this._externalInteractionActive = false
            this._scrollbarsInteractionActive = false
            this._clearScrollbarHideTimer()
            const initialOverlay = this._building
                ? this._root.querySelector('[data-building-overlay]') ?? this._buildingOverlay()
                : null
            this._root.replaceChildren(
                this._root.querySelector('style'),
                ...(initialOverlay ? [initialOverlay] : []),
            )
            this._surface = null
            this._tracksViewport = null
            this._pendingTracksScrollTop = null
            this._cancelVerticalScrollRestore()
            this._dynamicElements = null
            this._clipPresentationElements = null
            this._scrollbars.invalidate()
            this._domCache.invalidate()
            this._transportState = null
            return
        }

        const initialOverlayEnabled = this._timelineConfig.showBuildingOverlay !== false
        if (!this._initialBuildComplete && initialOverlayEnabled) {
            if (this._openingBuildingStartedAt === null) {
                this._openingBuildingStartedAt = globalThis.performance?.now?.() ?? Date.now()
            }
            // A copy preview rerenders the timeline while the initial layout is
            // settling. Keep that completion alive so the preview cannot reset
            // the construction overlay.
            if (!this._building) this._startBuilding()
        }
        else {
            this._cancelBuildingCompletion()
            this._building = false
        }
        this.hidden = false
        const {minimum: legendMinimum, maximum: legendMaximum, initial: legendInitial} = timelineUtils.resolveLegendBounds(this._timelineConfig)
        if (!Number.isFinite(this._legendWidth)) this._legendWidth = legendInitial
        const previousScrollLeft = this._surface?.scrollLeft ?? 0
        const previousSurfaceRect = this._surface?.getBoundingClientRect?.()
        const previousAnchorTimeSeconds = previousSurfaceRect
            ? this._timeAtClientX(previousSurfaceRect.left)
            : null
        const currentScrollTop = this._tracksViewport?.scrollTop
        const previousScrollTop = this._pendingTracksScrollTop
            ?? this._verticalScrollRestoreTarget
            ?? (Number(currentScrollTop) > 0
                ? currentScrollTop
                : this._lastVerticalScrollTop
                    ?? currentScrollTop
                    ?? 0)
        this._pendingTracksScrollTop = null
        this._finishScrollbarDrag()
        this._zoom = this._horizontalFitActive
            ? this._minimumHorizontalZoom()
            : this._clampHorizontalZoom(this._zoom)
        const {majorSeconds, scaleSplitCount} = this._resolveScale()
        const durationSeconds = this._durationSeconds()
        const scaleWidth = this._scaleWidth()
        this._cachePlayheadGeometry(majorSeconds, scaleWidth)
        const scaleCount = this._scaleCountForDuration(durationSeconds, majorSeconds, scaleWidth)
        this._contentWidth = Math.max(this._clipWorkspaceWidth, this._contentWidthForDuration(durationSeconds, majorSeconds, scaleWidth))
        this._updateTrackGridGeometry(this._root.querySelector('[part="timeline"]'), scaleWidth, scaleSplitCount)
        this._rowHeight = this._resolveRowHeight()
        const structure = this._structure(scaleCount, majorSeconds, scaleSplitCount)
        const initialOverlay = this._building
            ? this._root.querySelector('[data-building-overlay]') ?? this._buildingOverlay()
            : null
        const reusedStructure = !replaceRoot && this._reuseSplitPanel(structure)
        if (!reusedStructure) {
            this._root.replaceChildren(
                this._root.querySelector('style'),
                structure,
                ...(initialOverlay ? [initialOverlay] : []),
            )
        }
        else {
            const currentOverlay = this._root.querySelector('[data-building-overlay]')
            if (currentOverlay && currentOverlay !== initialOverlay) currentOverlay.remove()
            if (initialOverlay && !initialOverlay.isConnected) this._root.append(initialOverlay)
        }
        this._updateAdditionalContentPresentation()
        this._applyLegendWidth(this._root.querySelector('[part="split-panel"]'), {
            minimum: legendMinimum,
            maximum: legendMaximum,
            preferred: this._legendWidth ?? legendInitial,
        })
        this._surface = this._root.querySelector('[data-surface]')
        this._tracksViewport = this._root.querySelector('[data-tracks-viewport]')
        this._cacheDynamicElements()
        this._cacheClipPresentationElements()
        this._cacheScrollbarElements()
        const measuredSurfaceWidth = this._surface?.clientWidth ?? 0
        const surfaceWidthChanged = measuredSurfaceWidth > 0 && measuredSurfaceWidth !== this._surfaceWidth
        if (surfaceWidthChanged) this._surfaceWidth = measuredSurfaceWidth
        if (surfaceWidthChanged) {
            this._pendingTracksScrollTop = previousScrollTop
            this._render()
            return
        }
        if (this._surface) {
            // Preserve the time at the viewport edge, even when a duration
            // change causes the ruler scale or content width to be rebuilt.
            const maximumScrollLeft = Math.max(
                0,
                Math.max(this._surface.scrollWidth, this._contentWidth)
                    - (this._surface.clientWidth || 0),
            )
            if (Number.isFinite(previousAnchorTimeSeconds)) {
                this._surface.scrollLeft = timelineUtils.clamp(
                    (previousAnchorTimeSeconds / majorSeconds) * scaleWidth,
                    0,
                    maximumScrollLeft,
                )
            } else {
                this._surface.scrollLeft = timelineUtils.clamp(previousScrollLeft, 0, maximumScrollLeft)
            }
        }
        this._positionInitialRangeStart()
        this._updateFixedRulerContent(this._surface)
        if (this._tracksViewport) {
            this._restoreVerticalScroll(previousScrollTop)
        }
        this._positionRowDragGhost()
        this._updateLegendScroll()
        this._updateScrollbars()
        this._showScrollbars()
        this._scheduleScrollbarHide()
        const renderedSurface = this._surface
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => {
                if (this._surface === renderedSurface) this._updateScrollbars()
            })
        }
        this._updateDynamicState()
        if (this._dragState?.external === true) this._updateClipInteractionPresentation()
        this._updateClipSelectionPresentation()
        this._updateClipCopyPresentation()
        this._scheduleClipCopyPresentation()
        this._updateClipSnapGuidePresentation()
        if (!this._initialBuildComplete && this.isConnected) {
            if (initialOverlayEnabled) this._scheduleBuildingCompletion()
            else this._initialBuildComplete = true
        }
    }

    /**
     * Keep the construction overlay visible until the initial mount settles.
     *
     * @returns {void}
     */
    _startBuilding = () => {
        this._cancelBuildingCompletion()
        this._building = true
        this._buildingLayoutSignature = null
    }

    /**
     * Capture the measurable layout state used to release the building overlay.
     *
     * @returns {string} Stable layout signature.
     */
    _buildingLayout = () => {
        const surface = this._surface
        const canvas = this._root.querySelector('[part="canvas"]')
        const tracks = this._root.querySelector('[part="tracks"]')
        const surfaceRect = surface?.getBoundingClientRect?.() ?? {}
        const canvasRect = canvas?.getBoundingClientRect?.() ?? {}
        return [
            surface?.clientWidth ?? 0,
            surface?.clientHeight ?? 0,
            surface?.scrollWidth ?? 0,
            surfaceRect.width ?? 0,
            surfaceRect.height ?? 0,
            canvas?.style.width ?? '',
            canvasRect.width ?? 0,
            canvasRect.height ?? 0,
            tracks?.style.width ?? '',
        ].join('|')
    }

    /**
     * Remove the construction overlay after the rendered timeline has settled.
     *
     * @returns {void}
     */
    _scheduleBuildingCompletion = () => {
        if (this._clipCopyState && this._buildingFrame !== null) return
        const complete = () => {
            this._buildingFrame = null
            const surfaceWidth = this._surface?.clientWidth ?? 0
            const layoutMeasured = this._surfaceWidth > 0 || surfaceWidth > 0
            const layoutSignature = this._buildingLayout()
            const layoutStable = layoutSignature === this._buildingLayoutSignature
            if (typeof requestAnimationFrame === 'function'
                && typeof ResizeObserver !== 'undefined'
                && this._projection
                && !layoutMeasured) {
                this._buildingLayoutSignature = layoutSignature
                this._buildingFrame = requestAnimationFrame(() => {
                    this._buildingFrame = requestAnimationFrame(complete)
                })
                return
            }
            this._building = false
            this._initialBuildComplete = true
            this._buildingLayoutSignature = null
            console.log('[LGS1920Timeline] building overlay complete', {
                durationMs: Number(((globalThis.performance?.now?.() ?? Date.now()) - (this._openingBuildingStartedAt ?? (globalThis.performance?.now?.() ?? Date.now()))).toFixed(2)),
                layoutMeasured,
                layoutStable,
            })
            this._openingBuildingStartedAt = null
            this._root.querySelector('[data-building-overlay]')?.remove()
            this._root.querySelector('[data-building]')?.removeAttribute('data-building')
        }
        if (typeof requestAnimationFrame !== 'function') {
            complete()
            return
        }
        this._buildingFrame = requestAnimationFrame(() => {
            this._buildingFrame = requestAnimationFrame(complete)
        })
    }

    /**
     * Cancel a pending construction-overlay completion.
     *
     * @returns {void}
     */
    _cancelBuildingCompletion = () => {
        if (this._buildingFrame === null) return
        if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this._buildingFrame)
        this._buildingFrame = null
    }

    /**
     * Resolve the row height from the actual track layout when available.
     *
     * The host can also contain a header area, so using its full height would
     * make the rows overflow below the timeline surface.
     *
     * @returns {number} Row height in pixels.
     */
    _resolveRowHeight = () => {
        const layoutHeight = this._root.querySelector('[data-layout]')?.getBoundingClientRect?.().height ?? 0
        const hostHeight = this.getBoundingClientRect?.().height ?? 0
        const height = layoutHeight > 0 ? layoutHeight : hostHeight
        const headerHeight = this._numericToken('header-height', timelineUtils.HEADER_HEIGHT)
        const scrollbarHeight = this._numericToken('scrollbar-height', timelineUtils.HORIZONTAL_SCROLLBAR_HEIGHT)
        const minimumRowHeight = this._numericToken('row-height', timelineUtils.MIN_ROW_HEIGHT)
        const available = Number(height) - headerHeight - scrollbarHeight
        const naturalRowHeight = Math.max(minimumRowHeight, Math.floor(available / Math.max(1, this._rows.length)))
        const requestedRowHeight = Number.isFinite(this._verticalZoomRowHeight)
            ? this._verticalZoomRowHeight
            : naturalRowHeight
        return timelineUtils.clamp(requestedRowHeight, minimumRowHeight, timelineUtils.MAX_ROW_HEIGHT)
    }

    /**
     * Create the generic expandable panel for application-provided content.
     *
     * @returns {HTMLElement|null} Additional-content panel, or null when empty.
     */
    _additionalContent = () => {
        const hasContent = [...this.children].some(element => element.slot === 'additional-content')
        if (!hasContent) return null

        const container = timelineUtils.createElement('div', 'lgs1920-wa-timeline__additional-content', {
            part: 'additional-content',
        })
        const labelContent = this._globalSlotContent('additional-content-label', document.createTextNode('Additional content'))
        const labelText = labelContent.map(node => node.textContent ?? '').join('').trim() || 'Additional content'
        const drawer = timelineUtils.createElement('wa-drawer', 'lgs1920-wa-timeline__additional-content-panel', {
            'aria-label': labelText,
            'data-testid': 'lgs1920-timeline-additional-content-drawer',
            'light-dismiss': true,
            open: this._additionalContentOpen,
            part: 'additional-content-panel',
            placement: 'top',
            'without-header': true,
        })
        const drawerLabel = timelineUtils.createElement('span', '', {slot: 'label'})
        labelContent.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) node.removeAttribute('slot')
            drawerLabel.append(node)
        })
        drawer.append(
            drawerLabel,
            timelineUtils.createElement('slot', 'lgs1920-wa-timeline__additional-content-slot', {name: 'additional-content'}),
        )
        drawer.addEventListener('wa-show', this._handleAdditionalContentShow)
        drawer.addEventListener('wa-hide', this._handleAdditionalContentHide)
        drawer.id = this._additionalContentPanelId
        container.append(drawer)
        return container
    }

    /**
     * Create the component structure for one render pass.
     *
     * @param {number} scaleCount - Number of major ruler units.
     * @param {number} majorSeconds - Seconds represented by one major unit.
     * @param {number} scaleSplitCount - Minor ruler subdivision count.
     * @returns {HTMLElement} Rendered section.
     */
    _structure = (scaleCount, majorSeconds, scaleSplitCount) => {
        const section = timelineUtils.createElement('wa-card', 'lgs1920-wa-timeline', {
            part: 'timeline',
            'data-testid': 'lgs1920-wa-timeline',
            'aria-label': this.getAttribute('aria-label') || 'Video timeline tracks',
            appearance: 'plain',
        })
        this._updateTrackGridGeometry(section, this._scaleWidth(), scaleSplitCount)
        if (this._building) section.setAttribute('data-building', '')
        const additionalContent = this._additionalContent()
        if (additionalContent) section.append(additionalContent)
        section.append(this._slotRegistry())

        const top = timelineUtils.createElement('div', 'lgs1920-wa-timeline__top', {part: 'top'})
        const header = timelineUtils.createElement('header', 'lgs1920-wa-timeline__header', {part: 'header'})
        const headerStart = timelineUtils.createElement('span', 'lgs1920-wa-timeline__header-start', {part: 'header-start'})
        const headerActions = timelineUtils.createElement('span', 'lgs1920-wa-timeline__header-actions', {part: 'header-actions'})
        headerActions.append(
            timelineUtils.createElement('slot', '', {name: 'timeline-actions'}),
            timelineUtils.createElement('slot', '', {name: 'header-actions'}),
        )
        headerStart.append(timelineUtils.createElement('slot', '', {name: 'header'}))
        const headerEnd = timelineUtils.createElement('span', 'lgs1920-wa-timeline__header-end', {part: 'header-end'})
        const playbackControls = this._playbackControls()
        headerEnd.append(headerActions)
        header.append(
            headerStart,
            timelineUtils.createElement('slot', 'lgs1920-wa-timeline__custom-menu', {
                name: 'custom-menu',
                part: 'custom-menu',
            }),
            headerEnd,
        )
        top.append(header)

        const playback = timelineUtils.createElement('div', 'lgs1920-wa-timeline__playback-controls', {part: 'playback-controls', 'aria-label': 'Timeline playback controls'})
        const timeSliderSlot = timelineUtils.createElement('slot', '', {name: 'time-slider'})
        const timeSlider = this._controls.timelineScrubber()
        if (timeSlider) timeSliderSlot.append(timeSlider)
        const playbackTransport = timelineUtils.createElement('span', 'lgs1920-wa-timeline__playback-transport', {part: 'playback-transport'})
        if (playbackControls) playbackTransport.append(playbackControls)
        playbackTransport.append(timelineUtils.createElement('slot', '', {name: 'transport'}))
        if (playbackControls && !this.noLoopMode) {
            const loopButton = this._loopButton()
            playbackTransport.append(loopButton, this._tooltip(loopButton.id, loopButton.getAttribute('aria-label')))
        }
        playback.append(
            timeSliderSlot,
            playbackTransport,
            timelineUtils.createElement('slot', '', {name: 'playback-start'}),
            this._slotWithFallback('playback-current', this._timeText(this._currentTimeMillis / 1000, 'current')),
            this._slotWithFallback('playback-total', this._timeText(this._durationSeconds(), 'total')),
            timelineUtils.createElement('slot', '', {name: 'playback-end'}),
        )
        top.append(playback)
        section.append(top)

        const layout = timelineUtils.createElement('div', 'lgs1920-wa-timeline__layout', {
            part: 'layout',
            'data-layout': '',
        })
        layout.style.setProperty('--lgs-timeline-row-height', `${this._rowHeight}px`)
        layout.append(this._splitPanel(scaleCount, majorSeconds, scaleSplitCount))
        section.append(layout)
        const clipContextMenu = this._clipContextMenu()
        if (clipContextMenu) section.append(clipContextMenu)
        const trackContextMenu = this._trackContextMenu()
        if (trackContextMenu) section.append(trackContextMenu)
        const footer = timelineUtils.createElement('footer', 'lgs1920-wa-timeline__footer', {
            part: 'footer',
        })
        const footerControls = timelineUtils.createElement('span', 'lgs1920-wa-timeline__footer-controls', {
            part: 'footer-controls',
        })
        const tools = this._controls.timelineTools()
        if (tools) footerControls.append(tools)
        const zoomControl = this._controls.timelineZoomControl()
        if (zoomControl) footerControls.append(zoomControl)
        footerControls.append(timelineUtils.createElement('slot', '', {name: 'timeline-controls'}))
        footer.append(
            footerControls,
            timelineUtils.createElement('slot', '', {name: 'footer'}),
        )
        section.append(footer)
        return section
    }

    /**
     * Create the opaque overlay shown while the timeline is being constructed.
     *
     * @returns {HTMLElement} Construction overlay.
     */
    _buildingOverlay = () => {
        const icon = timelineUtils.createIcon('paintbrush', 'solid')
        icon.setAttribute('animation', 'wag')
        icon.setAttribute('aria-hidden', 'true')
        icon.setAttribute('role', 'presentation')
        const label = timelineUtils.createElement('span', 'lgs1920-wa-timeline__building-overlay-text', {
            part: 'building-overlay-text',
        })
        label.append(this._slotWithFallback('overlay-text', document.createTextNode('Building...')))
        const overlay = timelineUtils.createElement('div', 'lgs1920-wa-timeline__building-overlay', {
            part: 'building-overlay',
            'data-building-overlay': '',
            role: 'status',
            'aria-live': 'polite',
        })
        overlay.append(icon, label)
        return overlay
    }

    /**
     * Create the Web Awesome split panel for the track legend and time surface.
     *
     * @param {number} scaleCount - Number of major ruler units.
     * @param {number} majorSeconds - Seconds represented by one major unit.
     * @param {number} scaleSplitCount - Minor ruler subdivision count.
     * @returns {HTMLElement} Split panel element.
     */
    _splitPanel = (scaleCount, majorSeconds, scaleSplitCount) => {
        const {minimum, maximum} = timelineUtils.resolveLegendBounds(this._timelineConfig)
        const splitPanel = timelineUtils.createElement('wa-split-panel', 'lgs1920-wa-timeline__split-panel', {
            part: 'split-panel',
            orientation: 'horizontal',
            primary: 'start',
        })
        splitPanel.style.setProperty('--min', `${minimum}px`)
        splitPanel.style.setProperty('--max', `min(${maximum}px, calc(100% - ${minimum}px))`)
        splitPanel.style.setProperty('--divider-width', 'var(--lgs-timeline-resizer-width)')
        splitPanel.style.setProperty('--divider-hit-area', 'var(--lgs-timeline-resizer-hit-area)')
        splitPanel.addEventListener('mousedown', this._startNativeSplitPanelInteraction)
        splitPanel.addEventListener('touchstart', this._startNativeSplitPanelInteraction)
        splitPanel.addEventListener('wa-reposition', this._handleSplitPanelReposition)

        const legend = this._legend()
        legend.slot = 'start'
        const surface = this._surfaceElement(scaleCount, majorSeconds, scaleSplitCount)
        surface.slot = 'end'
        const dividerGrip = timelineUtils.createIcon('grip-vertical', 'solid')
        dividerGrip.slot = 'divider'
        splitPanel.append(legend, surface, dividerGrip)
        return splitPanel
    }

    /**
     * Apply the title panel width after the split panel has entered the DOM.
     *
     * Web Awesome resolves pixel positions against its measured panel size.
     * Applying the initial width before connection can therefore resolve to the
     * lower CSS bound. A second frame also covers the first real layout pass.
     *
     * @param {HTMLElement|null} splitPanel - Native split panel element.
     * @param {{minimum: number, maximum: number, preferred: number}} bounds - Width bounds.
     * @returns {void}
     */
    _cancelLegendWidthCorrection = () => {
        const correction = this._legendWidthCorrection
        if (!correction) return
        if (correction.firstFrame !== null) globalThis.cancelAnimationFrame?.(correction.firstFrame)
        if (correction.secondFrame !== null) globalThis.cancelAnimationFrame?.(correction.secondFrame)
        this._legendWidthCorrection = null
    }

    /**
     * Resolve an optional class supplied by the embedding host.
     *
     * @returns {string} Leading-space class suffix, or an empty string.
     */
    _hostNoDragClasses = () => {
        const className = String(this._timelineConfig.hostNoDragClass ?? '').trim()
        return className ? ` ${className}` : ''
    }

    _applyLegendWidth = (splitPanel, {minimum, maximum, preferred}) => {
        if (!splitPanel) {
            this._cancelLegendWidthCorrection()
            return
        }
        const requested = timelineUtils.clamp(Number(preferred) || 0, minimum, maximum)
        const correction = this._legendWidthCorrection
        if (correction?.splitPanel === splitPanel && correction.requested === requested) return
        if (correction) this._cancelLegendWidthCorrection()

        const currentPosition = Number(splitPanel.positionInPixels)
        const positionMatches = Number.isFinite(currentPosition) && currentPosition === requested
        this._legendWidth = requested
        if (!positionMatches) splitPanel.positionInPixels = requested
        if (!this._initialBuildComplete) {
            this._legendWidthCorrectionNeedsMeasure = true
            console.log('[LGS1920Timeline] split panel deferred correction skipped while building')
            return
        }
        if (positionMatches && !this._legendWidthCorrectionNeedsMeasure) return
        this._legendWidthCorrectionNeedsMeasure = false

        const applyMeasuredWidth = activeCorrection => {
            if (this._legendWidthCorrection !== activeCorrection || !splitPanel.isConnected) return null
            const panelWidth = splitPanel.getBoundingClientRect?.().width ?? 0
            if (!Number.isFinite(panelWidth) || panelWidth <= 0) return null
            const measuredMaximum = Math.max(minimum, Math.min(maximum, panelWidth - minimum))
            const resolved = timelineUtils.clamp(activeCorrection.requested, minimum, measuredMaximum)
            if (Number(splitPanel.positionInPixels) !== resolved) splitPanel.positionInPixels = resolved
            this._legendWidth = resolved
            return resolved
        }

        if (typeof globalThis.requestAnimationFrame !== 'function') {
            const immediateCorrection = {splitPanel, requested, firstFrame: null, secondFrame: null}
            this._legendWidthCorrection = immediateCorrection
            const resolved = applyMeasuredWidth(immediateCorrection)
            this._legendWidthCorrection = null
            this._legendWidthCorrectionNeedsMeasure = resolved === null
            return
        }

        const startedAt = globalThis.performance?.now?.() ?? Date.now()
        const scheduledCorrection = {splitPanel, requested, firstFrame: null, secondFrame: null}
        this._legendWidthCorrection = scheduledCorrection
        scheduledCorrection.firstFrame = globalThis.requestAnimationFrame(() => {
            scheduledCorrection.firstFrame = null
            if (this._legendWidthCorrection !== scheduledCorrection) return
            applyMeasuredWidth(scheduledCorrection)
            scheduledCorrection.secondFrame = globalThis.requestAnimationFrame(() => {
                scheduledCorrection.secondFrame = null
                if (this._legendWidthCorrection !== scheduledCorrection) return
                const resolved = applyMeasuredWidth(scheduledCorrection)
                this._legendWidthCorrection = null
                this._legendWidthCorrectionNeedsMeasure = resolved === null
                console.log('[LGS1920Timeline] split panel measured', {
                    durationMs: Number(((globalThis.performance?.now?.() ?? Date.now()) - startedAt).toFixed(2)),
                    width: splitPanel.getBoundingClientRect?.().width ?? 0,
                })
            })
        })
    }

    /**
     * Create the Web Awesome video timeline playback controls.
     *
     * @returns {HTMLElement|null} Transport toolbar, or null for display-only timelines.
     */
    _playbackControls = () => {
        const readonly = this._isReadonlyMode()
        if (this._timelineConfig.interactive === false && !readonly) return null
        const controls = timelineUtils.createElement('div', `lgs1920-wa-timeline__transport${this._hostNoDragClasses()}`, {
            part: 'transport',
            'aria-label': 'Timeline transport controls',
        })
        const transportButtons = timelineUtils.createElement('div', 'lgs1920-wa-timeline__transport-buttons', {
            label: 'Timeline transport controls',
            part: 'controls',
            role: 'toolbar',
            'aria-label': 'Timeline transport controls',
        })
        const start = this._button({
            iconName: 'backward-step',
            label: 'Go to start',
            testId: 'timeline-restart',
            iconSlot: 'start-icon',
            variant: 'brand',
            appearance: 'plain',
            disabled: this._isAtRangeStart(),
        })
        start.id = 'lgs1920-timeline-transport-start'
        start.addEventListener('click', event => {
            if (start.hasAttribute('disabled')) return
            const detail = this._positionDetail({
                source: 'go-to-start',
                timeMillis: this._rangeStartMillis,
                event,
            })
            if (!this._emitAction('restart', detail)) return
            this.setTime(detail.timeMillis)
        })
        const previous = this._button({
            iconName: 'chevron-left',
            label: 'Previous frame',
            testId: 'timeline-previous-frame',
            iconSlot: 'previous-frame-icon',
            variant: 'brand',
            appearance: 'plain',
            disabled: this._isAtRangeStart(),
        })
        previous.id = 'lgs1920-timeline-transport-previous'
        previous.addEventListener('click', event => {
            if (previous.hasAttribute('disabled')) return
            this._emitAction('seek', this._frameStepDetail(-1, event))
        })
        const play = this._button({
            iconName: this._playing ? 'pause' : 'play',
            label: this._playing ? 'Pause timeline' : 'Play timeline',
            testId: 'timeline-play',
            iconSlot: this._playing ? 'pause-icon' : 'play-icon',
            variant: 'brand',
            appearance: 'plain',
        })
        play.id = 'lgs1920-timeline-transport-play'
        play.addEventListener('click', event => {
            const playing = !this._playing
            const timeMillis = playing ? this._rangeStartMillis : this._currentTimeMillis
            const detail = {
                source: playing ? 'timeline-play' : 'timeline-pause',
                timeMillis,
                event,
            }
            if (!this._emitAction(playing ? 'play' : 'pause', detail)) return
            if (playing) this.setTime(timeMillis)
        })
        const stop = this._button({
            iconName: 'stop',
            label: 'Stop',
            testId: 'timeline-stop',
            iconSlot: 'stop-icon',
            variant: 'brand',
            appearance: 'plain',
        })
        stop.id = 'lgs1920-timeline-transport-stop'
        stop.addEventListener('click', event => this._emitAction('stop', {
            source: 'timeline-stop',
            timeMillis: this._currentTimeMillis,
            event,
        }))
        const next = this._button({
            iconName: 'chevron-right',
            label: 'Next frame',
            testId: 'timeline-next-frame',
            iconSlot: 'next-frame-icon',
            variant: 'brand',
            appearance: 'plain',
            disabled: this._isAtRangeEnd(),
        })
        next.id = 'lgs1920-timeline-transport-next'
        next.addEventListener('click', event => {
            if (next.hasAttribute('disabled')) return
            this._emitAction('seek', this._frameStepDetail(1, event))
        })
        const end = this._button({
            iconName: 'forward-step',
            label: 'Go to timeline end',
            testId: 'timeline-end',
            iconSlot: 'end-icon',
            variant: 'brand',
            appearance: 'plain',
            disabled: this._isAtRangeEnd(),
        })
        end.id = 'lgs1920-timeline-transport-end'
        end.addEventListener('click', event => {
            if (end.hasAttribute('disabled')) return
            const detail = this._positionDetail({
                source: 'go-to-end',
                timeMillis: this._rangeEndMillis,
                event,
            })
            if (!this._emitAction('seek', detail)) return
            this.setTime(detail.timeMillis)
        })
        transportButtons.append(
            start,
            this._tooltip(start.id, 'Go to start'),
            previous,
            this._tooltip(previous.id, 'Previous frame'),
            play,
            this._tooltip(play.id, this._playing ? 'Pause timeline' : 'Play timeline'),
            stop,
            this._tooltip(stop.id, 'Stop'),
            next,
            this._tooltip(next.id, 'Next frame'),
            end,
            this._tooltip(end.id, 'Go to timeline end'),
        )
        controls.append(transportButtons)
        return controls
    }

    /**
     * Create the loop-mode toggle for the playback transport area.
     *
     * @returns {HTMLElement} Loop-mode button.
     */
    _loopButton = () => {
        const label = this._looping ? 'Disable loop mode' : 'Enable loop mode'
        const button = this._button({
            iconName: 'repeat',
            label,
            testId: 'timeline-loop',
            iconSlot: 'loop-icon',
            variant: this._looping ? 'brand' : 'neutral',
            appearance: 'plain',
        })
        button.id = 'lgs1920-timeline-transport-loop'
        button.setAttribute('aria-pressed', String(this._looping))
        button.addEventListener('click', event => {
            const looping = !this._looping
            const detail = {
                source: 'timeline-loop-toggle',
                looping,
                event,
            }
            if (!this._emitAction('loop-change', detail)) return
            this.looping = looping
        })
        return button
    }

    /**
     * Create one Web Awesome button with icon and label slots.
     *
     * @param {Object} options - Button options.
     * @returns {HTMLElement} Button element.
     */
    _button = ({iconName, label, testId, iconSlot, iconSlotElement, labelSlot, variant = 'neutral', appearance = 'plain', disabled = false}) => {
        const button = timelineUtils.createElement('wa-button', this._hostNoDragClasses().trim(), {
            appearance,
            size: 's',
            variant,
            'aria-label': label,
            disabled,
            'data-testid': `lgs1920-wa-${testId}`,
        })
        if (iconSlotElement) {
            button.append(iconSlotElement)
        } else if (iconSlot) {
            button.append(this._slotWithFallback(iconSlot, timelineUtils.createIcon(iconName, 'solid')))
        }
        if (labelSlot) button.append(this._slotWithFallback(labelSlot, document.createTextNode(label)))
        return button
    }

    /**
     * Create a Web Awesome tooltip for a timeline target.
     *
     * @param {string} buttonId - ID of the tooltip target button.
     * @param {string} label - Tooltip and accessible action label.
     * @returns {HTMLElement} Tooltip element.
     */
    _tooltip = (targetId, label, placement = 'bottom') => {
        const tooltip = timelineUtils.createElement('wa-tooltip', '', {
            for: targetId,
            placement,
        })
        tooltip.append(document.createTextNode(label))
        return tooltip
    }

    /**
     * Resolve the frame interval used by the timeline time slider.
     *
     * @returns {number} Positive frame interval in milliseconds.
     */
    _frameIntervalMillis = () => {
        const configuredInterval = Number(this._timelineConfig.frameIntervalMillis)
        return Number.isFinite(configuredInterval) && configuredInterval > 0
            ? configuredInterval
            : 1000 / this._resolveFps()
    }

    /**
     * Resolve the frame rate configured by the application.
     *
     * @returns {number} Positive frame rate.
     */
    _resolveFps = () => {
        const fps = Number(this._timelineConfig.fps)
        return Number.isFinite(fps) && fps > 0 ? fps : 30
    }

    /**
     * Check whether the playhead is at the selected range start.
     *
     * @returns {boolean} Whether the start boundary is active.
     */
    _isAtRangeStart = () => this._currentTimeMillis <= this._rangeStartMillis

    /**
     * Check whether the playhead is at the selected range end.
     *
     * @returns {boolean} Whether the end boundary is active.
     */
    _isAtRangeEnd = () => this._currentTimeMillis >= this._rangeEndMillis

    /**
     * Build a controlled seek detail payload.
     *
     * @param {Object} options - Seek detail options.
     * @returns {Object} Seek event detail.
     */
    _positionDetail = ({source, timeMillis, event}) => {
        const duration = this._durationMillis()
        const normalizedTime = this._normalizeTime(timeMillis)
        return {
            timeMillis: normalizedTime,
            progress: duration > 0 ? normalizedTime / duration : 0,
            settled: true,
            source,
            event,
        }
    }

    /**
     * Build a frame-step seek detail from the controlled frame clock.
     *
     * @param {number} direction - -1 for previous, 1 for next.
     * @param {Event} event - Triggering event.
     * @returns {Object} Frame-step seek detail.
     */
    _frameStepDetail = (direction, event) => {
        const configuredInterval = Number(this._timelineConfig.frameIntervalMillis)
        const interval = Number.isFinite(configuredInterval) && configuredInterval > 0
            ? configuredInterval
            : 1000 / this._resolveFps()
        const configuredIndex = Number(this._timelineConfig.currentFrameIndex)
        const currentFrameIndex = Number.isFinite(configuredIndex)
            ? Math.trunc(configuredIndex)
            : Math.round(this._currentTimeMillis / interval)
        const configuredCount = Number(this._timelineConfig.frameCount)
        const frameCount = Number.isFinite(configuredCount) && configuredCount > 0
            ? Math.trunc(configuredCount)
            : Math.max(1, Math.ceil(this._durationMillis() / interval) + 1)
        const targetFrameIndex = timelineUtils.clamp(currentFrameIndex + direction, 0, frameCount - 1)
        const timeMillis = this._normalizeTime(targetFrameIndex * interval)
        return Object.assign(this._positionDetail({
            source: direction < 0 ? 'step-backward' : 'step-forward',
            timeMillis,
            event,
        }), {
            frameIndex: targetFrameIndex,
            frameCount,
            frameIntervalMillis: interval,
            direction,
        })
    }

    /**
     * Create a fallback slot element for a static slot name.
     *
     * @param {string} name - Slot name.
     * @param {Node} fallback - Fallback content.
     * @returns {HTMLSlotElement} Slot element.
     */
    _slotWithFallback = (name, fallback) => {
        const slot = timelineUtils.createElement('slot', '', {name})
        if (fallback) slot.append(fallback)
        return slot
    }

    /**
     * Create a text node with a test hook and an accessible label.
     *
     * @param {number} seconds - Time in seconds.
     * @param {string} type - Current or total time type.
     * @returns {HTMLElement} Time label.
     */
    _timeText = (seconds, type) => {
        const element = timelineUtils.createElement('span', '', {
            [`data-${type}-time`]: '',
            'data-testid': `lgs1920-wa-timeline-${type}-time`,
        })
        element.append(document.createTextNode(timelineUtils.formatTime(seconds)))
        return element
    }

    /**
     * Create hidden global slot sources used to clone labels and icons into
     * repeated track contexts.
     *
     * @returns {HTMLElement} Slot registry.
     */
    _slotRegistry = () => {
        const registry = timelineUtils.createElement('div', 'lgs1920-wa-timeline__slot-registry', {'aria-hidden': 'true'})
        timelineUtils.GLOBAL_SLOTS.forEach(name => registry.append(timelineUtils.createElement('slot', '', {name})))
        return registry
    }

    /**
     * Clone content from a global slot, or return fallback content.
     *
     * @param {string} name - Global slot name.
     * @param {Node} fallback - Fallback content.
     * @returns {Array<Node>} Cloned content.
     */
    _globalSlotContent = (name, fallback) => {
        const assigned = [...this.children].filter(element => element.slot === name)
        if (assigned.length === 0) return fallback ? [fallback] : []
        return assigned.flatMap(node => {
            if (node.nodeType === Node.ELEMENT_NODE && node.localName === 'template') {
                return [...node.content.cloneNode(true).childNodes]
            }
            return [node.cloneNode(true)]
        })
    }

    /**
     * Clone content from the first populated global slot in a list.
     *
     * @param {Array<string>} names - Candidate global slot names.
     * @param {Node} fallback - Final fallback content.
     * @returns {Array<Node>} Cloned content.
     */
    _globalSlotContentFrom = (names, fallback) => {
        const name = names.find(value => [...this.children].some(element => element.slot === value))
        return name ? this._globalSlotContent(name, fallback) : (fallback ? [fallback] : [])
    }

    /**
     * Check whether a contextual light-DOM slot is populated.
     *
     * @param {string} prefix - Contextual slot prefix.
     * @param {string} identifier - Context identifier.
     * @returns {boolean} Whether the contextual slot exists.
     */
    _hasContextualSlot = (prefix, identifier) => {
        const name = `${prefix}-${timelineUtils.slotKey(identifier)}`
        return [...this.children].some(element => element.slot === name)
    }

    /**
     * Create a contextual slot with a per-track or per-clip override and a
     * global slot fallback.
     *
     * @param {string} prefix - Contextual slot prefix.
     * @param {string} identifier - Context identifier.
     * @param {string} globalName - Global fallback slot name.
     * @param {Node} fallback - Final fallback content.
     * @returns {HTMLSlotElement} Contextual slot.
     */
    _contextualSlot = (prefix, identifier, globalName, fallback) => {
        const slotName = `${prefix}-${timelineUtils.slotKey(identifier)}`
        const slot = timelineUtils.createElement('slot', '', {name: slotName})
        const names = Array.isArray(globalName) ? globalName : [globalName]
        this._globalSlotContentFrom(names, fallback).forEach(node => slot.append(node))
        return slot
    }

    /**
     * Create the track legend and its insertion actions.
     *
     * @returns {HTMLElement} Legend element.
     */
    _legend = () => {
        const legend = timelineUtils.createElement('wa-card', 'lgs1920-wa-timeline__legend', {part: 'legend', appearance: 'plain'})
        const ruler = timelineUtils.createElement('div', 'lgs1920-wa-timeline__legend-ruler')
        ruler.append(timelineUtils.createElement('slot', '', {name: 'timeline-toolbar'}))
        const interactive = this._timelineConfig.interactive !== false && !this._isReadonlyMode()
        const editable = interactive && this._timelineConfig.editable !== false
        const trackAdd = this._button({
            iconName: this._timelineConfig.addTrackIcon ?? 'plus',
            label: this._timelineConfig.addTrackLabel ?? 'Add track',
            testId: 'add-track',
            iconSlot: 'add-track-icon',
            labelSlot: 'add-track-label',
            variant: 'brand',
            appearance: 'filled',
            disabled: this._trackInsertionIndex(this._rows) === null,
        })
        trackAdd.addEventListener('click', event => {
            event.stopPropagation()
            this._insertTrack(event)
        })
        const add = this._button({
            iconName: 'plus',
            label: 'Add clip to timeline',
            testId: 'add-clip',
            iconSlot: 'add-clip-icon',
            labelSlot: 'add-clip-label',
            variant: 'brand',
            appearance: 'filled',
        })
        add.id = 'lgs1920-timeline-clip-menu-trigger'
        add.setAttribute('aria-haspopup', 'menu')
        add.setAttribute('aria-expanded', `${this._menuOpen}`)
        add.addEventListener('click', () => {
            this._menuOpen = !this._menuOpen
            this._render()
        })
        if (interactive && editable) {
            ruler.append(trackAdd)
            if (this._timelineConfig.showClipMenu === true) ruler.append(add)
        }
        const rulerSlot = timelineUtils.createElement('slot', '', {name: 'legend-ruler'})
        rulerSlot.append(ruler)
        legend.append(rulerSlot)
        if (this._menuOpen && interactive && editable && this._timelineConfig.showClipMenu === true) {
            legend.append(this._menu(add))
        }
        const viewport = timelineUtils.createElement('div', 'lgs1920-wa-timeline__legend-viewport', {part: 'legend-viewport'})
        const rows = timelineUtils.createElement('div', 'lgs1920-wa-timeline__legend-rows', {part: 'legend-rows'})
        this._rows.forEach(row => rows.append(this._legendRow(row)))
        viewport.append(rows)
        legend.append(this._scrollbarShell(viewport, {role: 'legend', horizontal: false, vertical: true}))
        return legend
    }

    _menu = anchor => this._menus.menu(anchor)
    _clipContextMenu = () => this._menus.clipContextMenu()
    _trackContextMenu = () => this._menus.trackContextMenu()

}
