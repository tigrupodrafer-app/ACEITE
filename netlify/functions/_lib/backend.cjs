'use strict';

// Trusted server-only Supabase REST client. Never bundle this module into Vite.
const { createHash } = require('node:crypto');

const PROJECT_URL = 'https://jgdacjhjbqrtlklghcev.supabase.co';
const noCache = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' };

function respond(statusCode, data) {
  return { statusCode, headers: noCache, body: JSON.stringify(data) };
}

function getSecretConfig() {
  const url = process.env.SUPABASE_URL || PROJECT_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Use a single fixed project. Do not accidentally access a separate project.
  if (url !== PROJECT_URL || !key) {
    throw Object.assign(new Error('Backend not configured for the correct Supabase project'), { statusCode: 503 });
  }
  return { url, key };
}

async function supabaseFetch(path, { method = 'GET', body, headers = {}, userToken } = {}) {
  const { url, key } = getSecretConfig();
  const res = await fetch(url + path, {
    method,
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + (userToken || key),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    // Never send raw database errors to the caller.
    const error = new Error('Supabase request failed');
    error.statusCode = res.status === 401 || res.status === 403 ? 403 : 502;
    throw error;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function requireStaff(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || '';
  const match = /^Bearer ([^\s]+)$/.exec(header);
  if (!match || match[1].length > 8192) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  }
  // Auth server verifies token; NEVER trust decoded JWT or browser-supplied email/role.
  const authUser = await supabaseFetch('/auth/v1/user', { userToken: match[1] });
  if (!authUser?.id) throw Object.assign(new Error('Invalid session'), { statusCode: 401 });
  const member = await supabaseFetch(
    '/rest/v1/aceite_members?user_id=eq.' + encodeURIComponent(authUser.id) + '&select=user_id,role,active,full_name,phone&limit=1'
  );
  if (!Array.isArray(member) || !member[0]?.active || !['admin', 'vendedor'].includes(member[0].role)) {
    throw Object.assign(new Error('Staff access not approved'), { statusCode: 403 });
  }
  return { member: member[0], authUser };
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function handleError(error) {
  const statusCode = [400, 401, 403, 404, 405, 409, 422, 429, 503].includes(error.statusCode)
    ? error.statusCode : 500;
  return respond(statusCode, { error: statusCode >= 500 ? 'Serviço temporariamente indisponível' : error.message });
}

function onlyMethod(event, method) {
  if (event.httpMethod !== method) {
    throw Object.assign(new Error('Method not allowed'), { statusCode: 405 });
  }
}

module.exports = { respond, getSecretConfig, supabaseFetch, requireStaff, sha256, handleError, onlyMethod };
