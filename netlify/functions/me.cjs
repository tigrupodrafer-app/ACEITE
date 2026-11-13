'use strict';
const { respond, requireStaff, onlyMethod, handleError } = require('./_lib/backend.cjs');

exports.handler = async (event) => {
  try {
    onlyMethod(event, 'GET');
    const { authUser, member } = await requireStaff(event);
    return respond(200, {
      id: authUser.id,
      email: authUser.email,
      name: member.full_name || authUser.email,
      full_name: member.full_name || authUser.email,
      role: member.role,
      phone: member.phone || '',
      active: member.active,
    });
  } catch (error) {
    return handleError(error);
  }
};
