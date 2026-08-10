export const config = {
  api: {
    bodyParser: false,
    maxDuration: 30,
  },
};

function getFilename(req) {
  try {
    const url = new URL(req.url, 'http://x');
    return url.searchParams.get('filename') || 'file';
  } catch {
    return 'file';
  }
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function buildMultipart(boundary, fields, filename, buffer) {
  const parts = [];
  for (const [key, value] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\n`));
    parts.push(
      Buffer.from(`Content-Disposition: form-data; name="${key}"\r\n\r\n`)
    );
    parts.push(Buffer.from(value + '\r\n'));
  }
  parts.push(Buffer.from(`--${boundary}\r\n`));
  parts.push(
    Buffer.from(
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`
    )
  );
  parts.push(Buffer.from('Content-Type: application/octet-stream\r\n\r\n'));
  parts.push(buffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  return Buffer.concat(parts);
}

async function uploadToCatbox(buffer, filename) {
  const boundary = '----FormBoundary' + Date.now().toString(36);
  const body = buildMultipart(
    boundary,
    { reqtype: 'fileupload', userhash: '' },
    filename,
    buffer
  );
  const res = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: body,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
  });
  if (!res.ok) throw new Error(`catbox.moe: ${res.status}`);
  const url = (await res.text()).trim();
  if (!url.startsWith('http')) throw new Error(url);
  return url;
}

async function uploadToTransferSh(buffer, filename) {
  const res = await fetch(
    `https://transfer.sh/${encodeURIComponent(filename)}`,
    {
      method: 'POST',
      body: buffer,
    }
  );
  if (!res.ok) throw new Error(`transfer.sh: ${res.status}`);
  return (await res.text()).trim();
}

async function uploadToOxOst(buffer, filename) {
  const boundary = '----FormBoundary' + Date.now().toString(36);
  const body = buildMultipart(boundary, {}, filename, buffer);
  const res = await fetch('https://0x0.st', {
    method: 'POST',
    body: body,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
  });
  if (!res.ok) throw new Error(`0x0.st: ${res.status}`);
  return (await res.text()).trim();
}

const uploaders = [
  uploadToCatbox,
  uploadToTransferSh,
  uploadToOxOst,
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const filename = getFilename(req);
  const fileBuffer = await readBody(req);

  if (fileBuffer.length === 0) {
    return res
      .status(400)
      .json({ error: 'No file data. POST raw body with ?filename=xxx' });
  }

  for (const upload of uploaders) {
    try {
      const url = await upload(fileBuffer, filename);
      if (url && url.startsWith('http')) {
        return res.status(200).json({
          url,
          filename,
          size: fileBuffer.length,
        });
      }
    } catch (e) {
    }
  }

  return res.status(500).json({ error: 'All upload services failed' });
}