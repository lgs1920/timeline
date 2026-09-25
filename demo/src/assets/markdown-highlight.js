/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: markdown-highlight.js
 *
 * Author : LGS1920 Team
 * email: studio@lgs1920.fr
 *
 * Created on: 2026-09-25
 * Last modified: 2026-09-25
 *
 *
 * Copyright © 2026 LGS1920
 ******************************************************************************/

/* Highlight code blocks rendered by <wa-markdown> after Marked populates the light DOM. */

import Prism from 'prismjs'
import 'prismjs/components/prism-bash.js'
import 'prismjs/components/prism-css.js'
import 'prismjs/components/prism-javascript.js'
import 'prismjs/components/prism-jsx.js'
import 'prismjs/components/prism-json.js'
import 'prismjs/components/prism-markup.js'
import 'prismjs/components/prism-typescript.js'

const LANGUAGE_ALIASES = {
    bash: 'bash',
    css: 'css',
    html: 'markup',
    javascript: 'javascript',
    js: 'javascript',
    jsx: 'jsx',
    json: 'json',
    markup: 'markup',
    shell: 'bash',
    sh: 'bash',
    svg: 'markup',
    ts: 'typescript',
    typescript: 'typescript',
    xml: 'markup',
}

/** Resolve a Markdown language class to a Prism grammar name. */
const getLanguage = code => {
    const languageClass = [...code.classList].find(className => className.startsWith('language-'))
    const requestedLanguage = languageClass?.slice('language-'.length).toLowerCase()
    return LANGUAGE_ALIASES[requestedLanguage] ?? requestedLanguage
}

/** Highlight every newly rendered Markdown code block. */
const highlightMarkdown = () => {
    document.querySelectorAll('.readme-content wa-markdown pre code, .docs-content wa-markdown pre code')
        .forEach(code => {
            if (code.dataset.syntaxHighlighted === 'true') return

            const language = getLanguage(code)
            const grammar = language ? Prism.languages[language] : undefined
            if (!grammar) return

            code.innerHTML = Prism.highlight(code.textContent ?? '', grammar, language)
            code.dataset.syntaxHighlighted = 'true'
        })
}

const markdownRoots = document.querySelectorAll('.readme-content, .docs-content')
markdownRoots.forEach(root => {
    new MutationObserver(highlightMarkdown).observe(root, {childList: true, subtree: true})
})

highlightMarkdown()
