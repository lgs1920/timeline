/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: LGS1920Timeline.js
 *
 * Author : LGS1920 Team
 * email: studio@lgs1920.fr
 *
 * Created on: 2026-09-17
 * Last modified: 2026-09-18
 *
 *
 * Copyright © 2026 LGS1920
 ******************************************************************************/

import '@awesome.me/webawesome/dist/components/button/button.js'
import '@awesome.me/webawesome/dist/components/card/card.js'
import '@awesome.me/webawesome/dist/components/color-picker/color-picker.js'
import '@awesome.me/webawesome/dist/components/drawer/drawer.js'
import '@awesome.me/webawesome/dist/components/icon/icon.js'
import '@awesome.me/webawesome/dist/components/input/input.js'
import '@awesome.me/webawesome/dist/components/popup/popup.js'
import '@awesome.me/webawesome/dist/components/split-panel/split-panel.js'
import '@awesome.me/webawesome/dist/components/slider/slider.js'
import '@awesome.me/webawesome/dist/components/tooltip/tooltip.js'
import styles from './timeline.css?inline'
import {createTimelineClipScroll} from './timelineClipScroll.js'
import {createTimelineDomCache} from './timelineDomCache.js'
import {createTimelineStateSignatures} from './timelineState.js'
import {createTimelineControls} from './timelineControls.js'
import {createTimelineMenus} from './timelineMenus.js'
import {createTimelineSelection} from './timelineSelection.js'
import {createTimelineScrollbars} from './timelineScrollbars.js'
import {createTimelineTimeInteraction} from './timelineTimeInteraction.js'
import {TimelineClipEditingMixin} from './timelineClipEditingMixin.js'
import {TimelineDragMixin} from './timelineDragMixin.js'
import {TimelineGeometryMixin} from './timelineGeometryMixin.js'
import {TimelineLayoutMixin} from './timelineLayoutMixin.js'
import {TimelinePlaybackMixin} from './timelinePlaybackMixin.js'
import {TimelinePresentationMixin} from './timelinePresentationMixin.js'
import {TimelineStateMixin} from './timelineStateMixin.js'
import {TimelineSurfaceMixin} from './timelineSurfaceMixin.js'
import {
    CLIP_OPTION_DRAG_MIME,
    TIMELINE_EVENT_PREFIX,
    TIMELINE_MODES,
    timelineInteractionState,
} from './timelineConstants.js'

export {CLIP_OPTION_DRAG_MIME}
import {createTimelineClipEditor, normalizeClipLayout} from './timelineEditing.js'
import {
    allowsHostInteraction,
    EXTERNAL_INTERACTION_CONTINUATION_EVENT_TYPES,
    HOST_DRAG_CONTINUATION_EVENT_TYPES,
    HOST_DRAG_START_EVENT_TYPES,
    TIMELINE_INPUT_EVENT_TYPES,
    TIMELINE_KEYBOARD_EDITABLE_SELECTOR,
    TIMELINE_KEYBOARD_KEYS,
} from './timelineInteraction.js'
import {createTimelineRenderer} from './timelineRendering.js'
import {
    applyTimelinePaletteStyles,
    createElement,
    createIcon,
    DEFAULT_TIMELINE_COLOR_SWATCHES,
    formatRulerTime,
    MAX_ROW_HEIGHT,
    MIN_ROW_HEIGHT,
    resolveClipIcon,
    resolveClipLabel,
    resolveColorClasses,
    resolveLegendBounds,
    resolveRowLabel,
    SCALE_WIDTH,
    START_LEFT,
    TAG_NAME,
} from './timelineUtils.js'

const normalizeTimelineEventName = name => {
    const value = String(name ?? '').trim()
    return value.startsWith(TIMELINE_EVENT_PREFIX)
        ? value.slice(TIMELINE_EVENT_PREFIX.length)
        : value
}

let timelineAdditionalContentInstance = 0

const TimelineBase = TimelinePresentationMixin(
    TimelinePlaybackMixin(
        TimelineDragMixin(
            TimelineClipEditingMixin(
                TimelineLayoutMixin(
                    TimelineGeometryMixin(
                        TimelineSurfaceMixin(
                            TimelineStateMixin(HTMLElement),
                        ),
                    ),
                ),
            ),
        ),
    ),
)

const normalizeTimelineOptions = options => {
    const value = options && typeof options === 'object' ? options : {}
    const playback = value.playback && typeof value.playback === 'object' ? value.playback : {}
    const view = value.view && typeof value.view === 'object' ? value.view : {}
    const range = value.range && typeof value.range === 'object' ? value.range : {}
    const layout = value.layout && typeof value.layout === 'object' ? value.layout : {}
    const legend = layout.legend && typeof layout.legend === 'object' ? layout.legend : {}
    const editing = value.editing && typeof value.editing === 'object' ? value.editing : {}
    const mode = TIMELINE_MODES.includes(value.mode) ? value.mode : null
    const flattened = {...value}
    delete flattened.playback
    delete flattened.view
    delete flattened.range
    delete flattened.layout
    delete flattened.editing
    if (mode) {
        flattened.interactive = mode !== 'passive'
        flattened.editable = mode === 'edit'
        flattened.readonly = mode === 'readonly'
    }
    if (Object.prototype.hasOwnProperty.call(playback, 'loop')) flattened.noLoopMode = playback.loop === 'hidden'
    if (Object.prototype.hasOwnProperty.call(playback, 'transport')) flattened.noTransport = playback.transport === 'hidden'
    if (Object.prototype.hasOwnProperty.call(playback, 'time')) flattened.noPlaybackTime = playback.time === 'hidden'
    if (Object.prototype.hasOwnProperty.call(playback, 'timeSlider')) {
        flattened.noTimeSlider = playback.timeSlider === 'hidden'
        flattened.showTimeSlider = playback.timeSlider !== 'hidden'
    }
    if (Object.prototype.hasOwnProperty.call(view, 'visible')) flattened.visible = view.visible
    if (Object.prototype.hasOwnProperty.call(view, 'zoomSlider')) flattened.showZoomSlider = view.zoomSlider
    if (Object.prototype.hasOwnProperty.call(view, 'zoomControls')) flattened.noZoomControls = view.zoomControls === 'hidden'
    if (Object.prototype.hasOwnProperty.call(view, 'tools')) flattened.toolsHidden = view.tools === 'hidden'
    if (Object.prototype.hasOwnProperty.call(view, 'buildingOverlay')) flattened.showBuildingOverlay = view.buildingOverlay
    if (Object.prototype.hasOwnProperty.call(view, 'initialRangeStartVisible')) flattened.initialRangeStartVisible = view.initialRangeStartVisible
    if (Object.prototype.hasOwnProperty.call(range, 'startMillis')) flattened.rangeStartMillis = range.startMillis
    if (Object.prototype.hasOwnProperty.call(range, 'endMillis')) flattened.rangeEndMillis = range.endMillis
    if (Object.prototype.hasOwnProperty.call(legend, 'minWidth')) flattened.legendMinWidth = legend.minWidth
    if (Object.prototype.hasOwnProperty.call(legend, 'width')) flattened.legendWidth = legend.width
    if (Object.prototype.hasOwnProperty.call(legend, 'maxWidth')) flattened.legendMaxWidth = legend.maxWidth
    if (Object.prototype.hasOwnProperty.call(editing, 'clipMenu')) flattened.showClipMenu = editing.clipMenu
    if (Object.prototype.hasOwnProperty.call(editing, 'collisionPolicy')) flattened.collisionPolicy = editing.collisionPolicy
    if (Object.prototype.hasOwnProperty.call(editing, 'resizeCollisionPolicy')) flattened.resizeCollisionPolicy = editing.resizeCollisionPolicy
    if (Object.prototype.hasOwnProperty.call(editing, 'durationPolicy')) flattened.durationPolicy = editing.durationPolicy
    return flattened
}

