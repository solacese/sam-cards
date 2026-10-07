#!/usr/bin/env python3
"""Loopback development server: proxy the public API without changing production CORS."""
import json
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT=Path(__file__).resolve().parents[1]
config=json.loads(re.search(r'=\s*(\{.*\});', (ROOT/'config.js').read_text()).group(1))

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=str(ROOT),**kwargs)
    def do_GET(self):
        if self.path.split('?')[0]=='/config.js':
            self.send_response(200);self.send_header('Content-Type','application/javascript');self.end_headers()
            self.wfile.write(b'window.SAM_CARDS_CONFIG = {"apiUrl":"/api/research"};');return
        super().do_GET()
    def do_POST(self):
        if self.path!='/api/research':
            self.send_error(404);return
        length=int(self.headers.get('Content-Length','0'))
        if not 0<length<=2000:
            self.send_error(400);return
        body=self.rfile.read(length)
        try:
            response=urlopen(Request(config['apiUrl'],data=body,headers={'Origin':'https://solacese.github.io','Content-Type':'application/json'}),timeout=24)
        except HTTPError as error:
            response=error
        except URLError:
            self.send_response(502);self.send_header('Content-Type','application/json');self.end_headers()
            self.wfile.write(b'{"error":"Research API unavailable."}');return
        with response:
            self.send_response(response.code);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.end_headers()
            self.wfile.write(response.read(200000))

if __name__=='__main__':
    print('Development site: http://127.0.0.1:8920',flush=True)
    ThreadingHTTPServer(('127.0.0.1',8920),Handler).serve_forever()
