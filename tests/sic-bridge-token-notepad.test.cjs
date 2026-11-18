'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
test('token can be pasted through temporary Notepad file and protected with DPAPI', () => {
  const s = read('scripts/INICIAR-PONTE-ACEITE.ps1');
  assert.match(s, /TOKEN-TEMPORARIO-/);
  assert.match(s, /FileSystemAccessRule/);
  assert.match(s, /SetAccessRuleProtection\(\$true,\$false\)/);
  assert.match(s, /Start-Process -FilePath notepad\.exe .* -Wait/);
  assert.match(s, /\.Length -lt 32/);
  assert.match(s, /ConvertTo-SecureString -String \$plain -AsPlainText -Force/);
  assert.match(s, /ConvertFrom-SecureString -SecureString \$secure/);
  assert.match(s, /Move-Item -LiteralPath \$encryptedTemp -Destination \$secretFile/);
  assert.match(s, /Remove-Item -LiteralPath \$plainFile -Force/);
  assert.doesNotMatch(s, /Read-Host 'Cole o SIC_BRIDGE_TOKEN/);
  assert.doesNotMatch(s, /Restart-Service|Stop-Service|taskkill|Stop-Process/);
});
test('one-click BAT pins exactly the new Notepad initializer version', () => {
  const s = read('scripts/INICIAR-PONTE-ACEITE.bat');
  assert.match(s, /15eda7de08673069424f51cdad2df07f74512289/);
  assert.match(s, /c2908e673d7f47b798c46787e4e445dda97cb098/);
  assert.match(s, /hash-object/);
});
