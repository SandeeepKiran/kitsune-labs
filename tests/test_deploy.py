"""The GitHub Pages workflow keeps its promises (M5): privacy check before publish, only the build is published."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORKFLOW = (ROOT / ".github" / "workflows" / "deploy-pages.yml").read_text(encoding="utf-8")


def step_index(name_fragment: str) -> int:
    index = WORKFLOW.find(name_fragment)
    assert index >= 0, f"step not found: {name_fragment}"
    return index


def test_privacy_check_runs_after_the_build_and_before_the_upload() -> None:
    assert step_index("npm run build") < step_index("tools/privacy_check.py") < step_index("upload-pages-artifact")


def test_privacy_check_never_runs_with_a_shell_that_ignores_failure() -> None:
    # A hit (exit 1) must stop the job. "|| true" or continue-on-error would publish anyway.
    assert "|| true" not in WORKFLOW
    assert "continue-on-error" not in WORKFLOW


def test_only_the_built_site_is_published() -> None:
    assert re.search(r"upload-pages-artifact@v\d+\s+with:\s+path: app/dist\s", WORKFLOW)


def test_deploys_from_main_with_least_privilege() -> None:
    assert re.search(r"push:\s+branches: \[main\]", WORKFLOW)
    permissions = re.search(r"^permissions:\n((?:  .+\n)+)", WORKFLOW, re.MULTILINE)
    assert permissions is not None
    assert set(re.findall(r"(\S+): (\S+)", permissions.group(1))) == {
        ("contents", "read"), ("pages", "write"), ("id-token", "write"),
    }


def test_vite_base_matches_the_pages_address() -> None:
    vite_config = (ROOT / "app" / "vite.config.ts").read_text(encoding="utf-8")
    assert "base: '/kitsune-labs/'" in vite_config
    assert "https://sandeeepkiran.github.io/kitsune-labs/" in WORKFLOW
