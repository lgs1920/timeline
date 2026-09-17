/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: timelineEventDetails.js
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

/**
 * Add a lazily computed public snapshot to an event detail object.
 *
 * @param {Object} detail - Mutable event detail payload.
 * @param {Function} getSnapshot - Snapshot factory.
 * @returns {Object} Event detail payload with a lazy data property.
 */
export const withLazySnapshot = (detail, getSnapshot) => {
    let snapshot
    Object.defineProperty(detail, 'data', {
        configurable: true,
        enumerable: true,
        get: () => snapshot ?? (snapshot = getSnapshot()),
    })
    return detail
}