const timelineOptionsFromConfig = config => {
    const mode = config.readonly === true
        ? 'readonly'
        : config.interactive === false
            ? 'passive'
            : config.editable === false
                ? 'review'
                : 'edit'
    const options = {
        ...config,
        mode,
        playback: {
            loop: config.noLoopMode === true ? 'hidden' : 'toggle',
            transport: config.noTransport === true ? 'hidden' : 'visible',
            time: config.noPlaybackTime === true ? 'hidden' : 'visible',
            timeSlider: config.noTimeSlider === true || config.showTimeSlider === false ? 'hidden' : 'visible',
        },
        view: {
            visible: config.visible !== false,
            zoomSlider: config.showZoomSlider === true,
            zoomControls: config.noZoomControls === true ? 'hidden' : 'visible',
            tools: config.toolsHidden === true ? 'hidden' : 'visible',
            buildingOverlay: config.showBuildingOverlay !== false,
            initialRangeStartVisible: config.initialRangeStartVisible !== false,
        },
        range: {
            startMillis: config.rangeStartMillis,
            endMillis: config.rangeEndMillis,
        },
        layout: {
            legend: {
                minWidth: config.legendMinWidth,
                width: config.legendWidth,
                maxWidth: config.legendMaxWidth,
            },
        },
        editing: {
            clipMenu: config.showClipMenu === true,
            collisionPolicy: config.collisionPolicy,
            resizeCollisionPolicy: config.resizeCollisionPolicy,
            durationPolicy: config.durationPolicy,
        },
    }
    const groupedKeys = [
        'interactive', 'editable', 'readonly',
        'noLoopMode', 'noTransport', 'noPlaybackTime', 'noTimeSlider', 'showTimeSlider',
        'visible', 'showZoomSlider', 'noZoomControls', 'toolsHidden', 'showBuildingOverlay',
        'initialRangeStartVisible', 'rangeStartMillis', 'rangeEndMillis',
        'legendMinWidth', 'legendWidth', 'legendMaxWidth',
        'showClipMenu', 'collisionPolicy', 'resizeCollisionPolicy', 'durationPolicy',
    ]
    groupedKeys.forEach(key => delete options[key])
    return options
}
const STRUCTURAL_CONFIG_KEYS = Object.freeze([
    'interactive',
    'readonly',
    'noLoopMode',
    'noTransport',
    'noPlaybackTime',
    'editable',
    'showClipMenu',
    'showTimeSlider',
    'noTimeSlider',
    'showZoomSlider',
    'noZoomControls',
    'toolsHidden',
    'legendMinWidth',
    'legendMaxWidth',
    'legendWidth',
    'hostInteraction',
    'hostNoDragClass',
    'horizontalFit',
    'swatches',
    'colorSwatches',
    'clipActions',
    'clipContextMenuActions',
])

/**
 * Web Awesome-compatible LGS1920 timeline custom element.
 *
 * The element is a controlled DOM adapter. It has no React hooks, Valtio
 * dependency, playback clock, or application store ownership. Applications
 * receive controlled props and emit interaction events.
 */
export class LGS1920Timeline extends TimelineBase {
    _root
    _projection = null
    _rows = []
    _timelineConfig = {}
    _trackDefinitions = []
    _localRowsDirty = false
    _localDurationDirty = false
    _currentTimeMillis = 0
    _playing = false
    _looping = false
    _visible = true
    _clipOptions = null
    _zoom = 0
    _verticalZoomRowHeight = null
    _interactionDurationMillis = null
    _rangeStartMillis = 0
    _rangeEndMillis = 0
    _rangeEndFollowsDuration = true
    _surfaceWidth = 0
    _contentWidth = START_LEFT + SCALE_WIDTH
    _playheadGeometry = null
    _rowHeight = MIN_ROW_HEIGHT
    _legendWidth = null
    _legendWidthCorrection = null
    _legendWidthCorrectionNeedsMeasure = false
    _building = true
    _buildingFrame = null
    _buildingLayoutSignature = null
    _openingBuildingStartedAt = null
    _initialBuildComplete = false
    _initialRangeStartPositioned = false
    _additionalContentOpen = false
    _additionalContentPanelId = `lgs1920-timeline-additional-content-${++timelineAdditionalContentInstance}`
    _additionalContentToggle = null
    _menuOpen = false
    _draggedClipOption = null
    _externalClipPreviewFrame = null
    _externalClipPreviewRequest = null
    _generatedClipIdentifiers = new Set()
    _selectedClipKey = null
    _clipCopyState = null
    _clipCopyPresentationFrame = null
    _trackNumber = 0
    _horizontalFitActive = false
    _lastControlledZoomPercent = null
    _surface = null
    _tracksViewport = null
    _pendingTracksScrollTop = null
    _lastVerticalScrollTop = null
    _verticalScrollRestoreFrame = null
    _verticalScrollRestoreTarget = null
    _dynamicElements = null
    _clipPresentationElements = null
    _transportState = null
    _lifecycleHandlers = new Map()
    _domCache
    _resizeObserver = null
    _layoutRefreshFrame = null
    _layoutRefreshUsesAnimationFrame = false
    _scrollbarHideTimer = null
    _scrollbarsInteractionActive = false
    _nativeSplitPanelInteractionActive = false
    _nativeSplitPanelElement = null
    _pointerCaptureTarget = null
    _pointerCaptureId = null
    _dragState = null
    _clipSnapGuide = null
    _clipSnapGuideTimer = null
    _cutMode = false
    _cutGuide = null
    _scrubPointerId = null
    _autoScrollFrame = null
    _edgeDirection = null
    _edgeStartedAt = null
    _edgeLastStepAt = null
    _edgePointerEvent = null
    _editingRowId = null
    _editingLabelValue = ''
    _suppressRangeClick = false
    _preventNativeContextMenu = event => event.preventDefault()
    _inputPropagationBlockersInstalled = false
    _externalInteractionActive = false
    _pendingControlledState = null
    _controlledUpdateDepth = 0
    _controlledSyncPending = false
    _controlledSyncForceRender = false
    _controlledSyncZoomPercent
    _clipEditor
    _clipScroll
    _clipWorkspaceWidth = 0
    _controls
    _menus
    _scrollbars
    _selection
    _timeInteraction
    _renderer
    _stateSignatures = createTimelineStateSignatures()
    _isReadonlyMode = () => this.readonly || this._playing

    static get observedAttributes() {
        return ['readonly', 'noloopmode', 'nozoomcontrols', 'tools-hidden']
    }

    /**
     * Synchronize the controlled configuration when the readonly attribute changes.
     *
     * @param {string} name - Changed attribute name.
     * @param {string|null} previousValue - Previous attribute value.
     * @param {string|null} nextValue - New attribute value.
     */
    attributeChangedCallback(name, previousValue, nextValue) {
        if (!['readonly', 'noloopmode', 'nozoomcontrols', 'tools-hidden'].includes(name) || previousValue === nextValue) return
        if (name === 'noloopmode' && this.noLoopMode) this._looping = false
        const config = name === 'nozoomcontrols'
            ? {...this._timelineConfig, noZoomControls: this.hasAttribute('nozoomcontrols')}
            : name === 'tools-hidden'
                ? {...this._timelineConfig, toolsHidden: this.hasAttribute('tools-hidden')}
                : this._timelineConfig
        this.timeline = config
    }

    /**
     * Whether the component is in its playback-only readonly mode.
     *
     * @returns {boolean} Whether the readonly attribute is present.
     */
    get readonly() {
        return this.hasAttribute('readonly') || this._timelineConfig.readonly === true || this._timelineConfig.mode === 'readonly'
    }

    /**
     * Toggle the play-only readonly mode.
     *
     * @param {boolean} value - Whether readonly mode is enabled.
     */
    set readonly(value) {
        this.toggleAttribute('readonly', value === true)
    }

