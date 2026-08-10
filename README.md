# Simple File Upload

A zero-config file upload API for Vercel. No environment variables, no passwords.

## Deploy

```bash
cd upload-api
zip -r upload-api.zip api public vercel.json package.json
```

Then drag the zip onto [vercel.com/new](https://vercel.com/new) or run `vercel`.

## Usage

### Web UI
Open the deployed URL and drag files onto the upload area.

### API
```bash
curl -X POST --data-binary @file.zip "https://your-app.vercel.app/api/upload?filename=file.zip"
```

## Response

```json
{
  "url": "https://transfer.sh/abc123/file.zip",
  "filename": "file.zip",
  "size": 10240
}
```

## Notes
- Max file size: 4.5MB (Hobby), higher on Pro
- Files hosted on transfer.sh / 0x0.st with free anonymous upload
- No authentication required
