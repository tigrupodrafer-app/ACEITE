'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const login=readFileSync(join(__dirname,'../src/pages/Login.jsx'),'utf8');
const auth=readFileSync(join(__dirname,'../src/lib/AuthContext.jsx'),'utf8');
test('pilot email accounts are explicit but do not automatically signup',()=>{
  assert.match(login,/heitor\.lopes@grupodrafer\.com/);
  assert.match(login,/diretoria@grupodrafer\.com/);
  assert.match(login,/signInWithOtp/);
  assert.match(login,/shouldCreateUser:\s*false/);
});
test('OTP is verified through Supabase and Google remains available',()=>{
  assert.match(login,/verifyOtp/);
  assert.match(login,/type:\s*'email'/);
  assert.match(login,/signInWithOAuth/);
  assert.match(login,/provider:\s*'google'/);
  assert.match(auth,/\.netlify\/functions\/me/);
});
test('institutional login never uses service key in the client',()=>{
  assert.doesNotMatch(login,/SUPABASE_SERVICE_ROLE_KEY|auth\.admin\.createUser|signUp\(/);
});

test('OTP success requires session and redirects to protected route without using code twice',()=>{
  assert.match(login,/if \(!data\?\.session\?\.access_token\)/);
  assert.match(login,/window\.location\.replace\('\/Dashboard'\)/);
  assert.doesNotMatch(login,/await checkAppState\(\)/);
});
