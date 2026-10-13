"""Smoke tests: every page loads cleanly from the production build, with and without motion."""

from urllib.parse import urlparse

import pytest
from playwright.sync_api import Page, expect

TOOL_SLUGS = [
    "bug-finder", "test-case-generator", "utterance-generator", "transcript-converter",
    "first-utterance-finder", "metrics-extractor", "report-builder", "email-templates", "qa-handbook",
]
PAGES = ["", "sample-data/", *[f"tools/{slug}/" for slug in TOOL_SLUGS]]


def collect_errors(page: Page) -> list[str]:
    errors: list[str] = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    page.on("pageerror", lambda err: errors.append(str(err)))
    return errors


@pytest.mark.parametrize("path", PAGES, ids=lambda p: p or "home")
def test_page_loads_without_console_errors(page: Page, site_url: str, path: str) -> None:
    errors = collect_errors(page)

    response = page.goto(site_url + path, wait_until="networkidle")

    assert response is not None and response.ok, f"{path} returned {response and response.status}"
    expect(page.get_by_role("heading", level=1)).to_be_visible()
    expect(page.locator("header .brand")).to_be_visible()
    assert errors == [], f"Console errors on {path or 'home'}: {errors}"


def test_home_page_makes_no_third_party_requests(page: Page, site_url: str) -> None:
    # Privacy promise: fonts and assets are self-hosted, nothing calls out on load.
    site_host = urlparse(site_url).netloc
    request_hosts: set[str] = set()
    page.on("request", lambda req: request_hosts.add(urlparse(req.url).netloc))

    page.goto(site_url, wait_until="networkidle")

    assert request_hosts == {site_host}, f"Unexpected hosts: {request_hosts - {site_host}}"


def test_self_hosted_fonts_are_applied(page: Page, site_url: str) -> None:
    page.goto(site_url, wait_until="networkidle")
    page.evaluate("document.fonts.ready.then(() => true)")

    heading_font = page.get_by_role("heading", level=1).evaluate("el => getComputedStyle(el).fontFamily")
    assert "Fraunces" in heading_font
    assert page.evaluate("document.fonts.check('700 16px Fraunces')")
    assert page.evaluate("document.fonts.check('400 16px Lexend')")
