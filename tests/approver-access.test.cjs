'use strict';
const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
test('approver access is limited and does not inherit staff-wide endpoints',()=>{
  const backend=read('netlify/functions/_lib/backend.cjs');
  assert.match(backend,/allowedRoles = \['admin', 'vendedor'\]/);
  const me=read('netlify/functions/me.cjs');
  assert.match(me,/allowedRoles: \['admin', 'vendedor', 'aprovador'\]/);
  const formal=read('netlify/functions/formal-approval.cjs');
  assert.match(formal,/allowedRoles: \['admin', 'aprovador'\]/);
  assert.match(formal,/authority\(authUser\.id,o\.sic_company_id\)/);
  const app=read('src/App.jsx');
  assert.match(app,/user\?\.role === 'aprovador'/);
  assert.match(app,/<ApproverHome \/>/);
  const home=read('src/pages/ApproverHome.jsx');
  assert.match(home,/apiGet\('\/\.netlify\/functions\/approval-queue'\)/);
  assert.doesNotMatch(home,/SicLookup|OrdersTable|import\s+Dashboard|\/\.netlify\/functions\/sic-/);
});
test('access-restricted screen is translated into Portuguese',()=>{
  const page=read('src/components/UserNotRegisteredError.jsx');
  assert.match(page,/Acesso ainda não autorizado/);
  assert.doesNotMatch(page,/Access Restricted/);
});
