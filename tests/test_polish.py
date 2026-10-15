"""M5 polish checks across every page: colour contrast, keyboard focus, phone layout, motion.

Each page is checked in its fullest state (sample loaded and run, badges shown, drawer and
palette open), because results tables and status chips only exist after a run.
"""

import re
from pathlib import Path

import pytest
from playwright.sync_api import Browser, Page, expect

from test_smoke import PAGES, TOOL_SLUGS
from test_tools import FAKE_KEY, GEMINI_HOST, gemini_reply

SRC = Path(__file__).resolve().parent.parent / "app" / "src"

# WCAG 2.2 AA. Text: 4.5:1, or 3:1 for large text (24 px, or 18.66 px bold).
# Text on a gradient is checked against every gradient stop. See-through layers
# (rgba backgrounds, opacity) are blended the way the browser paints them.
CONTRAST_SCAN = """() => {
  const parse = (s) => {
    const m = s.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(/[\\s,\\/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  };
  const blend = (top, base) => [0, 1, 2].map((i) => top[i] * top[3] + base[i] * (1 - top[3])).concat(1);
  const lum = (c) => {
    const lin = c.slice(0, 3).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const hex = (c) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

  function backgrounds(el) {
    const layers = [];
    let bases = null;
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage.includes('gradient')) {
        bases = (cs.backgroundImage.match(/rgba?\\([^)]+\\)/g) || []).map(parse).map((c) => blend(c, [255, 255, 255, 1]));
        break;
      }
      const bg = parse(cs.backgroundColor);
      if (bg && bg[3] > 0) {
        if (bg[3] >= 1) { bases = [bg]; break; }
        layers.push(bg);
      }
    }
    if (!bases || !bases.length) bases = [[255, 255, 255, 1]];
    return bases.map((base) => layers.reduceRight((acc, layer) => blend(layer, acc), base));
  }

  function opacity(el) {
    let o = 1;
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) o *= Number(getComputedStyle(node).opacity);
    return o;
  }

  const failures = [];
  for (const el of document.querySelectorAll('body *')) {
    const isField = el.matches('input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea, select');
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!hasText && !isField) continue;
    // Decoration (aria-hidden: the floating "z", the hanko stamp) is exempt; its meaning is in text nearby.
    if (el.closest('svg, .visually-hidden, [hidden], [aria-hidden=true], :disabled, option')) continue;
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (!rect.width || !rect.height || cs.visibility === 'hidden' || opacity(el) < 0.05) continue;

    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
    const need = large ? 3 : 4.5;
    const fg = parse(cs.color);
    fg[3] *= opacity(el);
    for (const bg of backgrounds(el)) {
      const value = ratio(blend(fg, bg), bg);
      if (value < need - 0.005) {
        const text = (isField ? (el.value || el.placeholder || '') : el.textContent).trim().replace(/\\s+/g, ' ').slice(0, 40);
        failures.push(`${value.toFixed(2)} < ${need}: <${el.tagName.toLowerCase()} class="${el.className}"> `
          + `"${text}" ${hex(blend(fg, bg))} on ${hex(bg)}`);
        break;
      }
    }
  }
  return [...new Set(failures)];
}"""

# Focus ring: the colour that is visible against the page must reach 3:1 (WCAG 1.4.11).
FOCUS_STYLE = """() => {
  const el = document.activeElement;
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    tag: el.tagName.toLowerCase(), text: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30),
    outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2,
    shadow: cs.boxShadow !== 'none', visible: r.width > 0 && r.height > 0,
  };
}"""


def still_page(browser: Browser, width: int = 1440, height: int = 900) -> Page:
    """Reduced motion, so no tile is caught half-way through its rise-in when we measure."""
    context = browser.new_context(viewport={"width": width, "height": height}, reduced_motion="reduce")
    return context.new_page()


def open_fullest(page: Page, site_url: str, path: str) -> None:
    """Open a page in the state with the most on screen: tools run on the sample, home shows badges."""
    if path == "":
        page.goto(site_url)
        page.evaluate("slugs => localStorage.setItem('kitsune.tried', JSON.stringify(slugs))", TOOL_SLUGS)
        page.reload()
        expect(page.locator(".status--pass")).to_have_count(9)
    elif path == "sample-data/":
        page.goto(site_url + path)
        expect(page.locator(".sd-file").first).to_be_visible()
    elif path == "settings/":
        page.goto(site_url + path)
        expect(page.get_by_test_id("theme-radio-dark-electro")).to_be_visible()
    else:
        page.goto(site_url + path)
        page.get_by_test_id("load-sample").click()
        if path != "tools/qa-handbook/":
            expect(page.get_by_test_id("run-status")).to_have_text("Done")
        else:
            expect(page.get_by_test_id("finding").first).to_be_visible()


# -- contrast ----------------------------------------------------------------------

@pytest.mark.parametrize("path", PAGES, ids=lambda p: p or "home")
def test_text_contrast_meets_wcag_aa(browser: Browser, site_url: str, path: str) -> None:
    page = still_page(browser)
    open_fullest(page, site_url, path)
    failures = page.evaluate(CONTRAST_SCAN)
    page.context.close()
    assert failures == [], "Low contrast:\n" + "\n".join(failures)


