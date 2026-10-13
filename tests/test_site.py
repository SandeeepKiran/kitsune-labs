"""Behaviour of the shell, home, sample data page, key drawer and tool-page template (M2).

The tool-specific behaviour (M3, M4) is in test_tools.py.
"""

import json
import re
from pathlib import Path
from urllib.parse import urlparse

import pytest
from playwright.sync_api import Browser, Page, expect

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = json.loads((ROOT / "app" / "public" / "sample-data" / "manifest.json").read_text(encoding="utf-8"))
FAKE_KEY = "test-key-" + "x" * 32   # shape-valid, never a real key


def storage(page: Page) -> dict:
    return page.evaluate("""() => ({
        session: Object.fromEntries(Object.entries(sessionStorage)),
        local: Object.fromEntries(Object.entries(localStorage)),
    })""")


# -- home --------------------------------------------------------------------------

def test_home_shows_nine_tools_and_tried_counter(ui: Page, site_url: str) -> None:
    ui.goto(site_url)
    expect(ui.locator(".tool-tile")).to_have_count(9)
    expect(ui.get_by_test_id("tools-tried")).to_contain_text("0 / 9")
    expect(ui.get_by_role("link", name="Download Mousy samples")).to_have_attribute("href", "/kitsune-labs/sample-data/")


def test_running_a_tool_counts_as_tried(ui: Page, site_url: str) -> None:
    ui.goto(f"{site_url}tools/bug-finder/")
    ui.get_by_test_id("load-sample").click()
    expect(ui.get_by_test_id("answer")).to_have_text("2")
    ui.goto(site_url)
    expect(ui.get_by_test_id("tools-tried")).to_contain_text("1 / 9")
    expect(ui.locator(".tool-tile", has_text="Bug Finder")).to_contain_text("Tried")


# -- tool page template ------------------------------------------------------------

def test_load_mousy_sample_parses_and_logs_real_numbers(ui: Page, site_url: str) -> None:
    ui.goto(f"{site_url}tools/bug-finder/")
    ui.get_by_test_id("load-sample").click()

    expect(ui.get_by_test_id("answer")).to_have_text("2")
    expect(ui.get_by_test_id("source")).to_have_text("transcripts/01_cancel_order_chat.txt")
    expect(ui.get_by_test_id("run-log")).to_contain_text(re.compile(r"Parsed 15 turns · 2 findings · 0 AI calls · \d+ ms"))
    expect(ui.locator(".turn")).to_have_count(15)


def test_pasted_text_runs_with_ctrl_enter(ui: Page, site_url: str) -> None:
    ui.goto(f"{site_url}tools/transcript-converter/")
    box = ui.get_by_label("Conversation")
    box.fill("Mousy Assist: Hi there\nCustomer: <b>cancel</b> MO-4417")
    box.press("Control+Enter")

    expect(ui.get_by_test_id("answer")).to_have_text("1")
    # Visitor text is shown as text, never as markup.
    preview = ui.get_by_test_id("script-preview")
    expect(preview).to_contain_text("<b>cancel</b>")
    assert preview.locator("b").count() == 0


def test_csv_sample_link_opens_the_whole_sheet(ui: Page, site_url: str) -> None:
    ui.goto(f"{site_url}tools/metrics-extractor/?sample=mousy_conversations.csv")
    expect(ui.get_by_test_id("loaded-file")).to_contain_text("40 rows")
    expect(ui.get_by_test_id("run-log")).to_contain_text("Measured 40 conversations")
    expect(ui.get_by_test_id("answer")).not_to_have_text("–")


def test_bad_sample_link_is_refused(ui: Page, site_url: str) -> None:
    ui.goto(f"{site_url}tools/bug-finder/?sample=../../secret.txt")
    expect(ui.get_by_test_id("run-log")).to_contain_text("That sample link is not valid")


def test_export_downloads_json(ui: Page, site_url: str) -> None:
    ui.goto(f"{site_url}tools/bug-finder/")
    ui.get_by_test_id("load-sample").click()
    with ui.expect_download() as download_info:
        ui.get_by_role("button", name="Download .json").click()
    download = download_info.value
    assert download.suggested_filename == "01_cancel_order_chat_findings.json"
    data = json.loads(Path(download.path()).read_text(encoding="utf-8"))
    assert data["generated_by"] == "Kitsune Labs Bug Finder"
    assert len(data["conversations"][0]["bugs"]) == 2


