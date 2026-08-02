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

  assert.match(footer, /Valor Ventures LLC/);
  assert.match(footer, /mailto:legal@slopssaloon\.com/);
  assert.doesNotMatch(footer, /mailto:owner@slopssaloon\.com/);
  assert.match(landing, /<Footer \/>/);
  assert.match(privacy, /Valor Ventures LLC operates Omen/);
  assert.match(terms, /Omen is a product of Valor Ventures LLC/);
});
