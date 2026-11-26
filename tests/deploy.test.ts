import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolveSiteUrl } from '../scripts/build-site.ts'

test('resolveSiteUrl prefers SKETCH_SITE_URL', () => {
  assert.equal(resolveSiteUrl({ SKETCH_SITE_URL: 'https://sketches.test/', VERCEL: '1' }), 'https://sketches.test/')
})

test('resolveSiteUrl uses the Vercel production domain when deployed without one', () => {
  assert.equal(resolveSiteUrl({ VERCEL: '1', VERCEL_PROJECT_PRODUCTION_URL: 'ux.example.vercel.app' }), 'https://ux.example.vercel.app')
})

test('resolveSiteUrl refuses to build a deployment with localhost URLs', () => {
  assert.throws(() => resolveSiteUrl({ VERCEL: '1' }), /SKETCH_SITE_URL/)
})

test('resolveSiteUrl defaults to the local preview off Vercel', () => {
  assert.equal(resolveSiteUrl({}), 'http://localhost:4173')
})

test('the repo pins a Node version with import.meta.main and type stripping', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(pkg.engines?.node, '>=24.2')
})
