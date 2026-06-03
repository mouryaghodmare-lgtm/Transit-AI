from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
from urllib.parse import unquote, urlparse


APP_JS_PATH = Path(os.environ.get("TRANSIT_APP_JS", Path(__file__).resolve().parent / "app.js"))


class QuietHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        request_path = unquote(urlparse(path).path)
        if request_path == "/app.js" and APP_JS_PATH.exists():
            return str(APP_JS_PATH)
        return super().translate_path(path)

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    root = Path(os.environ.get("TRANSIT_APP_ROOT", Path(__file__).resolve().parent)).resolve()
    os.chdir(root)
    port = int(os.environ.get("TRANSIT_APP_PORT", "5173"))
    server = ThreadingHTTPServer(("127.0.0.1", port), QuietHandler)
    server.serve_forever()
