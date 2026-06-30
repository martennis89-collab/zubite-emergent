/**
 * Unit tests for sanitizeArticleHtml (SEC-003).
 *
 * Run with:  cd /app/frontend && node lib/sanitizeHtml.test.mjs
 *
 * No test framework dependency — uses node:assert so this works in any env.
 */

import assert from 'node:assert/strict'
import { sanitizeArticleHtml } from './sanitizeHtml.ts'

let failed = 0
function it(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failed++
    console.error(`  ✗ ${name}\n    ${e.message}`)
  }
}

console.log('sanitizeArticleHtml — SEC-003 tests')

it('strips <script> tags', () => {
  const out = sanitizeArticleHtml('<p>hello</p><script>alert(1)</script>')
  assert.ok(!/script/i.test(out), `got: ${out}`)
})

it('strips inline onclick handler', () => {
  const out = sanitizeArticleHtml('<a href="https://example.com" onclick="alert(1)">x</a>')
  assert.ok(!/onclick/i.test(out), `got: ${out}`)
})

it('strips inline onerror handler on img', () => {
  const out = sanitizeArticleHtml('<img src="x" onerror="alert(1)" />')
  assert.ok(!/onerror/i.test(out), `got: ${out}`)
})

it('neutralises javascript: URLs', () => {
  const out = sanitizeArticleHtml('<a href="javascript:alert(1)">x</a>')
  assert.ok(!/javascript:/i.test(out), `got: ${out}`)
})

it('blocks <iframe>', () => {
  const out = sanitizeArticleHtml('<iframe src="https://evil"></iframe>')
  assert.ok(!/iframe/i.test(out), `got: ${out}`)
})

it('blocks <object> and <embed>', () => {
  const out = sanitizeArticleHtml('<object data="x"></object><embed src="x" />')
  assert.ok(!/object|embed/i.test(out), `got: ${out}`)
})

it('keeps normal headings, lists, paragraphs', () => {
  const html = '<h2>Title</h2><p>Body</p><ul><li>a</li><li>b</li></ul>'
  const out = sanitizeArticleHtml(html)
  assert.ok(out.includes('<h2>'))
  assert.ok(out.includes('<p>'))
  assert.ok(out.includes('<ul>'))
  assert.ok(out.includes('<li>'))
})

it('keeps anchor href + adds rel for external http(s)', () => {
  const out = sanitizeArticleHtml('<a href="https://example.com">x</a>')
  assert.ok(/href="https:\/\/example\.com"/.test(out))
  assert.ok(/rel="noopener noreferrer nofollow"/.test(out))
})

it('keeps img with http(s) src + alt', () => {
  const out = sanitizeArticleHtml('<img src="https://cdn.example/foo.png" alt="ok" />')
  assert.ok(/<img[^>]*src="https:\/\/cdn\.example\/foo\.png"/.test(out))
  assert.ok(/alt="ok"/.test(out))
})

it('strips <style> tag', () => {
  const out = sanitizeArticleHtml('<style>body{display:none}</style><p>x</p>')
  assert.ok(!/<style/i.test(out))
})

it('strips inline style attribute', () => {
  const out = sanitizeArticleHtml('<p style="position:fixed">x</p>')
  assert.ok(!/style=/i.test(out))
})

console.log(failed === 0 ? 'ALL PASSED ✅' : `${failed} FAILED ❌`)
process.exit(failed === 0 ? 0 : 1)
