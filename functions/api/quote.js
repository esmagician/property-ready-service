const RECIPIENT_EMAIL = 'edvardaspt@gmail.com';
const SENDER_EMAIL = 'quotes@property-ready.com';
const SENDER_NAME = 'Property Ready Service';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8'
    }
  });
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildEmailBody(payload, request) {
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
    payload.notes || 'None provided',
    '',
    `Page URL: ${request.url}`
  ].join('\n');
}

export async function onRequestPost(context) {
  const { request, env } = context;
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
    return jsonResponse({ ok: false, error: 'Email sending is not configured yet in this Pages project.' }, 500);
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
  }, request);

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
