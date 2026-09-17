/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: timelineConstants.js
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

export const ROW_DRAG_THRESHOLD = 4
export const CLIP_DRAG_THRESHOLD = 4
export const TOUCH_CLIP_DRAG_THRESHOLD = 8
export const CLIP_OPTION_DRAG_MIME = 'application/x-lgs1920-timeline-clip'
export const TIMELINE_EVENT_PREFIX = 'lgs1920-timeline-'
export const TIMELINE_MODES = Object.freeze(['passive', 'review', 'edit', 'readonly'])
export const timelineInteractionState = {
    activeClipOptionDrag: null,
}