    /**
     * Whether the loop-mode control is hidden.
     *
     * @returns {boolean} Whether loop mode is disabled for this component.
     */
    get noLoopMode() {
        return this.hasAttribute('noloopmode') || this._timelineConfig.noLoopMode === true
    }

    /**
     * Toggle the loop-mode control.
     *
     * @param {boolean} value - Whether loop mode should be hidden.
     */
    set noLoopMode(value) {
        this.toggleAttribute('noloopmode', value === true)
    }

    /**
     * Get the grouped timeline options.
     *
     * @returns {Object} Timeline options.
     */
    get options() {
        return timelineOptionsFromConfig({...this._timelineConfig, readonly: this.readonly})
    }

    /**
     * Set the grouped timeline options.
     *
     * @param {Object} value - Timeline options.
     */
    set options(value) {
        this.timeline = normalizeTimelineOptions(value)
    }

    /**
     * Subscribe to one timeline event and its optional lifecycle hooks.
     *
     * The main handler receives the canonical DOM event. Lifecycle hooks are
     * called with events of the same type before and after the main event;
     * calling preventDefault in a before hook cancels the action.
     *
     * @param {string} name - Event suffix, with or without the public prefix.
     * @param {Function|Object} handler - Main handler or lifecycle descriptor.
     * @param {Object} [options] - Lifecycle callbacks.
     * @param {Function} [options.before] - Cancelable pre-action callback.
     * @param {Function} [options.after] - Post-action callback.
     * @returns {Function} Unsubscribe callback.
     */
    on(name, handler, options = {}) {
        const eventName = normalizeTimelineEventName(name)
        if (!eventName) return () => {}
        const descriptor = handler && typeof handler === 'object' ? handler : options
        const mainHandler = typeof handler === 'function'
            ? handler
            : (descriptor?.on ?? descriptor?.main)
        const beforeHandler = descriptor?.before
        const afterHandler = descriptor?.after
        const lifecycle = this._lifecycleHandlers.get(eventName) ?? {
            before: new Set(),
            after: new Set(),
        }
        this._lifecycleHandlers.set(eventName, lifecycle)
        const removers = []
        if (typeof mainHandler === 'function') {
            const publicEventName = `${TIMELINE_EVENT_PREFIX}${eventName}`
            const mainListener = event => mainHandler(event)
            this.addEventListener(publicEventName, mainListener)
            removers.push(() => this.removeEventListener(publicEventName, mainListener))
        }
        if (typeof beforeHandler === 'function') {
            const beforeListener = event => beforeHandler(event)
            lifecycle.before.add(beforeListener)
            removers.push(() => lifecycle.before.delete(beforeListener))
        }
        if (typeof afterHandler === 'function') {
            const afterListener = event => afterHandler(event)
            lifecycle.after.add(afterListener)
            removers.push(() => lifecycle.after.delete(afterListener))
        }
        return () => {
            removers.forEach(remove => remove())
            if (lifecycle.before.size === 0 && lifecycle.after.size === 0) {
                this._lifecycleHandlers.delete(eventName)
            }
        }
    }

    /**
     * Whether the built-in timeline zoom controls are hidden.
     *
     * @returns {boolean} Whether zoom controls are disabled.
     */
    get noZoomControls() {
        return this.hasAttribute('nozoomcontrols') || this._timelineConfig.noZoomControls === true
    }

    /**
     * Toggle the built-in timeline zoom controls.
     *
     * @param {boolean} value - Whether zoom controls should be hidden.
     */
    set noZoomControls(value) {
        this.toggleAttribute('nozoomcontrols', value === true)
    }

    /**
     * Whether the built-in timeline editing tools are hidden.
     *
     * @returns {boolean} Whether editing tools are disabled.
     */
    get toolsHidden() {
        return this.hasAttribute('tools-hidden') || this._timelineConfig.toolsHidden === true
    }

    /**
     * Toggle the built-in timeline editing tools.
     *
     * @param {boolean} value - Whether editing tools should be hidden.
     */
    set toolsHidden(value) {
        this.toggleAttribute('tools-hidden', value === true)
    }

    /**
     * Get the controlled loop playback state.
     *
     * @returns {boolean} Whether playback should repeat its selected range.
     */
    get looping() {
        return this._looping
    }

    /**
     * Set the controlled loop playback state.
     *
     * @param {boolean} value - Whether playback should repeat its selected range.
     */
    set looping(value) {
        const nextLooping = value === true && !this.noLoopMode
        if (nextLooping === this._looping) return
        this._looping = nextLooping
        this._updateLoopButton()
    }

