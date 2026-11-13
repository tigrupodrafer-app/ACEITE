import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    // Desabilitada temporariamente devido a problemas de performance
    return Response.json({ success: true });
});