# Render the composition to video. Frames go straight into ffmpeg through a pipe (no frame dump).
# Usage:
#   python render.py stills 1.0 2.5 ...   -> PNG stills in work/stills/ (for checks; ignored by git)
#   python render.py video                 -> work/video_noaudio.mp4
import subprocess
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
PAGE = (HERE / "composition" / "index.html").resolve().as_uri()
FPS = 30
DURATION = 21.0


def open_page(p):
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
    page.goto(PAGE)
    page.evaluate("window.ready")
    return browser, page


def stills(times):
    out = HERE / "stills"
    out.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser, page = open_page(p)
        for t in times:
            page.evaluate(f"window.render({t})")
            page.screenshot(path=str(out / f"still_{t:05.2f}.png"))
        browser.close()


def video():
    target = HERE / "video_noaudio.mp4"
    ffmpeg = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "png", "-i", "-",
         "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", str(target)],
        stdin=subprocess.PIPE)
    with sync_playwright() as p:
        browser, page = open_page(p)
        total = int(DURATION * FPS)
        for i in range(total):
            page.evaluate(f"window.render({i / FPS})")
            ffmpeg.stdin.write(page.screenshot(type="png"))
            if i % 60 == 0:
                print(f"frame {i}/{total}", flush=True)
        browser.close()
    ffmpeg.stdin.close()
    ffmpeg.wait()


if __name__ == "__main__":
    if sys.argv[1] == "stills":
        stills([float(x) for x in sys.argv[2:]])
    else:
        video()
