/**
 * Centralised HTML sanitizer for any user-/import-controlled content that
 * ends up inside `dangerouslySetInnerHTML`.
 *
 * Currently used for blog/article bodies which can originate from:
 *   • the admin "New article" editor (markdown → parseMarkdown → HTML)
 *   • the Make.com / importer pipeline that may inject raw <figure> blocks
 *
 * Allow-list rationale:
 *   - keep everything an editorial article legitimately needs (headings,
 *     lists, paragraphs, emphasis, links, images, tables, blockquotes,
 *     <figure>/<figcaption>, <br>, <hr>)
 *   - drop everything that is a known XSS surface (<script>, <iframe>,
 *     <object>, <embed>, inline event handlers like onclick=, javascript:
 *     URLs, raw <style> tags, etc.)
 *
 * DOMPurify is used because it is battle-tested, has both a JSDOM-based
 * server build (`isomorphic-dompurify`) and a browser build, and is the
 * recommended sanitizer for React `dangerouslySetInnerHTML` content.
 *
 * SEC-003 reference: blog raw-HTML render sink hardening.
 */

import DOMPurify from 'isomorphic-dompurify'

const ALLOWED_TAGS = [
  // Structure
  'p', 'br', 'hr', 'span', 'div',
  // Headings
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  // Emphasis
  'strong', 'em', 'b', 'i', 'u', 's', 'mark', 'small', 'sub', 'sup', 'code',
  // Lists
  'ul', 'ol', 'li',
  // Quotes
  'blockquote', 'cite', 'q',
  // Links + media
  'a', 'img', 'figure', 'figcaption',
  // Tables
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  // Code blocks
  'pre', 'kbd', 'samp',
]

const ALLOWED_ATTR = [
  'href', 'target', 'rel', 'title',
  'src', 'alt', 'loading', 'width', 'height', 'srcset', 'sizes',
  'class', 'id',
  'colspan', 'rowspan', 'align', 'scope',
  'lang', 'dir',
]

// Hooks add safety beyond what the default DOMPurify config provides.
let hooksInstalled = false
function ensureHooks() {
  if (hooksInstalled) return
  // @ts-expect-error addHook typings differ between browser/node builds
  DOMPurify.addHook('afterSanitizeAttributes', (node: Element) => {
    // Force every external link to open safely.
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || ''
      // Block javascript:, data: (except data:image/* on <img>), vbscript:
      if (/^\s*(javascript|vbscript|data):/i.test(href)) {
        node.removeAttribute('href')
      }
      // If link leaves the site, add rel and target safely.
      if (/^https?:/i.test(href)) {
        node.setAttribute('rel', 'noopener noreferrer nofollow')
        if (!node.getAttribute('target')) {
          node.setAttribute('target', '_blank')
        }
      }
    }
    // <img> may only use http(s) or data:image/*
    if (node.tagName === 'IMG') {
      const src = node.getAttribute('src') || ''
      if (
        !/^https?:/i.test(src) &&
        !/^\//.test(src) &&
        !/^data:image\//i.test(src)
      ) {
        node.removeAttribute('src')
      }
    }
  })
  hooksInstalled = true
}

/**
 * Sanitize HTML produced from blog/article markdown before it is rendered
 * via `dangerouslySetInnerHTML`. Returns a string safe to embed in a
 * React subtree.
 */
export function sanitizeArticleHtml(dirty: string): string {
  if (!dirty) return ''
  ensureHooks()
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Explicit deny-list as defence-in-depth (DOMPurify already strips
    // these but being explicit makes the intent obvious in audits).
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'link', 'meta'],
    FORBID_ATTR: ['style', 'onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur'],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
    // Use the default html profile (no SVG/MathML — we don't need them
    // and they are common XSS vectors).
    USE_PROFILES: { html: true },
  })
}

export default sanitizeArticleHtml