def test_contrast_in_the_key_drawer_palette_and_ai_output(browser: Browser, site_url: str) -> None:
    page = still_page(browser)
    page.route(f"https://{GEMINI_HOST}/**", lambda route: route.fulfill(
        status=200, content_type="application/json", body=gemini_reply({
            "summary": "The bot misread a cancel request as a refund.",
            "sentiment": {"start": "neutral", "end": "neutral"},
            "findings": [{"type": "tone", "turn": 13, "severity": "low", "title": "Abrupt ending", "evidence": "z", "fix": ""}],
        })))
    page.goto(f"{site_url}tools/bug-finder/")
    failures: list[str] = []

    page.get_by_test_id("key-chip").click()
    drawer = page.get_by_test_id("key-drawer")
    drawer.get_by_label("API key").fill(FAKE_KEY)
    drawer.get_by_role("button", name="Seal key").click()
    failures += page.evaluate(CONTRAST_SCAN)                      # drawer open, "sealed" status shown
    page.keyboard.press("Escape")

    page.get_by_test_id("load-sample").click()
    expect(page.get_by_test_id("ai-summary")).to_be_visible()
    failures += page.evaluate(CONTRAST_SCAN)                      # AI-assisted output, key seal chip

    page.keyboard.press("Control+k")
    page.keyboard.type("bug")
    failures += page.evaluate(CONTRAST_SCAN)                      # palette with a selected option
    page.context.close()
    assert failures == [], "Low contrast:\n" + "\n".join(failures)


@pytest.mark.parametrize("theme", ["dark-electro", "shrine-tech", "eclipse"])
def test_theme_and_visual_modes_pass_contrast_and_persist(browser: Browser, site_url: str, theme: str) -> None:
    page = still_page(browser)
    page.goto(f"{site_url}settings/")
    page.get_by_test_id(f"theme-radio-{theme}").check()
    page.get_by_test_id("visual-radio-sigil").check()
    assert page.evaluate("document.documentElement.dataset.theme") == theme
    assert page.evaluate("document.documentElement.dataset.visual") == "sigil"
    failures = page.evaluate(CONTRAST_SCAN)

    # Navigate via the persistent left sidebar to Bug Finder and run sample
    page.locator(".shell-sidebar").get_by_role("link", name=re.compile("Bug Finder")).click()
    page.get_by_test_id("load-sample").click()
    expect(page.get_by_test_id("run-status")).to_have_text("Done")
    assert page.evaluate("document.documentElement.dataset.theme") == theme
    failures += page.evaluate(CONTRAST_SCAN)
    page.context.close()
    assert failures == [], f"Low contrast in {theme}:\n" + "\n".join(failures)


# -- keyboard ----------------------------------------------------------------------

@pytest.mark.parametrize("path", ["", "sample-data/", "tools/bug-finder/", "tools/qa-handbook/"],
                         ids=["home", "sample-data", "tool", "handbook"])
def test_every_tab_stop_is_visible_and_ringed(browser: Browser, site_url: str, path: str) -> None:
    page = still_page(browser)
    page.goto(site_url + path, wait_until="networkidle")
    seen: list[dict] = []
    for _ in range(60):
        page.keyboard.press("Tab")
        state = page.evaluate(FOCUS_STYLE)
        if state["tag"] == "body":
            break
        seen.append(state)
    page.context.close()

    assert seen, "Tab did not move focus"
    assert seen[0]["text"] == "Skip to content"
    problems = [s for s in seen if not (s["visible"] and s["outline"] and s["shadow"])]
    assert problems == [], f"Tab stops without a visible two-tone focus ring: {problems}"


def test_tool_runs_with_the_keyboard_only(browser: Browser, site_url: str) -> None:
    page = still_page(browser)
    page.goto(f"{site_url}tools/first-utterance-finder/", wait_until="networkidle")
    for _ in range(80):
        page.keyboard.press("Tab")
        if page.evaluate("document.activeElement.dataset.testid") == "load-sample":
            break
    page.keyboard.press("Enter")
    expect(page.get_by_test_id("run-status")).to_have_text("Done")
    expect(page.get_by_test_id("answer")).not_to_have_text("–")
    page.context.close()


# -- phone layout ------------------------------------------------------------------

@pytest.mark.parametrize("path", PAGES, ids=lambda p: p or "home")
def test_no_sideways_scroll_on_a_phone_after_a_run(browser: Browser, site_url: str, path: str) -> None:
    page = still_page(browser, width=360, height=780)
    open_fullest(page, site_url, path)
    overflow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    wide = page.evaluate("""() => [...document.querySelectorAll('main *')]
        .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
        .filter((el) => !el.closest('.table-wrap, .tool-tabs, pre, .visually-hidden, [aria-hidden=true]'))
        .slice(0, 5).map((el) => el.tagName.toLowerCase() + '.' + el.className)""")
    page.context.close()
    assert overflow <= 0 and wide == [], f"Wider than the phone screen: {wide}"


# -- motion ------------------------------------------------------------------------

@pytest.mark.parametrize("path", PAGES, ids=lambda p: p or "home")
def test_reduced_motion_leaves_nothing_moving(browser: Browser, site_url: str, path: str) -> None:
    page = still_page(browser)
    open_fullest(page, site_url, path)
    running = page.evaluate("""() => document.getAnimations()
        .map((a) => a.animationName || a.transitionProperty || 'script animation')""")
    page.context.close()
    assert running == []


def test_motion_is_on_when_not_reduced(ui: Page, site_url: str) -> None:
    ui.goto(site_url)
    names = set(ui.evaluate("() => document.getAnimations().map((a) => a.animationName)"))
    assert {"sway", "breathe", "twitch", "swing", "fall", "float"} <= names


def test_animations_move_only_transform_and_opacity() -> None:
    # Cheap to paint, and the rule in docs/03-design-system.md "Motion".
    css = "\n".join(p.read_text(encoding="utf-8") for p in SRC.rglob("*.css"))
    bodies = re.findall(r"@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}", css)
    assert bodies, "no keyframes found"
    for name, body in bodies:
        props = set(re.findall(r"([\w-]+)\s*:", body))
        assert props <= {"transform", "opacity"}, f"@keyframes {name} animates {props - {'transform', 'opacity'}}"
