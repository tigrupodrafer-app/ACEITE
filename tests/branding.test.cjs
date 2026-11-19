'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const root = join(__dirname, '..');
const read = p => readFileSync(join(root, p), 'utf8');

test('tab title, favicon and social metadata belong to ACEITE DRAFER', () => {
  const html = read('index.html');
  assert.match(html, /<title>ACEITE DRAFER<\/title>/);
  assert.match(html, /href="\/favicon\.svg"/);
  assert.doesNotMatch(html, /base44\.com|Base44 APP|bolt\.new/i);
  assert.match(read('public/favicon.svg'), /<svg/);
});
test('visible migrated pages use the ACEITE DRAFER identity', () => {
  for (const path of ['src/Layout.jsx','src/pages/Login.jsx',
    'src/pages/Dashboard.jsx','src/pages/PublicAcceptance.jsx']) {
    const page = read(path);
    assert.match(page, /ACEITE DRAFER/, path);
    assert.doesNotMatch(page, /DRAFER ACEITE|Base44/, path);
  }
});
