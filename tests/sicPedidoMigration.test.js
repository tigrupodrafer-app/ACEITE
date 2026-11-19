import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../supabase/migrations/202611190001_sic_pedido_versao.sql', import.meta.url), 'utf8');

test('migração mantém RLS e propriedade por vendedor', () => {
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /force row level security/i);
  assert.match(sql, /vendedor_id\s*=\s*\(select auth\.uid\(\)\)/i);
});

test('migração não concede escrita a usuários do navegador', () => {
  assert.match(sql, /grant select on public\.sic_pedido_versao to authenticated/i);
  assert.doesNotMatch(sql, /grant\s+(?:all|insert|update|delete)\s+on public\.sic_pedido_versao\s+to authenticated/i);
});

test('migração protege versões já gravadas contra update e delete', () => {
  assert.match(sql, /before update or delete on public\.sic_pedido_versao/i);
  assert.match(sql, /raise exception/i);
});

test('hash da versão é calculado pelo banco', () => {
  assert.match(sql, /sha256_servidor\s+text generated always as/i);
  assert.match(sql, /digest\(conteudo::text, 'sha256'\)/i);
});
