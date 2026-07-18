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
 * Uses `sanitize-html` (pure JS, no DOM dependency) rather than
 * isomorphic-dompurify. The latter wraps jsdom, whose transitive dependency
 * `html-encoding-sniffer` -> `@exodus/bytes` ships as an ESM-only package
 * that Node's `require()` cannot load — this crashed every blog article
 * page in Vercel's production serverless runtime (`ERR_REQUIRE_ESM`) while
 * working fine locally under `next dev`, since Vercel's bundler resolves
 * the dependency tree differently. sanitize-html has no such dependency.
 *
 * SEC-003 reference: blog raw-HTML render sink hardening.
 */

import sanitizeHtml from 'sanitize-html'

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

const COMMON_ATTR = ['class', 'id', 'title', 'lang', 'dir']

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'target', 'rel', ...COMMON_ATTR],
  img: ['src', 'alt', 'loading', 'width', 'height', 'srcset', 'sizes', ...COMMON_ATTR],
  th: ['colspan', 'rowspan', 'align', 'scope', ...COMMON_ATTR],
  td: ['colspan', 'rowspan', 'align', ...COMMON_ATTR],
  '*': COMMON_ATTR,
}

/**
 * Sanitize HTML produced from blog/article markdown before it is rendered
 * via `dangerouslySetInnerHTML`. Returns a string safe to embed in a
 * React subtree.
 */
export function sanitizeArticleHtml(dirty: string): string {
  if (!dirty) return ''
  return sanitizeHtml(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    // Only http(s) hrefs; javascript:/vbscript:/data: are blocked by
    // omission (the attribute is stripped, not the whole element).
    allowedSchemes: ['http', 'https'],
    allowedSchemesByTag: {
      // <img src="data:image/..."> is a legitimate inline-image case; no
      // other tag gets the data: scheme.
      img: ['http', 'https', 'data'],
    },
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    // Disallowed tags are stripped but their text content is kept
    // (matches the previous DOMPurify KEEP_CONTENT: true behaviour).
    // script/style content is always fully discarded regardless.
    disallowedTagsMode: 'discard',
    exclusiveFilter: (frame) => {
      // Belt-and-braces beyond scheme filtering: reject any <img src>
      // that isn't http(s), root-relative, or a real data:image/* URI.
      if (frame.tag === 'img') {
        const src = frame.attribs.src || ''
        return !!src && !/^https?:/i.test(src) && !/^\//.test(src) && !/^data:image\//i.test(src)
      }
      return false
    },
    transformTags: {
      // Force every external link to open safely.
      a: (tagName, attribs) => {
        const isExternal = /^https?:/i.test(attribs.href || '')
        return {
          tagName,
          attribs: isExternal
            ? { ...attribs, rel: 'noopener noreferrer nofollow', target: attribs.target || '_blank' }
            : attribs,
        }
      },
    },
  })
}

export default sanitizeArticleHtml
