# Capture real Kitsune Labs UI states from the public live site (Mousy sample data only).
# No API key is entered. The script opens its own headless browser and closes it.
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "https://sandeeepkiran.github.io/kitsune-labs/"
OUT = Path(__file__).parent / "shots"
OUT.mkdir(exist_ok=True)

TOOLS = ["bug-finder", "test-case-generator", "transcript-converter", "metrics-extractor"]


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1600, "height": 1000}, device_scale_factor=1.5,
                                reduced_motion="no-preference")
        page.goto(BASE, wait_until="networkidle")
        page.wait_for_timeout(1500)
        page.screenshot(path=str(OUT / "home.png"))
        page.screenshot(path=str(OUT / "home_full.png"), full_page=True)
        for slug in TOOLS:
            page.goto(f"{BASE}tools/{slug}/", wait_until="networkidle")
            page.wait_for_timeout(800)
            page.screenshot(path=str(OUT / f"{slug}_empty.png"))
            page.get_by_test_id("load-sample").first.click()
            page.wait_for_timeout(1200)
            page.screenshot(path=str(OUT / f"{slug}_loaded.png"))
            page.get_by_test_id("run").first.click()
            page.wait_for_timeout(2500)
            page.screenshot(path=str(OUT / f"{slug}_result.png"))
            page.screenshot(path=str(OUT / f"{slug}_result_full.png"), full_page=True)
        page.goto(f"{BASE}sample-data/", wait_until="networkidle")
        page.wait_for_timeout(800)
        page.screenshot(path=str(OUT / "sample-data.png"))
        page.goto(f"{BASE}settings/", wait_until="networkidle")
        page.wait_for_timeout(800)
        page.screenshot(path=str(OUT / "settings.png"))
        browser.close()


if __name__ == "__main__":
    sys.exit(main())
