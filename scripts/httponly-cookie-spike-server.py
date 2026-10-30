# Spike server for in-app ESPN connect (W1-A): serves one page that sets an HttpOnly and a
# normal cookie holding a sentinel value (never a real cookie), on 127.0.0.1:8770, to
# prove the native web view can read HttpOnly cookies. Kept as the evidence that unblocked it.
from http.server import BaseHTTPRequestHandler, HTTPServer
class H(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Set-Cookie", "srv_http_only=SPIKE_SENTINEL_VALUE_0123456789; Path=/; HttpOnly")
        self.send_header("Set-Cookie", "srv_normal=SPIKE_SENTINEL_VALUE_0123456789; Path=/")
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(b"<html><body>spike</body></html>")
    def log_message(self, *a): pass
HTTPServer(("127.0.0.1", 8770), H).serve_forever()
