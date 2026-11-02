#!/usr/bin/env python3
"""
WayaTronic - Lightweight Local HTTP Server Runner
Pure Python standard library (no pip packages needed).
"""
import http.server
import socketserver
import os
import webbrowser

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and disable aggressive caching for local testing
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def main():
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print("=" * 60)
        print("  WayaTronic - Precision Electronic Test Equipment E-Commerce")
        print("=" * 60)
        print(f"  Server running at: http://localhost:{PORT}")
        print(f"  Customer Website:  http://localhost:{PORT}/index.html")
        print(f"  Admin Portal:      http://localhost:{PORT}/admin.html")
        print("=" * 60)
        print("  Press Ctrl+C to stop the server.")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down WayaTronic server...")

if __name__ == '__main__':
    main()
