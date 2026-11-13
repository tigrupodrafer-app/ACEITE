'use strict';
const { respond, supabaseFetch, requireStaff, onlyMethod, handleError } = require('./_lib/backend.cjs');

exports.handler = async (event) => {
  try {
    onlyMethod(event, 'GET');
    await requireStaff(event);
    const limit = Math.max(1, Math.min(100, Number.parseInt(event.queryStringParameters?.limit || '50', 10) || 50));
    // No client-controlled SQL, role, company or table name is accepted.
    const rows = await supabaseFetch(
      '/rest/v1/aceite_orders?select=id,order_number,origin,sic_company_id,sic_order_number,client_name,client_phone,sale_date,status,warranty_blocked,created_at&order=created_at.desc&limit=' + limit
    );
    return respond(200, { orders: rows || [] });
  } catch (error) {
    return handleError(error);
  }
};
