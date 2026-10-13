"""Smoke test: the home page loads cleanly from the production build."""

from urllib.parse import urlparse

from playwright.sync_api import Page, expect


def test_home_page_loads_without_console_errors(page: Page, site_url: str) -> None:
    console_errors: list[str] = []
    page_errors: list[str] = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
    page.on("pageerror", lambda err: page_errors.append(str(err)))

    response = page.goto(site_url, wait_until="networkidle")

    assert response is not None and response.ok, f"Home page returned {response and response.status}"
    expect(page).to_have_title("Kitsune Labs")
    expect(page.get_by_role("heading", level=1)).to_have_text("Kitsune Labs")
    assert console_errors == [], f"Console errors: {console_errors}"
    assert page_errors == [], f"Uncaught page errors: {page_errors}"


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
