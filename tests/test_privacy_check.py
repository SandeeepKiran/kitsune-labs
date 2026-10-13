"""The privacy check passes on the repo, and it really catches what it claims to catch."""

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))

import privacy_check  # noqa: E402

# Built from pieces so this test file does not trip the check itself.
FAKE_EMAIL = "someone" + "@" + "example.com"
FAKE_PHONE = "-".join(["212", "867", "5309"])
FAKE_UUID = "-".join(["123e4567", "e89b", "12d3", "a456", "4266" + "1417" + "4000"])
FAKE_ZONE = "Europe" + "/" + "Paris"
SECRET_TERM = "zorblaxcorp"


def make_repo(tmp_path: Path, files: dict[str, str], gitignore: str = "docs/private/\nnode_modules/\n") -> Path:
    (tmp_path / ".gitignore").write_text(gitignore, encoding="utf-8")
    for rel, content in files.items():
        target = tmp_path / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
    denylist = tmp_path / "docs" / "private" / "denylist.txt"
    denylist.parent.mkdir(parents=True, exist_ok=True)
    denylist.write_text(f"# test denylist\n{SECRET_TERM}\n", encoding="utf-8")
    return tmp_path


def rules_hit(root: Path) -> set[str]:
    hits = privacy_check.run(root, root / "docs" / "private" / "denylist.txt")
    return {hit.rule for hit in hits}


def test_project_passes_privacy_check() -> None:
    if not privacy_check.DEFAULT_DENYLIST.exists():
        pytest.skip("Private denylist is not on this machine (expected on a fresh clone).")
    assert privacy_check.main([]) == 0


@pytest.mark.parametrize(
    ("content", "rule"),
    [
        (f"write to {FAKE_EMAIL}", "email"),
        (f"call {FAKE_PHONE}", "phone"),
        (f"id {FAKE_UUID}", "uuid"),
        (f"zone {FAKE_ZONE}", "timezone"),
        ("at 10:00:00+05" + ":30", "timezone"),
        (f"made by {SECRET_TERM.upper()}", "denylist"),
    ],
)
def test_each_rule_catches_its_pattern(tmp_path: Path, content: str, rule: str) -> None:
    root = make_repo(tmp_path, {"notes.md": content})
    assert rule in rules_hit(root)


def test_invented_mousy_data_is_allowed(tmp_path: Path) -> None:
    root = make_repo(tmp_path, {"pack.txt": "help" + "@mousy.example, call 555-0142, order MO-4417, 2025-03-04T10:00:00Z"})
    assert rules_hit(root) == set()


def test_ignored_folders_are_not_scanned(tmp_path: Path) -> None:
    root = make_repo(tmp_path, {
        "docs/private/notes.md": f"{SECRET_TERM} {FAKE_EMAIL}",
        "node_modules/pkg/index.js": FAKE_EMAIL,
    })
    assert rules_hit(root) == set()


def test_denylist_term_is_never_printed(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    root = make_repo(tmp_path, {"notes.md": f"hello {SECRET_TERM}"})
    exit_code = privacy_check.main(["--root", str(root), "--denylist", str(root / "docs/private/denylist.txt")])
    output = capsys.readouterr().out
    assert exit_code == 1
    assert "denylist line 2" in output
    assert SECRET_TERM not in output.lower()


def test_text_inside_xlsx_and_zip_is_scanned(tmp_path: Path) -> None:
    import zipfile

    root = make_repo(tmp_path, {})
    with zipfile.ZipFile(root / "bundle.zip", "w") as archive:
        archive.writestr("inner/readme.txt", f"contact {FAKE_EMAIL}")
    assert "email" in rules_hit(root)


def test_fails_when_private_folder_is_not_ignored(tmp_path: Path) -> None:
    root = make_repo(tmp_path, {"readme.md": "fine"}, gitignore="node_modules/\n")
    assert "config" in rules_hit(root)


def test_missing_denylist_means_cannot_run(tmp_path: Path) -> None:
    assert privacy_check.main(["--root", str(tmp_path), "--denylist", str(tmp_path / "nope.txt")]) == 2


def test_no_denylist_mode_still_runs_the_pattern_rules(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    # The deploy build has no docs/private/, so it runs this mode. Patterns must still fail it.
    root = make_repo(tmp_path, {"notes.md": f"write to {FAKE_EMAIL}, made by {SECRET_TERM}"})
    (root / "docs" / "private" / "denylist.txt").unlink()
    assert privacy_check.main(["--root", str(root), "--no-denylist"]) == 1
    output = capsys.readouterr().out
    assert "email" in output and "denylist line" not in output
    assert "denylist skipped" in output
