"""Local stand-in for Amazon SES v2 SendEmail - captures e-mails instead of delivering them.

LocalStack's community edition only implements SES v1, while shop and the confirmation Lambda use
the SES v2 API (POST /v2/email/outbound-emails). This server accepts exactly that call, keeps the
messages in memory and shows them:

    http://localhost:8025/          - HTML list, newest first
    http://localhost:8025/emails    - JSON (GET), clear with DELETE

Nothing is ever sent anywhere. Request signatures are ignored.
"""
import html
import json
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

EMAILS = []


def _simplify(request):
    destination = request.get("Destination", {})
    simple = request.get("Content", {}).get("Simple", {})
    body = simple.get("Body", {})
    return {
        "id": str(uuid.uuid4()),
        "receivedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "from": request.get("FromEmailAddress"),
        "replyTo": request.get("ReplyToAddresses", []),
        "to": destination.get("ToAddresses", []),
        "subject": simple.get("Subject", {}).get("Data"),
        "text": body.get("Text", {}).get("Data"),
        "html": body.get("Html", {}).get("Data"),
    }


def _page():
    items = []
    for email in reversed(EMAILS):
        items.append(
            "<article>"
            f"<h2>{html.escape(email['subject'] or '(no subject)')}</h2>"
            f"<p class=meta>{html.escape(email['receivedAt'])} &middot; "
            f"from {html.escape(email['from'] or '')} &middot; "
            f"to {html.escape(', '.join(email['to']))}</p>"
            f"<pre>{html.escape(email['text'] or email['html'] or '')}</pre>"
            "</article>"
        )
    body = "".join(items) or "<p>No e-mails captured yet.</p>"
    return (
        "<!doctype html><meta charset=utf-8><title>Local mail sink</title>"
        "<meta http-equiv=refresh content=5>"
        "<style>body{font-family:sans-serif;max-width:860px;margin:24px auto;padding:0 16px}"
        "article{border:1px solid #ddd;border-radius:8px;padding:12px 16px;margin:12px 0}"
        "h2{font-size:17px;margin:0 0 4px}.meta{color:#666;font-size:13px;margin:0 0 8px}"
        "pre{white-space:pre-wrap;font-family:inherit;margin:0}</style>"
        f"<h1>Captured e-mails ({len(EMAILS)})</h1>{body}"
    )


class Handler(BaseHTTPRequestHandler):
    def _send(self, status, payload, content_type="application/json"):
        data = payload.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        if self.path.rstrip("/") != "/v2/email/outbound-emails":
            self._send(404, json.dumps({"message": "only SES v2 SendEmail is emulated"}))
            return
        length = int(self.headers.get("Content-Length", 0))
        email = _simplify(json.loads(self.rfile.read(length) or b"{}"))
        EMAILS.append(email)
        print(f"captured: {email['subject']!r} -> {email['to']}", flush=True)
        self._send(200, json.dumps({"MessageId": email["id"]}))

    def do_GET(self):
        if self.path.startswith("/emails"):
            self._send(200, json.dumps(EMAILS, ensure_ascii=False, indent=2))
        else:
            self._send(200, _page(), "text/html")

    def do_DELETE(self):
        EMAILS.clear()
        self._send(200, json.dumps({"cleared": True}))

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print("mail sink listening on :8025", flush=True)
    ThreadingHTTPServer(("0.0.0.0", 8025), Handler).serve_forever()