    /**
     * Construct the shadow DOM host and its persistent stylesheet.
     */
    constructor() {
        super()
        this._root = this.attachShadow({mode: 'open'})
        this._domCache = createTimelineDomCache(this._root)
        this._scrollbars = createTimelineScrollbars({
            cacheElements: () => this._domCache.cacheScrollbarElements(),
            capturePointer: event => this._capturePointer(event),
            clearScrollbarHideTimer: () => this._clearScrollbarHideTimer(),
            getNumericToken: (name, fallback) => this._numericToken(name, fallback),
            releasePointerCapture: () => this._releasePointerCapture(),
            scheduleScrollbarHide: () => this._scheduleScrollbarHide(),
            showScrollbars: () => this._showScrollbars(),
        })
        this._root.addEventListener('pointerdown', () => {
            this._suppressRangeClick = false
        }, true)
        this._root.addEventListener('click', event => {
            if (!this._suppressRangeClick) return
            this._suppressRangeClick = false
            event.preventDefault()
            event.stopImmediatePropagation()
        }, true)
        const style = document.createElement('style')
        style.textContent = styles
        this._root.append(style, this._buildingOverlay())
        this._clipEditor = createTimelineClipEditor({
            getRows: () => this._rows,
            getTimelineConfig: () => ({...this._timelineConfig, readonly: this._isReadonlyMode()}),
            getProjectionDurationMillis: () => this._dragState?.initialDurationMillis ?? this._durationMillis(),
            getMajorRulerUnit: () => {
                const {majorSeconds, scaleSplitCount} = this._resolveScale()
                const scaleWidth = this._scaleWidth()
                const splitCount = Number(scaleSplitCount)
                return {
                    seconds: majorSeconds,
                    pixels: scaleWidth,
                    minorSeconds: splitCount > 1 ? majorSeconds / splitCount : null,
                    minorPixels: splitCount > 1 ? scaleWidth / splitCount : null,
                }
            },
            getTimeAtClientX: clientX => this._timeAtClientX(clientX),
            getTrackAtClientY: clientY => this._trackAtClientY(clientY),
            getCurrentTimeMillis: () => this._currentTimeMillis,
            getRangeEndFollowsDuration: () => this._rangeEndFollowsDuration,
            getRangeEndMillis: () => this._dragState?.initialRangeEndMillis ?? this._rangeEndMillis,
            setRangeEndMillis: value => {
                this._rangeEndMillis = value
            },
            setRows: rows => {
                this._rows = rows
                // Preview rows are transient during a pointer gesture. A
                // keyboard edit has no active drag state and is committed
                // immediately, so retain it across the next controlled sync.
                if (!this._dragState) this._localRowsDirty = true
            },
            setInteractionDurationMillis: value => {
                const nextDurationMillis = Number.isFinite(Number(value)) ? Number(value) : null
                if (nextDurationMillis === this._interactionDurationMillis) return
                if (!this._dragState && Number.isFinite(nextDurationMillis)
                    && nextDurationMillis !== (Number(this._projection?.durationMillis) || 0)) {
                    this._localDurationDirty = true
                }
                this._interactionDurationMillis = nextDurationMillis
                this._refreshDurationGeometry()
            },
            emit: (name, detail, options) => this._emit(name, detail, options),
            emitBefore: (name, detail) => this._emitBefore(name, detail),
            emitAfter: (name, detail) => this._emitAfter(name, detail),
            render: () => {
                this._updateClipInteractionPresentation()
            },
        })
        this._menus = createTimelineMenus({
            button: options => this._button(options),
            changeClipColor: (clipId, value, event) => this._changeClipColor(clipId, value, event),
            closeClipContextMenu: options => this._menus.closeClipContextMenu(options),
            closeTrackContextMenu: options => this._menus.closeTrackContextMenu(options),
            contextualSlot: (prefix, identifier, globalName, fallback) => this._contextualSlot(prefix, identifier, globalName, fallback),
            duplicateClip: (clipId, event) => this._duplicateClip(clipId, event),
            endClipOptionDrag: event => this._endClipOptionDrag(event),
            getClipEditor: () => this._clipEditor,
            getClipOptions: () => this._clipOptions,
            getConfig: () => this._timelineConfig,
            getDragState: () => this._dragState,
            getHostNoDragClasses: () => this._hostNoDragClasses(),
            getRoot: () => this._root,
            getRows: () => this._rows,
            getTracks: () => this.tracks,
            globalSlotContent: (name, fallback) => this._globalSlotContent(name, fallback),
            isReadonlyMode: () => this._isReadonlyMode(),
            isTrackEditable: row => this._isTrackEditable(row),
            insertClip: (option, event) => {
                this._menuOpen = false
                this._insertClip(option, event)
            },
            beginTrackLabelEdit: (row, event) => this._beginTrackLabelEdit(row, event),
            removeClip: (clipId, event) => this._removeClip(clipId, event),
            removeTrack: (row, event) => this._removeTrack(row, event),
            publicSnapshot: () => this._publicSnapshot(),
            emit: (name, detail, options) => this._emit(name, detail, options),
            emitAfter: (name, detail) => this._emitAfter(name, detail),
            emitBefore: (name, detail) => this._emitBefore(name, detail),
            selectClip: (clip, event, element) => this._selectClip(clip, event, element),
            startClipOptionDrag: (option, event) => this._startClipOptionDrag(option, event),
            toggleClipEnabled: (clipId, event) => this._toggleClipEnabled(clipId, event),
            toggleClipVisibility: (clipId, event) => this._toggleClipVisibility(clipId, event),
            toggleTrackVisibility: (row, event) => this._toggleTrackVisibility(row, event),
            extendClip: (clipId, event) => this._extendClip(clipId, event),
            cancelClipInteraction: event => this._pointerUp(event),
        })
        this._timeInteraction = createTimelineTimeInteraction({
            addPointerListeners: () => this._addPointerListeners(),
            capturePointer: event => this._capturePointer(event),
            clampCurrentTimeToRange: () => this._clampCurrentTimeToRange(),
            emit: (name, detail, options) => this._emit(name, detail, options),
            emitAfter: (name, detail) => this._emitAfter(name, detail),
            emitBefore: (name, detail) => this._emitBefore(name, detail),
            getConfig: () => this._timelineConfig,
            getContentWidth: () => this._contentWidth,
            getCurrentTimeMillis: () => this._currentTimeMillis,
            getDragState: () => this._dragState,
            getDurationMillis: () => this._durationMillis(),
            getDynamicElements: () => this._dynamicElements ?? this._cacheDynamicElements(),
            getRangeEndMillis: () => this._rangeEndMillis,
            getRangeEndFollowsDuration: () => this._rangeEndFollowsDuration,
            getRangeStartMillis: () => this._rangeStartMillis,
            getScaleWidth: () => this._scaleWidth(),
            getSurface: () => this._surface,
            getTimeAtClientX: clientX => this._timeAtClientX(clientX),
            handleEdgeAutoScroll: event => this._handleEdgeAutoScroll(event),
            isReadonlyMode: () => this._isReadonlyMode(),
            normalizeTime: (value, constrainToRange) => this._normalizeTime(value, constrainToRange),
            numericToken: (name, fallback) => this._numericToken(name, fallback),
            releasePointerCapture: () => this._releasePointerCapture(),
            resolveScale: () => this._resolveScale(),
            setCurrentTimeMillis: value => {
                this._currentTimeMillis = value
            },
            setDragState: value => {
                this._dragState = value
            },
            setRangeEndFollowsDuration: value => {
                this._rangeEndFollowsDuration = value
            },
            setRangeEndMillis: value => {
                this._rangeEndMillis = value
            },
            setRangeStartMillis: value => {
                this._rangeStartMillis = value
            },
            setSuppressRangeClick: value => {
                this._suppressRangeClick = value
            },
            getSuppressRangeClick: () => this._suppressRangeClick,
            updateDynamicState: () => this._updateDynamicState(),
            updatePlayheadPosition: elements => this._updatePlayheadPosition(elements),
        })
        this._selection = createTimelineSelection({
            getRoot: () => this._root,
            getRows: () => this._rows,
            getClipElement: clipId => this._domCache.getClipPresentationElements()?.clips.get(String(clipId)) ?? null,
            getSelectedKey: () => this._selectedClipKey,
            setSelectedKey: value => {
                this._selectedClipKey = value
            },
            findClipEntry: (rows, clipId) => this._clipEditor.findClipEntry(rows, clipId),
            getClipContextMenuClipId: () => this._menus.getClipContextMenuClipId(),
            getTrackContextMenuTrackId: () => this._menus.getTrackContextMenuTrackId(),
            closeClipContextMenu: () => this._closeClipContextMenu(),
            closeTrackContextMenu: () => this._closeTrackContextMenu(),
            emit: (name, detail) => this._emit(name, detail),
            publicSnapshot: () => this._publicSnapshot(),
        })
        this._clipScroll = createTimelineClipScroll({
            getSurface: () => this._surface,
            getTracksViewport: () => this._tracksViewport,
            canScrollHorizontal: () => this._dragState?.type === 'clip',
            extendWorkspace: pixels => {
                const state = this._dragState
                if (state?.type !== 'clip' || state.dropRejected || this._timelineConfig.durationPolicy === 'fixed') return
                if (state.mode === 'resize' && (state.edge !== 'end' || this._timelineConfig.resizeExtendsDuration === false)) return
                const requiredWidth = this._surface.scrollLeft + this._surface.clientWidth + pixels + 32
                if (requiredWidth <= this._contentWidth) return
                this._clipWorkspaceWidth = requiredWidth
                this._refreshDurationGeometry()
            },
            preview: event => {
                if (this._dragState?.external === true) {
                    this._clipEditor.preview(this._dragState, event)
                    return
                }
                if (['clip', 'row'].includes(this._dragState?.type)) this._pointerMove(event)
            },
        })
        this._controls = createTimelineControls({
            createElement,
            createIcon,
            formatRulerTime,
            maxRowHeight: MAX_ROW_HEIGHT,
            minRowHeight: MIN_ROW_HEIGHT,
            button: options => this._button(options),
            tooltip: (targetId, label, placement) => this._tooltip(targetId, label, placement),
            getConfig: () => this._timelineConfig,
            getHostNoDragClasses: () => this._hostNoDragClasses(),
            getHorizontalFitActive: () => this._horizontalFitActive,
            setHorizontalFitActive: value => {
                this._horizontalFitActive = value
            },
            getZoom: () => this._zoom,
            setZoom: value => {
                this._zoom = value
            },
            getMinimumHorizontalZoom: () => this._minimumHorizontalZoom(),
            clampHorizontalZoom: value => this._clampHorizontalZoom(value),
            getNumericToken: (name, fallback) => this._numericToken(name, fallback),
            getRowHeight: () => this._rowHeight,
            setRowHeight: value => {
                this._verticalZoomRowHeight = value
            },
            render: () => this._render(),
            getRangeStartMillis: () => this._rangeStartMillis,
            getRangeEndMillis: () => this._rangeEndMillis,
            getCurrentTimeMillis: () => this._currentTimeMillis,
            setCurrentTimeMillis: value => {
                this.setTime(value, {forcePlaybackFollow: true})
            },
            getFrameIntervalMillis: () => this._frameIntervalMillis(),
            getDurationMillis: () => this._durationMillis(),
            getDurationSeconds: () => this._durationSeconds(),
            getReadonly: () => this.readonly,
            getCutMode: () => this._cutMode === true,
            toggleCutMode: event => this._toggleCutMode(event),
            normalizeTime: (value, constrainToRange) => this._normalizeTime(value, constrainToRange),
            updateDynamicState: () => this._updateDynamicState(),
            emitBefore: (name, detail) => this._emitBefore(name, detail),
            emit: (name, detail, options) => this._emit(name, detail, options),
            emitAfter: (name, detail) => this._emitAfter(name, detail),
        })
        this._renderer = createTimelineRenderer({
            createElement,
            createIcon,
            formatRulerTime,
            resolveColorClasses,
            applyTimelinePaletteStyles,
            resolveRowLabel,
            resolveClipLabel,
            resolveClipIcon,
            numericToken: (name, fallback) => this._numericToken(name, fallback),
            getTimelineConfig: () => ({...this._timelineConfig, readonly: this._isReadonlyMode()}),
            allowsHostInteraction: () => allowsHostInteraction(this._timelineConfig),
            getRows: () => this._rows,
            getDragState: () => this._dragState,
            getEditingRowId: () => this._editingRowId,
            getEditingLabelValue: () => this._editingLabelValue,
            setEditingLabelValue: value => {
                this._editingLabelValue = value
            },
            getRangeStartMillis: () => this._rangeStartMillis,
            getRangeEndMillis: () => this._rangeEndMillis,
            getCurrentTimeMillis: () => this._currentTimeMillis,
            getDurationMillis: () => this._durationMillis(),
            getContentWidth: () => this._contentWidth,
            getZoom: () => this._zoom,
            isClipSelected: clip => this._isClipSelected(clip),
            contextualSlot: (prefix, identifier, globalName, fallback) => this._contextualSlot(prefix, identifier, globalName, fallback),
            hasContextualSlot: (prefix, identifier) => this._hasContextualSlot(prefix, identifier),
            globalSlotContent: (name, fallback) => this._globalSlotContent(name, fallback),
            button: options => this._button(options),
            removeTrack: (row, event) => this._removeTrack(row, event),
            removeClip: (clipId, event) => this._removeClip(clipId, event),
            duplicateClip: (clipId, event) => this._duplicateClip(clipId, event),
            toggleClipEnabled: (clipId, event) => this._toggleClipEnabled(clipId, event),
            toggleClipVisibility: (clipId, event) => this._toggleClipVisibility(clipId, event),
            selectClip: (clip, event, element) => this._selectClip(clip, event, element),
            openClipContextMenu: (clip, event) => this._openClipContextMenu(clip, event),
            openTrackContextMenu: (row, event) => this._openTrackContextMenu(row, event),
            beginTrackLabelEdit: row => this._beginTrackLabelEdit(row),
            commitTrackLabelEdit: event => this._commitTrackLabelEdit(event),
            cancelTrackLabelEdit: () => this._cancelTrackLabelEdit(),
            startRowDrag: (event, rowId) => this._startRowDrag(event, rowId),
            toggleTrackVisibility: (row, event) => this._toggleTrackVisibility(row, event),
            handleClipDragOver: (event, rowId, track) => this._handleClipDragOver(event, rowId, track),
            handleClipDragLeave: (event, track) => this._handleClipDragLeave(event, track),
            handleClipDrop: (event, rowId, track) => this._handleClipDrop(event, rowId, track),
            startClipInteraction: (event, clipId, mode, edge, wasSelected) => this._startClipInteraction(event, clipId, mode, edge, wasSelected),
            moveClipByKeyboard: (clipId, event) => this._clipEditor.moveByKeyboard(clipId, event),
            resizeClipByKeyboard: (clipId, edge, event) => this._clipEditor.resizeByKeyboard(clipId, edge, event),
            isCutMode: () => this._cutMode === true,
            previewCut: (clipId, event) => this._previewCut(clipId, event),
            clearCutPreview: () => this._clearCutPreview(),
            cancelCutMode: () => this._cancelCutMode(),
            commitCut: (clipId, event) => {
                const committed = this._cutClipAtTime(clipId, this._cutTimeAtPointer(clipId, event), event)
                if (committed && event.shiftKey !== true) this._cancelCutMode()
                return committed
            },
            startRangeInteraction: (event, edge) => this._startRangeInteraction(event, edge),
            setRangeBoundaryToLimit: (edge, event) => this._setRangeBoundaryToLimit(edge, event),
            moveRangeByKeyboard: (edge, event) => this._moveRangeByKeyboard(edge, event),
            startPlayheadInteraction: event => this._startPlayheadInteraction(event),
            movePlayheadByKeyboard: event => this._movePlayheadByKeyboard(event),
            seek: (clientX, settled) => this._seek(clientX, settled),
            addPointerListeners: () => this._addPointerListeners(),
            capturePointer: event => this._capturePointer(event),
            handleWheel: event => this._handleWheel(event),
            handleKeyDown: event => this._handleKeyDown(event, true),
            handleRulerPointerDown: event => this._handleRulerPointerDown(event),
            handleRulerClick: event => this._handleRulerClick(event),
            emit: (name, detail) => this._emit(name, detail),
            emitBefore: (name, detail) => this._emitBefore(name, detail),
            emitAfter: (name, detail) => this._emitAfter(name, detail),
            setScrubPointerId: value => {
                this._scrubPointerId = value
            },
            scaleWidth: () => this._scaleWidth(),
            scaleOffset: () => this._numericToken('scale-offset', START_LEFT),
        })
    }