# -- sample data page --------------------------------------------------------------

def test_sample_data_page_lists_every_file(ui: Page, site_url: str) -> None:
    ui.goto(f"{site_url}sample-data/")
    expect(ui.get_by_text("All data is invented. Mousy is not a real company.").first).to_be_visible()
    expect(ui.locator(".sd-file")).to_have_count(len(MANIFEST["files"]) - 1)
    expect(ui.get_by_test_id("download-all")).to_have_attribute("href", "/kitsune-labs/sample-data/mousy_sample_pack.zip")


def test_every_download_link_works(ui: Page, site_url: str) -> None:
    ui.goto(f"{site_url}sample-data/")
    expect(ui.locator(".sd-file").first).to_be_visible()
    hrefs = ui.locator("a[download]").evaluate_all("links => links.map(a => a.href)")
    assert len(hrefs) == len(MANIFEST["files"])
    for href in hrefs:
        assert ui.request.get(href).ok, href


def test_open_in_tool_link_loads_that_file(ui: Page, site_url: str) -> None:
    ui.goto(f"{site_url}sample-data/")
    card = ui.locator(".sd-file", has_text="transcripts/05_track_parcel_voice.txt")
    card.get_by_role("link", name="Open in Bug Finder").click()
    expect(ui.get_by_test_id("source")).to_have_text("transcripts/05_track_parcel_voice.txt")
    expect(ui.get_by_test_id("answer")).to_have_text("1")


# -- command palette ---------------------------------------------------------------

def test_ctrl_k_palette_jumps_to_a_tool(ui: Page, site_url: str) -> None:
    ui.goto(site_url)
    ui.keyboard.press("Control+k")
    palette = ui.get_by_test_id("palette")
    expect(palette).to_be_visible()
    ui.keyboard.type("metrics")
    expect(palette.get_by_role("option").first).to_contain_text("Metrics Extractor")
    ui.keyboard.press("Enter")
    expect(ui).to_have_url(f"{site_url}tools/metrics-extractor/")


def test_palette_closes_with_escape_and_arrows_move(ui: Page, site_url: str) -> None:
    ui.goto(site_url)
    ui.get_by_role("button", name=re.compile("find a tool or action")).click()
    palette = ui.get_by_test_id("palette")
    ui.keyboard.press("ArrowDown")
    expect(palette.get_by_role("option").nth(1)).to_have_attribute("aria-selected", "true")
    ui.keyboard.press("Escape")
    expect(palette).to_be_hidden()


# -- AI key drawer -----------------------------------------------------------------

def open_drawer(page: Page):
    page.get_by_test_id("key-chip").click()
    drawer = page.get_by_test_id("key-drawer")
    expect(drawer).to_be_visible()
    return drawer


def test_key_is_kept_in_session_storage_by_default(ui: Page, site_url: str) -> None:
    ui.goto(site_url)
    drawer = open_drawer(ui)
    drawer.get_by_label("API key").fill(FAKE_KEY)
    drawer.get_by_role("button", name="Seal key").click()

    expect(drawer.get_by_role("status")).to_contain_text("Key sealed in this tab")
    stored = storage(ui)
    assert stored["session"]["kitsune.ai.key.gemini"] == FAKE_KEY
    assert not any(FAKE_KEY in v for v in stored["local"].values())
    expect(ui.get_by_test_id("key-chip")).to_have_text("Key sealed in this browser")
    expect(drawer.get_by_label("API key")).to_have_value("")


def test_remember_moves_the_key_to_local_storage(ui: Page, site_url: str) -> None:
    ui.goto(site_url)
    drawer = open_drawer(ui)
    drawer.get_by_text("Claude").click()
    drawer.get_by_label("API key").fill(FAKE_KEY)
    drawer.get_by_label("Remember on this device").check()
    drawer.get_by_role("button", name="Seal key").click()

    stored = storage(ui)
    assert stored["local"]["kitsune.ai.key.anthropic"] == FAKE_KEY
    assert not any(FAKE_KEY in v for v in stored["session"].values())
    expect(drawer.get_by_test_id("sends-to")).to_contain_text("only to Anthropic")


