"""Serve this application on loopback only, including user-imported local assets."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=8765)
args = parser.parse_args()
root = Path(__file__).parent.resolve()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(root), **kw)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def list_directory(self, path):
        self.send_error(403)


server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
print(f'Local PZ browser research: http://127.0.0.1:{args.port}', flush=True)
server.serve_forever()
