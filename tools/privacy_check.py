"""Privacy check: scan every file that would be committed for things that must never be public.

What it looks for:
  - every term in docs/private/denylist.txt (read at run time, case-insensitive)
  - email addresses (except @mousy.example)
  - phone-number patterns (except the fictional 555-01xx range)
  - UUIDs
  - real-looking timezone tags (IANA zone names, UTC offsets, zone abbreviations)

"Would be committed" = every file under the project root that .gitignore does not exclude.
Text inside .xlsx and .zip files is scanned too. Denylist hits are reported by the term's line
number only, never the term itself, so this output is safe to paste anywhere.

Exit code: 0 = clean, 1 = hits found, 2 = cannot run (for example, the denylist is missing).

Run:  python tools/privacy_check.py
"""

from __future__ import annotations

import argparse
import fnmatch
import io
import os
import re
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DENYLIST = ROOT / "docs" / "private" / "denylist.txt"

ARCHIVE_SUFFIXES = {".xlsx", ".zip", ".docx"}
BINARY_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".woff", ".woff2", ".ttf", ".otf", ".pdf"}
MAX_BYTES = 20 * 1024 * 1024
ALWAYS_SKIP_DIRS = {".git"}

# The regex rules below would match their own source text, so this file is exempt from them.
# It is still checked against the denylist.
REGEX_EXEMPT = {"tools/privacy_check.py"}

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})")
ALLOWED_EMAIL_DOMAINS = ("mousy.example",)
PHONE_RES = [
    re.compile(r"(?<![\w-])(?:\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?![\w-])"),
    re.compile(r"(?<![\w-])\d{3}-\d{4}(?![\w-])"),
    re.compile(r"(?<![\w.-])\+?\d{10,13}(?![\w.-])"),
]
FICTIONAL_PHONE_RE = re.compile(r"555-01\d\d$")
UUID_RE = re.compile(r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b")
TIMEZONE_RES = [
    re.compile(r"\b(?:Africa|America|Asia|Atlantic|Australia|Europe|Indian|Pacific)/[A-Z][A-Za-z_]+"),
    re.compile(r"\b(?:UTC|GMT)\s?[+-]\d{1,2}(?::?\d{2})?\b"),
    re.compile(r"\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?[+-]\d{2}:?\d{2}\b"),
    re.compile(r"\b(?:EST|EDT|CST|CDT|MST|MDT|PST|PDT|IST|AEST|AEDT|BST|CET|CEST|JST|HST|AKST)\b"),
]


@dataclass
class Hit:
    path: str
    line: int
    rule: str
    detail: str

    def __str__(self) -> str:
        return f"{self.path}:{self.line}: {self.rule}: {self.detail}"


# -- which files count as "would be committed" -------------------------------------

def load_gitignore(root: Path) -> list[str]:
    path = root / ".gitignore"
    if not path.exists():
        return []
    patterns = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line and not line.startswith("#"):
            patterns.append(line)
    return patterns


def is_ignored(rel_path: str, patterns: list[str]) -> bool:
    """A small .gitignore matcher: enough for this repo's patterns (no negations)."""
    parts = rel_path.split("/")
    for pattern in patterns:
        directory_only = pattern.endswith("/")
        body = pattern.rstrip("/")
        anchored = "/" in body
        body = body.lstrip("/")
        if anchored:
            # docs/private/ matches that path and everything under it.
            for depth in range(1, len(parts) + 1):
                prefix = "/".join(parts[:depth])
                if fnmatch.fnmatch(prefix, body) and (not directory_only or depth < len(parts)):
                    return True
            continue
        candidates = parts[:-1] if directory_only else parts
        if any(fnmatch.fnmatch(part, body) for part in candidates):
            return True
    return False


def files_to_scan(root: Path) -> list[Path]:
    patterns = load_gitignore(root)
    found = []
    for folder, dir_names, file_names in os.walk(root):
        rel_folder = Path(folder).relative_to(root).as_posix()
        prefix = "" if rel_folder == "." else rel_folder + "/"
        # Prune ignored folders here so we never walk node_modules.
        dir_names[:] = sorted(d for d in dir_names
                              if d not in ALWAYS_SKIP_DIRS and not is_ignored(f"{prefix}{d}/x", patterns))
        for name in sorted(file_names):
            if not is_ignored(prefix + name, patterns):
                found.append(Path(folder) / name)
    return found


# -- reading text -------------------------------------------------------------------

def text_sources(path: Path, rel: str) -> list[tuple[str, str]]:
    """(label, text) pairs for a file. Archives yield one pair per member."""
    suffix = path.suffix.lower()
    if suffix in BINARY_SUFFIXES or path.stat().st_size > MAX_BYTES:
        return []
    data = path.read_bytes()
    if suffix in ARCHIVE_SUFFIXES:
        sources = []
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                for member in archive.namelist():
                    member_suffix = Path(member).suffix.lower()
                    if member_suffix in BINARY_SUFFIXES:
                        continue
                    content = archive.read(member)
                    if member_suffix in ARCHIVE_SUFFIXES:
                        continue
                    sources.append((f"{rel}!{member}", content.decode("utf-8", errors="ignore")))
        except zipfile.BadZipFile:
            sources.append((rel, data.decode("utf-8", errors="ignore")))
        return sources
    return [(rel, data.decode("utf-8", errors="ignore"))]


# -- rules --------------------------------------------------------------------------

def load_denylist(path: Path) -> list[tuple[int, re.Pattern]]:
    terms = []
    for number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        # "\b" in a term means a word boundary; everything else is literal text.
        pattern = r"\b".join(re.escape(piece) for piece in line.split(r"\b"))
        terms.append((number, re.compile(pattern, re.IGNORECASE)))
    return terms


def line_of(text: str, index: int) -> int:
    return text.count("\n", 0, index) + 1


def scan_text(label: str, text: str, denylist: list[tuple[int, re.Pattern]], regex_rules: bool) -> list[Hit]:
    hits: list[Hit] = []
    # Scan the file name too: a file can leak a name through its path.
    for number, pattern in denylist:
        if pattern.search(label):
            hits.append(Hit(label, 0, "denylist", f"term on denylist line {number} (in the file name)"))
        for match in pattern.finditer(text):
            hits.append(Hit(label, line_of(text, match.start()), "denylist", f"term on denylist line {number}"))
    if not regex_rules:
        return hits
    for match in EMAIL_RE.finditer(text):
        domain = match.group(1).lower()
        if not any(domain == d or domain.endswith("." + d) for d in ALLOWED_EMAIL_DOMAINS):
            hits.append(Hit(label, line_of(text, match.start()), "email", match.group(0)))
    seen_phone_spans: set[int] = set()
    for phone_re in PHONE_RES:
        for match in phone_re.finditer(text):
            if match.start() in seen_phone_spans or FICTIONAL_PHONE_RE.search(match.group(0)):
                continue
            seen_phone_spans.add(match.start())
            hits.append(Hit(label, line_of(text, match.start()), "phone", match.group(0)))
    for match in UUID_RE.finditer(text):
        hits.append(Hit(label, line_of(text, match.start()), "uuid", match.group(0)))
    for tz_re in TIMEZONE_RES:
        for match in tz_re.finditer(text):
            hits.append(Hit(label, line_of(text, match.start()), "timezone", match.group(0)))
    return hits


def check_private_folder_ignored(root: Path) -> list[Hit]:
    if is_ignored("docs/private/anything.md", load_gitignore(root)):
        return []
    return [Hit(".gitignore", 0, "config", "docs/private/ is not ignored: private notes would be committed")]


def run(root: Path, denylist_path: Path) -> list[Hit]:
    denylist = load_denylist(denylist_path)
    hits = check_private_folder_ignored(root)
    for path in files_to_scan(root):
        rel = path.relative_to(root).as_posix()
        for label, text in text_sources(path, rel):
            hits.extend(scan_text(label, text, denylist, regex_rules=rel not in REGEX_EXEMPT))
    return hits


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Scan files that would be committed for private data.")
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--denylist", type=Path, default=DEFAULT_DENYLIST)
    args = parser.parse_args(argv)

    if not args.denylist.exists():
        print(f"Privacy check cannot run: denylist not found at {args.denylist}", file=sys.stderr)
        return 2
    root = args.root.resolve()
    hits = run(root, args.denylist)
    scanned = len(files_to_scan(root))
    if hits:
        for hit in hits:
            print(hit)
        print(f"\nFAIL: {len(hits)} privacy hit(s) in {scanned} files.")
        return 1
    print(f"PASS: no privacy hits in {scanned} files.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
