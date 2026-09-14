const escapeHtml = value => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const formatReleaseDate = publishedAt => {
    const datePart = publishedAt.slice(0, 10)
    const date = new Date(`${datePart}T12:00:00Z`)

    if (Number.isNaN(date.getTime())) {
        return {dateTime: '', label: 'Publication date unavailable'}
    }

    return {
        dateTime: datePart,
        label: new Intl.DateTimeFormat('en-US', {dateStyle: 'long', timeZone: 'UTC'}).format(date),
    }
}

/**
 * Parse the NUL-delimited tag records returned by git for-each-ref.
 *
 * @param {string} raw - Git tag, publication date, and annotation records.
 * @returns {Array<{tag: string, publishedAt: string, changes: string[], compareUrl: string}>}
 */
export const parseReleaseTags = raw => {
    const fields = raw.split('\0')
    const releases = []

    for (let index = 0; index + 2 < fields.length; index += 3) {
        const tag = fields[index].trim()
        const publishedAt = fields[index + 1].trim()
        const message = fields[index + 2].trim()

        if (!tag) {
            continue
        }

        const messageLines = message.split('\n').map(line => line.trim())
        const changesStart = messageLines.indexOf('Changes:')
        const compareLine = messageLines.find(line => line.startsWith('Changes between releases:'))
        const changesEnd = compareLine ? messageLines.indexOf(compareLine) : messageLines.length
        const changes = changesStart === -1
            ? []
            : messageLines
                .slice(changesStart + 1, changesEnd)
                .filter(line => line.startsWith('- '))
                .map(line => line.slice(2))

        releases.push({
            tag,
            publishedAt,
            changes,
            compareUrl: compareLine?.slice('Changes between releases:'.length).trim() ?? '',
        })
    }

    return releases
}

/**
 * Render release entries as escaped semantic HTML.
 *
 * @param {ReturnType<typeof parseReleaseTags>} releases - Parsed releases.
 * @returns {string} Release entry markup.
 */
export const renderChangelogEntries = releases => {
    if (releases.length === 0) {
        return '<p class="changelog-empty">No published releases have been recorded yet.</p>'
    }

    return releases.map(({tag, publishedAt, changes, compareUrl}) => {
        const {dateTime, label} = formatReleaseDate(publishedAt)
        const entryId = `release-${tag.replaceAll(/[^a-zA-Z0-9-]+/g, '-')}`
        const changesMarkup = changes.length > 0
            ? `<ul class="changelog-changes">${changes.map(change => `<li>${escapeHtml(change)}</li>`).join('')}</ul>`
            : '<p class="changelog-empty">No release summary was recorded for this version.</p>'
        const compareMarkup = compareUrl
            ? `<a class="changelog-compare" href="${escapeHtml(compareUrl)}" target="_blank" rel="noopener noreferrer">Compare changes</a>`
            : ''

        return `<article class="changelog-entry" id="${escapeHtml(entryId)}">
    <header class="changelog-entry-header">
        <div>
            <p class="eyebrow">Release</p>
            <h2>${escapeHtml(tag)}</h2>
        </div>
        <time datetime="${escapeHtml(dateTime)}">${escapeHtml(label)}</time>
    </header>
    ${changesMarkup}
    ${compareMarkup}
</article>`
    }).join('\n')
}
