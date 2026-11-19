'use strict';
// Validacao isolada das tres confirmacoes do cliente.
// Nao assina, nao cria token, nao grava dados e nao autoriza producao.
const legal = require('../../../src/lib/legalTermRevised.json');

const CONSENT_KEYS = Object.freeze([
  'conferenciaPedido',
  'condicoesFornecimentoGarantia',
  'concordanciaAutorizacao',
]);

function consentDefinition() {
  if (!Array.isArray(legal.consent) || legal.consent.length !== CONSENT_KEYS.length ||
      legal.consent.some(s => typeof s !== 'string' || !s.trim())) {
    throw new Error('Termo juridico sem as tres declaracoes obrigatorias');
  }
  return CONSENT_KEYS.map((key, i) => ({key, text:legal.consent[i], required:true}));
}

function validateConsents(value) {
  const definitions = consentDefinition();
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {valid:false,missing:CONSENT_KEYS.slice()};
  }
  const missing = definitions.filter(({key}) => value[key] !== true).map(({key}) => key);
  return {valid:missing.length === 0,missing};
}

module.exports = { CONSENT_KEYS, consentDefinition, validateConsents };