    /**
     * Render the component when it is attached to the document.
     */
    connectedCallback() {
        this._initialBuildComplete = false
        this._initialRangeStartPositioned = false
        this._building = this._timelineConfig.showBuildingOverlay !== false
        this._buildingLayoutSignature = null
        this._surfaceWidth = 0
        this._contentWidth = START_LEFT + SCALE_WIDTH
        this._clipWorkspaceWidth = 0
        this._cancelBuildingCompletion()
        this.setAttribute('role', 'region')
        if (!this.getAttribute('aria-label')) this.setAttribute('aria-label', 'Timeline')
        this._installInputPropagationBlockers()
        window.addEventListener('keydown', this._handleWindowKeyDown, true)
        window.addEventListener('pointerdown', this._handleCutModeOutsidePointerDown, true)
        window.addEventListener('dragstart', this._handleWindowClipOptionDragStart)
        window.addEventListener('drag', this._handleWindowClipOptionDrag)
        window.addEventListener('dragover', this._handleWindowClipOptionDragOver, true)
        window.addEventListener('drop', this._handleWindowClipOptionDrop, true)
        window.addEventListener('dragend', this._handleWindowClipOptionDragEnd)
        this._installResizeObserver()
        if (this._projection) {
            this._render()
        } else {
            this.hidden = false
            if (this._timelineConfig.showBuildingOverlay === false) {
                this._root.querySelector('[data-building-overlay]')?.remove()
            }
        }
        this.setAttribute('data-ready', '')
    }

    /**
     * Check whether an input event belongs to application-provided slotted content.
     *
     * Slotted controls own their input lifecycle and must remain interactive even
     * though the timeline keeps its internal surface events local to the host.
     *
     * @param {Event} event - Native input event.
     * @returns {boolean} Whether the event originated in an application slot.
     */
    _isApplicationSlotEvent = event => {
        const composedPath = typeof event.composedPath === 'function' ? event.composedPath() : []
        return composedPath.some(target => ['custom-menu', 'additional-content'].includes(target?.getAttribute?.('slot')))
    }

