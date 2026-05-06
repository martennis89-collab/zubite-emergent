/**
 * Markdown → HTML converter shared between the public blog page and the
 * admin "Test Render" preview. Keeping a single implementation guarantees
 * what the editor sees in preview is exactly what the reader will see.
 *
 * Important: pre-existing `<figure>...</figure>` HTML blocks (produced by
 * the article importer's IMAGE_ASSETS pipeline) are preserved verbatim and
 * re-injected after paragraph splitting so they don't get wrapped in <p>.
 */

export function parseMarkdown(content: string): string {
  // Step 1: extract pre-existing <figure>...</figure> HTML blocks so the
  // link/paragraph regexes below don't mangle them.
  const figures: string[] = []
  let html = content.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, (m) => {
    figures.push(m)
    return `\u0000FIG${figures.length - 1}\u0000`
  })

  html = html
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="font-serif text-xl font-semibold text-slate-900 mt-8 mb-4">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="font-serif text-2xl font-semibold text-slate-900 mt-10 mb-4">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="font-serif text-3xl font-semibold text-slate-900 mt-10 mb-4">$1</h1>')
    // Blockquotes (used for "Накратко" callout boxes etc.)
    .replace(/^> (.*$)/gim, '<blockquote class="article-callout">$1</blockquote>')
    // Bold and Italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    // Markdown image: ![alt](url "title") — rendered BEFORE links to win the regex race
    .replace(
      /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
      (_m, alt: string, url: string, title?: string) => {
        const t = title ? ` title="${title.replace(/"/g, '&quot;')}"` : ''
        return `<figure class="article-image"><img src="${url}" alt="${alt.replace(/"/g, '&quot;')}"${t} loading="lazy" /></figure>`
      },
    )
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-sky-500 hover:text-sky-600 underline">$1</a>')
    // Unordered lists
    .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
    // Line breaks / paragraphs
    .replace(/\n\n/g, '</p><p class="text-slate-700 leading-relaxed mb-4">')
    .replace(/\n/g, '<br />')

  // Wrap in paragraph if not starting with a block element
  if (
    !html.startsWith('<h') &&
    !html.startsWith('<ul') &&
    !html.startsWith('<ol') &&
    !html.startsWith('<figure') &&
    !html.startsWith('\u0000FIG')
  ) {
    html = `<p class="text-slate-700 leading-relaxed mb-4">${html}</p>`
  }

  // Wrap list items
  html = html.replace(/(<li.*<\/li>)/g, '<ul class="list-disc list-inside mb-4 space-y-2 text-slate-700">$1</ul>')

  // Re-inject extracted figure blocks. <p>…<figure>…</p> is invalid HTML, so
  // strip the surrounding <p>…</p> if it only contains the figure placeholder.
  html = html.replace(
    /<p[^>]*>\s*\u0000FIG(\d+)\u0000\s*<\/p>/g,
    (_m, idx: string) => figures[Number(idx)] || '',
  )
  html = html.replace(/\u0000FIG(\d+)\u0000/g, (_m, idx: string) => figures[Number(idx)] || '')

  return html
}