def test_remembered_key_survives_a_new_tab(browser: Browser, site_url: str) -> None:
    context = browser.new_context()
    first = context.new_page()
    first.goto(site_url)
    drawer = open_drawer(first)
    drawer.get_by_label("API key").fill(FAKE_KEY)
    drawer.get_by_label("Remember on this device").check()
    drawer.get_by_role("button", name="Seal key").click()

    second = context.new_page()
    second.goto(site_url)
    expect(second.get_by_test_id("key-chip")).to_have_text("Key sealed in this browser")
    context.close()


def test_forget_key_removes_every_key(ui: Page, site_url: str) -> None:
    ui.goto(site_url)
    drawer = open_drawer(ui)
    drawer.get_by_label("API key").fill(FAKE_KEY)
    drawer.get_by_label("Remember on this device").check()
    drawer.get_by_role("button", name="Seal key").click()
    drawer.get_by_role("button", name="Forget key").click()

    stored = storage(ui)
    assert not any("kitsune.ai" in k for k in [*stored["session"], *stored["local"]])
    expect(ui.get_by_test_id("key-chip")).to_have_text("Add AI key")


def test_bad_key_is_rejected_with_a_message(ui: Page, site_url: str) -> None:
    ui.goto(site_url)
    drawer = open_drawer(ui)
    drawer.get_by_label("API key").fill("has a space")
    drawer.get_by_role("button", name="Seal key").click()
    expect(drawer.get_by_role("status")).to_contain_text("no spaces")
    assert not storage(ui)["session"].get("kitsune.ai.key.gemini")


def test_key_stays_home_when_use_ai_is_off(ui: Page, site_url: str) -> None:
    site_host = urlparse(site_url).netloc
    seen: list[str] = []
    ui.on("request", lambda req: seen.append(f"{req.url} {req.post_data or ''}"))
    ui.on("console", lambda msg: seen.append(msg.text))
    ui.goto(f"{site_url}tools/bug-finder/")
    drawer = open_drawer(ui)
    drawer.get_by_label("API key").fill(FAKE_KEY)
    drawer.get_by_role("button", name="Seal key").click()
    ui.keyboard.press("Escape")
    ui.get_by_test_id("use-ai").uncheck()
    ui.get_by_test_id("load-sample").click()
    expect(ui.get_by_test_id("answer")).to_have_text("2")
    expect(ui.get_by_test_id("run-log")).to_contain_text("0 AI calls")

    assert not any(FAKE_KEY in line for line in seen)
    assert all(urlparse(line.split(" ")[0]).netloc == site_host for line in seen if line.startswith("http"))


def test_drawer_closes_with_escape(ui: Page, site_url: str) -> None:
    ui.goto(site_url)
    drawer = open_drawer(ui)
    ui.keyboard.press("Escape")
    expect(drawer).to_be_hidden()


# -- layout and motion -------------------------------------------------------------

@pytest.mark.parametrize("path", ["", "sample-data/", "tools/bug-finder/"], ids=["home", "sample-data", "tool"])
def test_no_horizontal_scroll_at_phone_width(browser: Browser, site_url: str, path: str) -> None:
    context = browser.new_context(viewport={"width": 360, "height": 780})
    page = context.new_page()
    page.goto(site_url + path, wait_until="networkidle")
    overflow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    context.close()
    assert overflow <= 0


def test_reduced_motion_stops_the_fox(browser: Browser, site_url: str) -> None:
    context = browser.new_context(reduced_motion="reduce")
    page = context.new_page()
    page.goto(site_url)
    names = page.evaluate("""() => [...document.querySelectorAll('.fox__tail, .petal, .zz, .rise')]
        .map(el => getComputedStyle(el).animationName)""")
    context.close()
    assert names and set(names) == {"none"}


def test_status_words_go_with_icons(ui: Page, site_url: str) -> None:
    ui.goto(f"{site_url}tools/bug-finder/")
    ui.get_by_test_id("load-sample").click()
    expect(ui.get_by_test_id("run-log")).to_contain_text("Parsed 15 turns")
    ui.goto(site_url)
    expect(ui.locator(".status--pass").first).to_have_text("✓Tried")