    /**
     * Check whether an event came from the application-owned additional-content trigger.
     *
     * @param {Event} event - Native input event.
     * @returns {boolean} Whether the event originated in the trigger.
     */
    _isAdditionalContentToggleEvent = event => {
        const composedPath = typeof event.composedPath === 'function' ? event.composedPath() : []
        return composedPath.some(target => target?.hasAttribute?.('data-additional-content-toggle'))
            || Boolean(event.target?.closest?.('[data-additional-content-toggle]'))
    }

    /**
     * Check whether an event belongs to one of the built-in sliders.
     *
     * Web Awesome installs the continuation listeners for slider drags on the
     * document. The timeline input boundary must therefore let those events
     * cross the shadow root after the slider has started its gesture.
     *
     * @param {Event} event - Native event to inspect.
     * @returns {boolean} Whether the event originated from a built-in slider.
     */
    _isBuiltInSliderEvent = event => {
        const composedPath = typeof event.composedPath === 'function' ? event.composedPath() : []
        const selector = '[data-timeline-time-slider], [data-timeline-zoom-slider]'
        if (composedPath.some(target => target?.matches?.(selector))) return true
        if (event.target?.matches?.(selector) || event.target?.closest?.(selector)) return true
        return [...this._root.querySelectorAll(selector)].some(slider => (
            slider === event.target || slider.shadowRoot?.contains?.(event.target)
        ))
    }

    /**
     * Update the disclosure state of the generic additional-content panel.
     *
     * @returns {void}
     */
    _updateAdditionalContentPresentation = () => {
        const panel = this._root.querySelector('[part="additional-content-panel"]')
        const toggle = this.querySelector('[data-additional-content-toggle]')
        if (toggle !== this._additionalContentToggle) {
            this._additionalContentToggle?.removeEventListener('click', this._toggleAdditionalContent)
            this._additionalContentToggle = toggle
            toggle?.addEventListener('click', this._toggleAdditionalContent)
        }
        if (!panel || !toggle) return
        if (this._additionalContentOpen) panel.setAttribute('open', '')
        else panel.removeAttribute('open')
        toggle.setAttribute('aria-controls', this._additionalContentPanelId)
        toggle.setAttribute('aria-expanded', `${this._additionalContentOpen}`)
        toggle.setAttribute('data-open', `${this._additionalContentOpen}`)
    }

    /**
     * Synchronize the generic drawer state after it has opened itself.
     */
    _handleAdditionalContentShow = () => {
        this._additionalContentOpen = true
        this._updateAdditionalContentPresentation()
    }

    /**
     * Synchronize the generic drawer state after it has requested to close.
     */
    _handleAdditionalContentHide = () => {
        this._additionalContentOpen = false
        this._updateAdditionalContentPresentation()
        this._refreshLayoutMetrics()
    }

    /**
     * Toggle the generic additional-content panel without rebuilding the timeline.
     *
     * @param {Event} event - Triggering button event.
     */
    _toggleAdditionalContent = event => {
        event.preventDefault()
        event.stopPropagation()
        const panel = this._root.querySelector('[part="additional-content-panel"]')
        if (!panel) return
        const panelIsOpen = panel.open === true
            || (typeof panel.open === 'undefined' && this._additionalContentOpen)
        const nextOpen = !panelIsOpen
        this._additionalContentOpen = nextOpen
        if ('open' in panel || typeof panel.open === 'boolean') panel.open = nextOpen
        this._updateAdditionalContentPresentation()
        this._refreshLayoutMetrics()
    }

    _clipSelectionKey = (trackId, clipId) => this._selection.key(trackId, clipId)
    _isClipSelected = clip => this._selectedClipKey === this._clipSelectionKey(clip?.trackId, clip?.id)
    _updateClipSelectionPresentation = () => this._selection.updatePresentation()
    _focusSelectedClip = () => this._selection.focusSelected()
    _selectClip = (clip, event, element = null) => this._selection.select(clip, event, element)
    _clearClipSelection = event => this._selection.clear(event)
    _handleClipSelectionPointerDown = event => this._selection.handlePointerDown(event)
    _reconcileClipSelection = () => this._selection.reconcile()

    /**
     * Check whether an input event originated from the split-panel divider.
     *
     * @param {Event} event - Native input event.
     * @returns {boolean} Whether the event belongs to the divider gesture.
     */
    _isSplitPanelDividerEvent = event => {
        const composedPath = typeof event.composedPath === 'function' ? event.composedPath() : []
        return composedPath.some(target => (
            target instanceof Element
            && target.getAttribute('part')?.split(' ').includes('divider')
        ))
    }

    /**
     * Stop native pointing events at the Web Component host after internal
     * timeline listeners have handled them.
     *
     * @param {Event} event - Native pointing event.
     */
    _stopInputPropagation = event => {
        if (event.type === 'click' && this._isAdditionalContentToggleEvent(event)) {
            this._toggleAdditionalContent(event)
            return
        }
        if (this._isApplicationSlotEvent(event)) return
        if (this._isBuiltInSliderEvent(event)
            && EXTERNAL_INTERACTION_CONTINUATION_EVENT_TYPES.includes(event.type)) return
        if (HOST_DRAG_START_EVENT_TYPES.includes(event.type)
            && this._isSplitPanelDividerEvent(event)) {
            event.stopImmediatePropagation()
            return
        }
        if (allowsHostInteraction(this._timelineConfig)
            && (HOST_DRAG_START_EVENT_TYPES.includes(event.type)
                || HOST_DRAG_CONTINUATION_EVENT_TYPES.includes(event.type)
                || event.type === 'click'
                || event.type === 'contextmenu'
                || event.type === 'dblclick'
                || event.type === 'drag'
                || event.type === 'dragend'
                || event.type === 'dragstart'
                || event.type === 'gotpointercapture'
                || event.type === 'lostpointercapture')) return
        if (event.type === 'keydown') {
            if (event.target?.closest?.(TIMELINE_KEYBOARD_EDITABLE_SELECTOR)) return
            if (!TIMELINE_KEYBOARD_KEYS.includes(event.key)) return
        }
        if (this._nativeSplitPanelInteractionActive
            && EXTERNAL_INTERACTION_CONTINUATION_EVENT_TYPES.includes(event.type)) return
        if (this._externalInteractionActive
            && EXTERNAL_INTERACTION_CONTINUATION_EVENT_TYPES.includes(event.type)) return
        event.stopImmediatePropagation()
    }

    /**
     * Install the local input boundary once for the lifetime of the host.
     */
    _installInputPropagationBlockers = () => {
        if (this._inputPropagationBlockersInstalled) return
        for (const eventType of TIMELINE_INPUT_EVENT_TYPES) {
            this.addEventListener(eventType, this._stopInputPropagation)
            this._root.addEventListener(eventType, this._stopInputPropagation)
        }
        this._root.addEventListener('contextmenu', this._preventNativeContextMenu, true)
        this._root.addEventListener('pointerdown', this._handleCutModeNeutralPointerDown, true)
        this._root.addEventListener('pointerdown', this._handleClipSelectionPointerDown, true)
        this._root.addEventListener('keydown', this._handleTrackLabelKeyDown, true)
        this._inputPropagationBlockersInstalled = true
    }

    /**
     * Remove the local input boundary when the host leaves the document.
     */
    _removeInputPropagationBlockers = () => {
        if (!this._inputPropagationBlockersInstalled) return
        for (const eventType of TIMELINE_INPUT_EVENT_TYPES) {
            this.removeEventListener(eventType, this._stopInputPropagation)
            this._root.removeEventListener(eventType, this._stopInputPropagation)
        }
        this._root.removeEventListener('contextmenu', this._preventNativeContextMenu, true)
        this._root.removeEventListener('pointerdown', this._handleCutModeNeutralPointerDown, true)
        this._root.removeEventListener('pointerdown', this._handleClipSelectionPointerDown, true)
        this._root.removeEventListener('keydown', this._handleTrackLabelKeyDown, true)
        this._inputPropagationBlockersInstalled = false
    }

