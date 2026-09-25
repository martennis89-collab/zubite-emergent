/**
 * Social-kit slot merging — the single implementation, shared by the CLI
 * (scripts/social-kit/build-batch.mjs) and the admin generator page
 * (app/admin/social-kit). Deliberately dependency-free and free of any
 * Node built-ins so the exact same code runs in both places; two copies
 * would inevitably drift and only one of them would match the design.
 *
 * Every editable node in a template SVG carries `data-slot="name"`.
 * Slots are matched by name, never positionally, so restyling or
 * re-ordering a template can never silently repoint a slot at the wrong
 * text.
 */

export function xmlEscape(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Undo xmlEscape — used when reading a template's current copy back out. */
export function xmlUnescape(value) {
  return String(value)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/**
 * Locate the element carrying data-slot="name" and return the span of its
 * inner content. Templates never nest <text> inside <text>, so the first
 * matching close tag is the correct one.
 */
export function findSlot(svg, name) {
  const open = new RegExp(`<(text|tspan|image)\\b[^>]*data-slot="${name}"[^>]*>`)
  const m = open.exec(svg)
  if (!m) return null
  const tag = m[1]
  const innerStart = m.index + m[0].length
  const innerEnd = svg.indexOf(`</${tag}>`, innerStart)
  if (innerEnd === -1) return null
  return { tag, openTag: m[0], openStart: m.index, innerStart, innerEnd }
}

/** The template's existing <tspan> children, as reusable attribute strings. */
export function templateTspans(inner) {
  const out = []
  const re = /<tspan\b([^>]*)>/g
  let m
  while ((m = re.exec(inner)) !== null) out.push(m[1])
  return out
}

/**
 * Rebuild tspans for `lines`, reusing the template's own attributes.
 *
 * The masters share a consistent shape: the first tspan sits on the
 * <text> element's own y (no dy), each following one carries the dy that
 * defines the leading, and an optional final tspan adds the italic
 * Playfair accent. We therefore reuse:
 *   line 1        -> template tspan 1 (no dy)
 *   lines 2..n-1  -> template tspan 2 (the leading)
 *   line n        -> the accent tspan, when the template had one
 * so a 2-line and a 5-line headline both keep the intended rhythm and
 * the accent stays on the last line instead of collapsing onto one
 * baseline or being dropped.
 */
export function buildTspans(inner, lines) {
  const attrs = templateTspans(inner)
  if (attrs.length === 0) return lines.map(xmlEscape).join(' ')

  const hasAccent = attrs.length > 1 && /class="[^"]*accent/.test(attrs[attrs.length - 1])
  const body = hasAccent ? attrs.slice(0, -1) : attrs
  const accent = hasAccent ? attrs[attrs.length - 1] : null
  const first = body[0] ?? attrs[0]

  return lines
    .map((line, i) => {
      const isLast = i === lines.length - 1
      let a
      if (isLast && accent && lines.length > 1) a = accent
      else if (i === 0) a = first
      else a = body[Math.min(i, body.length - 1)] ?? first
      return `<tspan${a}>${xmlEscape(line)}</tspan>`
    })
    .join('')
}

/** Replace one slot's content. `value` may be a string or an array of lines. */
export function applySlot(svg, name, value) {
  const slot = findSlot(svg, name)
  if (!slot) return { svg, ok: false }

  const inner = svg.slice(slot.innerStart, slot.innerEnd)
  const lines = Array.isArray(value) ? value : [value]
  const replacement =
    lines.length === 1 && templateTspans(inner).length <= 1
      ? xmlEscape(lines[0])
      : buildTspans(inner, lines)

  return { svg: svg.slice(0, slot.innerStart) + replacement + svg.slice(slot.innerEnd), ok: true }
}

/** Apply many slots at once. Returns the SVG plus the names that missed. */
export function applySlots(svg, slots) {
  const missing = []
  let out = svg
  for (const [name, value] of Object.entries(slots)) {
    if (value === undefined || value === null) continue
    const res = applySlot(out, name, value)
    if (!res.ok) missing.push(name)
    else out = res.svg
  }
  return { svg: out, missing }
}

/**
 * Read a template's slots and their current copy. Backs the admin form,
 * which pre-fills every field with the master's own text so an editor
 * sees exactly what they are changing rather than an empty box.
 *
 * `multiline` reports whether the slot is a multi-line block (has more
 * than one tspan), which decides textarea vs single input.
 */
export function readSlots(svg) {
  const names = []
  const re = /data-slot="([^"]+)"/g
  let m
  while ((m = re.exec(svg)) !== null) if (!names.includes(m[1])) names.push(m[1])

  return names.map((name) => {
    const slot = findSlot(svg, name)
    if (!slot) return { name, kind: 'text', multiline: false, lines: [] }
    if (slot.tag === 'image') return { name, kind: 'image', multiline: false, lines: [] }

    const inner = svg.slice(slot.innerStart, slot.innerEnd)
    const tspans = [...inner.matchAll(/<tspan\b[^>]*>([\s\S]*?)<\/tspan>/g)].map((t) =>
      xmlUnescape(t[1].trim()),
    )
    const lines = tspans.length ? tspans : [xmlUnescape(inner.trim())]
    return { name, kind: 'text', multiline: tspans.length > 1, lines }
  })
}

/** Natural pixel size of a template, for preview scaling and PNG export. */
export function readSize(svg) {
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)
  if (vb) return { width: Number(vb[1]), height: Number(vb[2]) }
  return { width: 1080, height: 1350 }
}
