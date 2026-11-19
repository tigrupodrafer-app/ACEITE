'use strict';
const { respond, onlyMethod, handleError } = require('./_lib/backend.cjs');

exports.handler = async (event) => {
  try {
    onlyMethod(event, 'GET');
    // Does not disclose any secret or database metadata.
    return respond(200, {
      status: 'ok',
      system: 'DRAFER ACEITE',
      backend: 'netlify-functions',
      databaseConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      sicIntegration: 'not_connected',
    });
  } catch (error) {
    return handleError(error);
  }
};
