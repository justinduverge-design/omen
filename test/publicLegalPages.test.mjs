import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('public legal and support routes are registered without authentication', async () => {
  const routes = await read('../frontend/src/routes/index.jsx');

  for (const route of ['/privacy', '/terms', '/support', '/delete-account']) {
    assert.match(routes, new RegExp(`path="${route}"`));
  }

  assert.doesNotMatch(routes, /<ProtectedRoute>[\s\S]*path="\/(privacy|terms|support|delete-account)"/);
});

test('the public footer links to each required legal and support page', async () => {
  const footer = await read('../frontend/src/components/layout/Footer.jsx');

  for (const route of ['/privacy', '/terms', '/support', '/delete-account']) {
    assert.match(footer, new RegExp(`to="${route}"`));
  }
});

test('public pages expose the approved monitored contact channels', async () => {
  const [privacy, terms, support] = await Promise.all([
    read('../frontend/src/pages/Privacy.jsx'),
    read('../frontend/src/pages/Terms.jsx'),
    read('../frontend/src/pages/Support.jsx'),
  ]);

  assert.match(privacy, /mailto:privacy@slopssaloon\.com/);
  assert.match(terms, /mailto:legal@slopssaloon\.com/);
  assert.match(support, /mailto:support@slopssaloon\.com/);
});

test('public legal surfaces identify Valor Ventures and landing renders the shared footer', async () => {
  const [footer, landing, privacy, terms] = await Promise.all([
    read('../frontend/src/components/layout/Footer.jsx'),
    read('../frontend/src/pages/Landing.jsx'),
    read('../frontend/src/pages/Privacy.jsx'),
    read('../frontend/src/pages/Terms.jsx'),
  ]);

  assert.match(footer, /Valor Ventures Limited Liability Company/);
  assert.match(footer, /mailto:legal@slopssaloon\.com/);
  assert.doesNotMatch(footer, /mailto:owner@slopssaloon\.com/);
  assert.match(landing, /<Footer \/>/);
  assert.match(privacy, /Valor Ventures Limited Liability Company/);
  assert.match(terms, /Valor Ventures Limited Liability Company/);
});

test('final v1 legal pages publish the approved operator, age, jurisdiction, retention, and privacy notices', async () => {
  const [privacy, terms, login, routes] = await Promise.all([
    read('../frontend/src/pages/Privacy.jsx'),
    read('../frontend/src/pages/Terms.jsx'),
    read('../frontend/src/pages/Login.jsx'),
    read('../frontend/src/routes/index.jsx'),
  ]);

  const legal = `${privacy}\n${terms}`;
  assert.match(legal, /23 Darrow St/);
  assert.match(legal, /New London, CT 06320/);
  assert.match(privacy, /effective date/i);
  assert.match(privacy, /Do Not Track/i);
  assert.match(privacy, /under 13/i);
  assert.match(privacy, /24 hours/i);
  assert.match(privacy, /Sentry/);
  assert.match(privacy, /Resend/);
  assert.match(terms, /at least 13/i);
  assert.match(terms, /Connecticut/);
  assert.match(terms, /no paid contests/i);
  assert.match(terms, /limitation of liability/i);
  assert.match(terms, /governing law/i);
  assert.doesNotMatch(legal, /open policy item|subject to final founder and counsel review/i);

  assert.match(login, /By continuing/);
  assert.match(login, /at least 13/);
  assert.match(login, /to="\/terms"/);
  assert.match(login, /to="\/privacy"/);
  assert.match(login, /localStorage\.setItem\('omen\.legal\.pending'/);
  assert.match(login, /initiated_at/);
  assert.match(login, /\/api\/user\/legal-acceptance/);
  assert.match(routes, /path="\/unsubscribe"/);
});
