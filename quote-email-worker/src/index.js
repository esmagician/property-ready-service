const RECIPIENT_EMAIL = 'edvardaspt@gmail.com';
const SENDER_EMAIL = 'quotes@property-ready.com';
const SENDER_NAME = 'Property Ready Service';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST,OPTIONS',
      'access-control-allow-headers': 'content-type'
    }
  });
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildEmailBody(payload) {
  return [
    'Quote request - Property Ready Service',
    '',
    `Name: ${payload.name || 'Not provided'}`,
    `Preferred contact: ${payload.contact || 'Not provided'}`,
    `Property location: ${payload.location || 'Not provided'}`,
    `Bedrooms: ${payload.bedrooms || 'Not provided'}`,
    `Bathrooms: ${payload.bathrooms || 'Not provided'}`,
    `Preferred date: ${payload.preferredDate || 'Not provided'}`,
    `Key access: ${payload.keyAccess || 'Not provided'}`,
    '',
    payload.selection || 'No calculator selection provided',
    '',
    'Extra notes:',
    payload.notes || 'None provided'
  ].join('\n');
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'POST,OPTIONS',
          'access-control-allow-headers': 'content-type'
        }
      });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ ok: false, error: 'Method not allowed.' }, 405);
    }

    let payload = {};
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ ok: false, error: 'Invalid JSON body.' }, 400);
    }

    const name = normalizeText(payload.name);
    const contact = normalizeText(payload.contact);
    const location = normalizeText(payload.location);
    if (!name || !contact || !location) {
      return jsonResponse({ ok: false, error: 'Name, contact, and property location are required.' }, 400);
    }

    if (!env.EMAIL) {
      return jsonResponse({ ok: false, error: 'Email binding is missing.' }, 500);
    }

    const body = buildEmailBody({
      name,
      contact,
      location,
      bedrooms: normalizeText(payload.bedrooms),
      bathrooms: normalizeText(payload.bathrooms),
      preferredDate: normalizeText(payload.preferredDate),
      keyAccess: normalizeText(payload.keyAccess),
      selection: normalizeText(payload.selection),
      notes: normalizeText(payload.notes)
    });

    try {
      await env.EMAIL.send({
        to: RECIPIENT_EMAIL,
        from: { email: SENDER_EMAIL, name: SENDER_NAME },
        subject: `Quote request from ${name}`,
        text: body,
        html: body.replace(/\n/g, '<br>')
      });

      return jsonResponse({ ok: true });
    } catch (error) {
      return jsonResponse({
        ok: false,
        error: error && error.message ? error.message : 'Failed to send the email.'
      }, 500);
    }
  }
};