    /**
     * Get the global timeline configuration.
     *
     * @returns {Object} Timeline configuration.
     */
    get timeline() {
        return {
            ...this._timelineConfig,
            durationMillis: this._durationMillis(),
            rangeStartMillis: this._rangeStartMillis,
            rangeEndMillis: this._rangeEndMillis,
        }
    }

    /**
     * Set the global timeline configuration.
     *
     * @param {Object} value - Timeline configuration.
     */
    set timeline(value) {
        const previousStructureConfig = this._structureConfig(this._timelineConfig, STRUCTURAL_CONFIG_KEYS)
        const config = value && typeof value === 'object' ? Object.assign({}, value) : {}
        const previousControlledDuration = Number(this._timelineConfig.durationMillis
            ?? (Number(this._timelineConfig.durationSeconds) * 1000)) || 0
        const requestedDuration = Number(config.durationMillis
            ?? (Number(config.durationSeconds) * 1000)) || 0
        const preserveLocalDuration = this._localDurationDirty
            && requestedDuration === previousControlledDuration
        if (!this._dragState && !preserveLocalDuration) this._interactionDurationMillis = null
        if (!preserveLocalDuration) this._localDurationDirty = false
        const requestedZoom = Number(config.zoomPercent)
        const applyControlledZoom = Number.isFinite(requestedZoom)
            && (this._lastControlledZoomPercent === null || requestedZoom !== this._lastControlledZoomPercent)
        this._lastControlledZoomPercent = Number.isFinite(requestedZoom) ? requestedZoom : null
        this._rangeEndFollowsDuration = !Number.isFinite(Number(config.rangeEndMillis))
        const {minimum, maximum, initial} = resolveLegendBounds(config)
        if (!Number.isFinite(this._legendWidth)) this._legendWidth = initial
        this._timelineConfig = Object.assign({}, config, {
            readonly: config.readonly === true || this.hasAttribute('readonly'),
            noLoopMode: config.noLoopMode === true || this.hasAttribute('noloopmode'),
            noZoomControls: config.noZoomControls === true || this.hasAttribute('nozoomcontrols'),
            legendMinWidth: minimum,
            legendMaxWidth: maximum,
            legendWidth: initial,
            swatches: config.swatches ?? config.colorSwatches ?? DEFAULT_TIMELINE_COLOR_SWATCHES,
        })
        this.toggleAttribute('data-keyboard-zoom-active', this._timelineConfig.keyboardZoomActive === true)
        if (this._isReadonlyMode() || this._timelineConfig.interactive === false || this._timelineConfig.editable === false) {
            this._menuOpen = false
            window.removeEventListener('pointerdown', this._handleTrackLabelOutsidePointerDown, true)
            this._editingRowId = null
            this._editingLabelValue = ''
            if (timelineInteractionState.activeClipOptionDrag?.owner === this) timelineInteractionState.activeClipOptionDrag = null
            this._clearClipOptionDragPreview({render: false})
            this._draggedClipOption = null
            this._dragState = null
            this._removePointerListeners()
            this._stopAutoScroll()
            this._closeClipContextMenu()
            this._closeTrackContextMenu()
            this._cancelCutMode({render: false})
        }
        if (this._timelineConfig.toolsHidden === true) this._cancelCutMode({render: false})
        this._visible = this._timelineConfig.visible !== false
        this._requestControlledSync({
            zoomPercent: applyControlledZoom ? requestedZoom : undefined,
            forceRender: !this._stateSignatures.valuesEqual(
                previousStructureConfig,
                this._structureConfig(this._timelineConfig, STRUCTURAL_CONFIG_KEYS),
            ),
        })
    }

    /**
     * Get the public track definitions.
     *
     * @returns {Array} Track definitions.
     */
    get tracks() {
        return this._rows.map(row => this._publicTrack(row))
    }

    /**
     * Get the identifier of the selected clip.
     *
     * @returns {string|number|null} Selected clip identifier.
     */
    get selectedClipId() {
        if (this._selectedClipKey === null) return null
        const separatorIndex = this._selectedClipKey.indexOf('\u0000')
        return separatorIndex < 0 ? null : this._selectedClipKey.slice(separatorIndex + 1)
    }

    /**
     * Select a clip by its identifier, or clear the selection.
     *
     * @param {string|number|null} value - Clip identifier.
     */
    set selectedClipId(value) {
        if (value === null || value === undefined) {
            this._selectedClipKey = null
        } else {
            const entry = this._clipEditor.findClipEntry(this._rows, value)
            this._selectedClipKey = entry && entry.clip.selectable !== false
                ? this._clipSelectionKey(entry.row.id, entry.clip.id)
                : null
        }
        this._updateClipSelectionPresentation()
    }

    /**
     * Set the public track definitions.
     *
     * @param {Array} value - Track definitions.
     */
    set tracks(value) {
        if (!this._localDurationDirty) this._interactionDurationMillis = null
        const incoming = (Array.isArray(value) ? value : []).map(row => {
            const {actions, ...track} = row ?? {}
            return {...track, clips: normalizeClipLayout(track.clips ?? actions)}
        })
        const controlledRowsChanged = !this._stateSignatures.rowsEqual(incoming, this._trackDefinitions)
        const localPlacementChanged = !this._stateSignatures.placementEqual(this._rows, this._trackDefinitions)
        const baselineIds = this._trackDefinitions.map(row => row.id)
        const incomingIds = incoming.map(row => row.id)
        const incomingUsesBaselineIds = incomingIds.length === baselineIds.length
            && incomingIds.every((id, index) => id === baselineIds[index])
        const preserveLocalRows = this._localRowsDirty
            && (
                !controlledRowsChanged
                || (incomingUsesBaselineIds && localPlacementChanged
                    && this._stateSignatures.placementEqual(incoming, this._rows))
            )
        if (!preserveLocalRows) {
            this._localRowsDirty = false
            if (controlledRowsChanged) {
                this._localDurationDirty = false
                this._interactionDurationMillis = null
            }
        }
        this._trackDefinitions = incoming
        const editedRow = this._trackDefinitions.find(row => row.id === this._editingRowId)
        if (editedRow && (editedRow.visible === false || editedRow.editable === false)) {
            window.removeEventListener('pointerdown', this._handleTrackLabelOutsidePointerDown, true)
            this._editingRowId = null
            this._editingLabelValue = ''
        }
        // Keep the current vertical scale when controlled track data is replaced.
        // A rerender can briefly expose a smaller layout and otherwise make the
        // natural row-height calculation shrink on every replacement.
        if (this.isConnected
            && this._verticalZoomRowHeight === null
            && this._root.querySelector('[data-layout]')
            && Number.isFinite(this._rowHeight)) {
            this._verticalZoomRowHeight = this._rowHeight
        }
        this._requestControlledSync()
    }

    /**
     * Get the current logical timeline time.
     *
     * @returns {number} Current time in milliseconds.
     */
    get currentTimeMillis() {
        return this._currentTimeMillis
    }

    /**
     * Set the current logical timeline time.
     *
    * @param {number} value - Time in milliseconds.
     */
    set currentTimeMillis(value) {
        const normalizedTime = this._normalizeTime(value, false)
        if (normalizedTime === this._currentTimeMillis) return
        const previousTimeMillis = this._currentTimeMillis
        this._currentTimeMillis = normalizedTime
        if (this._controlledUpdateDepth > 0) return
        const elements = this._dynamicElements ?? this._cacheDynamicElements()
        this._updatePlayheadPresentation(elements)
        this._updateTransportButtons(elements)
        this._followPlaybackViewport(previousTimeMillis)
    }

