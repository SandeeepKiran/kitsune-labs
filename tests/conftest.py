"""Shared fixtures: build the site once, serve it, and give each test a fresh browser page.

We test the production build (not the dev server) so the GitHub Pages base path
(/kitsune-labs/) is exercised exactly as visitors will get it.
"""

import socket
import subprocess
import time
from pathlib import Path

import pytest
from playwright.sync_api import Browser, Page, sync_playwright

APP_DIR = Path(__file__).resolve().parent.parent / "app"
VITE_CLI = APP_DIR / "node_modules" / "vite" / "bin" / "vite.js"
HOST = "127.0.0.1"
PORT = 4173
BASE_PATH = "/kitsune-labs/"


def _wait_for_port(host: str, port: int, timeout_s: float) -> None:
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        try:
            with socket.create_connection((host, port), timeout=0.5):
                return
        except OSError:
            time.sleep(0.2)
    raise RuntimeError(f"Preview server did not start on {host}:{port} within {timeout_s}s")


@pytest.fixture(scope="session")
def site_url() -> str:
    if not VITE_CLI.exists():
        pytest.fail("app/node_modules is missing. Run `npm install` in app/ first.")

    # shell=True because npm is a .cmd script on Windows.
    subprocess.run("npm run build", cwd=APP_DIR, shell=True, check=True)

    # Call vite through node directly (not `npm run preview`), so terminate()
    # stops the real server process instead of only an npm wrapper.
    server = subprocess.Popen(
        ["node", str(VITE_CLI), "preview", "--host", HOST, "--port", str(PORT), "--strictPort"],
        cwd=APP_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        _wait_for_port(HOST, PORT, timeout_s=20)
        yield f"http://{HOST}:{PORT}{BASE_PATH}"
    finally:
        server.terminate()
        server.wait(timeout=10)


@pytest.fixture(scope="session")
def browser() -> Browser:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        yield browser
        browser.close()


@pytest.fixture(params=["no-preference", "reduce"], ids=["motion", "reduced-motion"])
def page(browser: Browser, request: pytest.FixtureRequest) -> Page:
    # Every page is checked twice: normal motion and prefers-reduced-motion.
    context = browser.new_context(reduced_motion=request.param)
    page = context.new_page()
    yield page
    context.close()