    /**
     * Update only the visual playhead position without refreshing secondary controls.
     *
     * @param {number} value - Time in milliseconds.
     * @returns {void}
     */
    setPlayheadTimeMillis(value) {
        const normalizedTime = this._normalizeTime(value, false)
        if (normalizedTime === this._currentTimeMillis) return
        const previousTimeMillis = this._currentTimeMillis
        this._currentTimeMillis = normalizedTime
        const elements = this._dynamicElements ?? this._cacheDynamicElements()
        this._updatePlayheadPosition(elements)
        this._followPlaybackViewport(previousTimeMillis)
    }

    /**
     * Get the current playback state.
     *
     * @returns {boolean} Whether playback is active.
     */
    get playing() {
        return this._playing
    }

    /**
     * Set the current playback state.
     *
     * @param {boolean} value - Whether playback is active.
     */
    set playing(value) {
        const wasPlaying = this._playing
        this._playing = value === true
        this.toggleAttribute('data-playback-active', this._playing)
        if (this._playing && !wasPlaying) {
            this._removePointerListeners()
            this._closeClipContextMenu()
            this._closeTrackContextMenu()
            this._menuOpen = false
            this._editingRowId = null
            this._editingLabelValue = ''
        }
        if (!wasPlaying && this._playing) {
            const previousTimeMillis = this._currentTimeMillis
            this._currentTimeMillis = this._rangeStartMillis
            if (this._currentTimeMillis !== previousTimeMillis) this._updateDynamicState()
            this._followPlaybackViewport(previousTimeMillis)
        }
        if (this.isConnected && wasPlaying && !this._playing && !this.readonly) this._render()
        else {
            this._updatePlaybackButton()
            this._updatePlaybackEditingPresentation()
        }
    }

    /**
     * Get the clip insertion options.
     *
     * @returns {Array} Clip options.
     */
    get clipOptions() {
        return this._clipOptions ? [...this._clipOptions] : []
    }

    /**
     * Set the clip insertion options.
     *
     * @param {Array} value - Clip options.
     */
    set clipOptions(value) {
        this._clipOptions = value === null || value === undefined
            ? null
            : (Array.isArray(value) ? value : [])
        if (this.isConnected) this._requestControlledSync({forceRender: true})
    }

    /**
     * Apply several controlled values as one structural synchronization.
     *
     * @param {Object} state - Controlled timeline values.
     */
    applyControlledState(state = {}) {
        this._controlledUpdateDepth += 1
        try {
            if (Object.prototype.hasOwnProperty.call(state, 'timeline')) this.timeline = state.timeline
            if (Object.prototype.hasOwnProperty.call(state, 'tracks')) this.tracks = state.tracks
            if (Object.prototype.hasOwnProperty.call(state, 'clipOptions')) this.clipOptions = state.clipOptions
        }
        finally {
            this._controlledUpdateDepth -= 1
            if (this._controlledUpdateDepth === 0) this._flushControlledSync()
        }
        if (Object.prototype.hasOwnProperty.call(state, 'playing')) this.playing = state.playing
        if (Object.prototype.hasOwnProperty.call(state, 'looping')) this.looping = state.looping
        if (Object.prototype.hasOwnProperty.call(state, 'currentTimeMillis')) this.currentTimeMillis = state.currentTimeMillis
    }

    /**
     * Release observers, pointer listeners, and animation frames.
     */
    disconnectedCallback() {
        this._cancelBuildingCompletion()
        this._removeInputPropagationBlockers()
        this._additionalContentToggle?.removeEventListener('click', this._toggleAdditionalContent)
        this._additionalContentToggle = null
        window.removeEventListener('keydown', this._handleWindowKeyDown, true)
        window.removeEventListener('pointerdown', this._handleCutModeOutsidePointerDown, true)
        window.removeEventListener('dragstart', this._handleWindowClipOptionDragStart)
        window.removeEventListener('drag', this._handleWindowClipOptionDrag)
        window.removeEventListener('dragover', this._handleWindowClipOptionDragOver, true)
        window.removeEventListener('drop', this._handleWindowClipOptionDrop, true)
        window.removeEventListener('dragend', this._handleWindowClipOptionDragEnd)
        if (timelineInteractionState.activeClipOptionDrag?.owner === this) timelineInteractionState.activeClipOptionDrag = null
        this._cancelExternalClipPreview()
        this._draggedClipOption = null
        this._clearClipOptionDragPreview({render: false})
        window.removeEventListener('pointerdown', this._handleTrackLabelOutsidePointerDown, true)
        this._resizeObserver?.disconnect()
        this._resizeObserver = null
        this._cancelLayoutRefresh()
        this._removePointerListeners()
        this._finishScrollbarDrag()
        this._cancelScrollbarsUpdate()
        this._finishNativeSplitPanelInteraction()
        this._cancelVerticalScrollRestore()
        this._cancelLegendWidthCorrection()
        this._externalInteractionActive = false
        this._scrollbarsInteractionActive = false
        this._clearScrollbarHideTimer()
        this._clearClipSnapGuide()
        this._cancelCutMode({render: false})
        this._stopAutoScroll()
        this._cancelClipCopy()
        this._closeClipContextMenu()
        this._closeTrackContextMenu()
        this._dynamicElements = null
        this._clipPresentationElements = null
        this._scrollbars.invalidate()
        this._domCache.invalidate()
        this._playheadGeometry = null
        this._openingBuildingStartedAt = null
        this._transportState = null
    }

    _openClipContextMenu = (clip, event) => this._menus.openClipContextMenu(clip, event)
    _openTrackContextMenu = (row, event) => this._menus.openTrackContextMenu(row, event)
    _closeClipContextMenu = options => this._menus.closeClipContextMenu(options)
    _closeTrackContextMenu = options => this._menus.closeTrackContextMenu(options)

    /**
     * Synchronize the public properties with the internal editor projection.
     */
    setTime(timeMillis, {forcePlaybackFollow = false} = {}) {
        const previousTimeMillis = this._currentTimeMillis
        this._currentTimeMillis = this._normalizeTime(timeMillis)
        this._updateDynamicState()
        this._followPlaybackViewport(previousTimeMillis, forcePlaybackFollow)
    }

    /**
     * Advance the controlled playhead by a duration.
     *
     * @param {number} durationMillis - Duration to advance in milliseconds.
     * @returns {number} Normalized current time in milliseconds.
     */
    advance(durationMillis) {
        const duration = Math.max(0, Number(durationMillis) || 0)
        this.setTime(this._currentTimeMillis + duration)
        return this._currentTimeMillis
    }

    /**
     * Rewind the controlled playhead by a duration.
     *
     * @param {number} durationMillis - Duration to rewind in milliseconds.
     * @returns {number} Normalized current time in milliseconds.
     */
    rewind(durationMillis) {
        const duration = Math.max(0, Number(durationMillis) || 0)
        this.setTime(this._currentTimeMillis - duration)
        return this._currentTimeMillis
    }

    _startRangeInteraction = (event, edge) => this._timeInteraction.startRangeInteraction(event, edge)
    _previewRangeInteraction = event => this._timeInteraction.previewRangeInteraction(event)
    _setRangeBoundaryToLimit = (edge, event) => this._timeInteraction.setRangeBoundaryToLimit(edge, event)
    _moveRangeByKeyboard = (edge, event) => this._timeInteraction.moveRangeByKeyboard(edge, event)
    _startPlayheadInteraction = event => this._timeInteraction.startPlayheadInteraction(event)
    _movePlayheadByKeyboard = event => this._timeInteraction.movePlayheadByKeyboard(event)
    _handleRulerClick = event => this._timeInteraction.handleRulerClick(event)
    _handleRulerPointerDown = event => this._timeInteraction.handleRulerPointerDown(event)
    _seek = (clientX, settled) => this._timeInteraction.seek(clientX, settled)
    _rangeChangeDetail = (event, rangeStartMillis, rangeEndMillis) => this._timeInteraction.rangeChangeDetail(event, rangeStartMillis, rangeEndMillis)

}

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAME)) {
    customElements.define(TAG_NAME, LGS1920Timeline)
}
