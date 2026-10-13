"""Publishes the sample space to Confluence Cloud: space, pages, blog posts, labels, attachments.

Safe to run again: pages are found by title and updated, attachments are replaced.

Usage: python3 kb/publish_confluence.py [--dry-run] [attachment directories...]
Environment (the Jira values are used when the Confluence ones are empty):
  CONFLUENCE_BASE_URL | JIRA_BASE_URL     https://<site>.atlassian.net
  CONFLUENCE_EMAIL | JIRA_EMAIL           Atlassian account
  CONFLUENCE_API_TOKEN | JIRA_API_TOKEN   API token of that account
  CONFLUENCE_SPACE_KEY                    default KBDEMO
"""

import base64
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

import confluence_pages as pages

env = os.environ.get
BASE = (env("CONFLUENCE_BASE_URL") or env("JIRA_BASE_URL") or "").rstrip("/").removesuffix("/wiki")
EMAIL = env("CONFLUENCE_EMAIL") or env("JIRA_EMAIL") or ""
TOKEN = env("CONFLUENCE_API_TOKEN") or env("JIRA_API_TOKEN") or ""
SPACE = env("CONFLUENCE_SPACE_KEY") or "KBDEMO"
SPACE_NAME = "Mộc Lan Home — Kiến thức CSKH"
args = [a for a in sys.argv[1:] if not a.startswith("--")]
DRY_RUN = "--dry-run" in sys.argv
ATTACHMENT_DIRS = [Path(a) for a in args] or [Path("artifacts/kb/confluence-attachments"), Path("artifacts/kb/sharepoint")]


def call(method, path, body=None, headers=None, raw=None):
    request = urllib.request.Request(f"{BASE}/wiki/rest/api{path}", method=method)
    request.add_header("Authorization", "Basic " + base64.b64encode(f"{EMAIL}:{TOKEN}".encode()).decode())
    request.add_header("Accept", "application/json")
    data = raw
    if body is not None:
        data = json.dumps(body).encode()
        request.add_header("Content-Type", "application/json")
    for key, value in (headers or {}).items():
        request.add_header(key, value)
    try:
        with urllib.request.urlopen(request, data=data, timeout=60) as response:
            text = response.read().decode()
            return json.loads(text) if text else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")[:300]
        raise SystemExit(f"{method} {path} -> HTTP {error.code}: {detail}") from None


def ensure_space():
    found = call("GET", f"/space?spaceKey={SPACE}")
    if found.get("results"):
        return
    call("POST", "/space", {"key": SPACE, "name": SPACE_NAME,
                            "description": {"plain": {"value": "Sample knowledge base for the chatbot demo.", "representation": "plain"}}})
    print(f"space {SPACE} created")


def find(title, kind):
    query = urllib.parse.urlencode({"spaceKey": SPACE, "title": title, "type": kind, "expand": "version"})
    results = call("GET", f"/content?{query}").get("results", [])
    return results[0] if results else None


def upsert(item, kind, parent_id=None):
    body = {"type": kind, "title": item["title"], "space": {"key": SPACE},
            "body": {"storage": {"value": item["body"], "representation": "storage"}}}
    if parent_id:
        body["ancestors"] = [{"id": parent_id}]
    existing = find(item["title"], kind)
    if existing:
        body["version"] = {"number": existing["version"]["number"] + 1}
        result = call("PUT", f"/content/{existing['id']}", body)
    else:
        result = call("POST", "/content", body)
    if item["labels"]:
        call("POST", f"/content/{result['id']}/label", [{"prefix": "global", "name": label} for label in item["labels"]])
    return result["id"]


def locate(name):
    for directory in ATTACHMENT_DIRS:
        hits = sorted(directory.rglob(name))
        if hits:
            return hits[0]
    return None


def attach(content_id, name):
    path = locate(name)
    if not path:
        print(f"  attachment {name}: not found, skipped (build the sample files first)")
        return
    boundary = uuid.uuid4().hex
    kind = mimetypes.guess_type(name)[0] or "application/octet-stream"
    payload = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{name}"\r\nContent-Type: {kind}\r\n\r\n'.encode()
               + path.read_bytes() + f"\r\n--{boundary}--\r\n".encode())
    # PUT creates the attachment or adds a new version of it.
    call("PUT", f"/content/{content_id}/child/attachment", raw=payload,
         headers={"X-Atlassian-Token": "nocheck", "Content-Type": f"multipart/form-data; boundary={boundary}"})
    print(f"  attachment {name}")


def main():
    if DRY_RUN:
        attachments = sum(len(item["attachments"]) for item in pages.PAGES)
        print(f"{len(pages.PAGES)} pages, {len(pages.BLOGS)} blog posts, {attachments} attachments for space {SPACE}")
        return
    if not (BASE and EMAIL and TOKEN):
        raise SystemExit("Set CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL and CONFLUENCE_API_TOKEN (or the JIRA_* equivalents) in .env.")
    ensure_space()
    ids = {}
    for item in pages.PAGES:  # parents come before their children in the list
        ids[item["title"]] = upsert(item, "page", ids.get(item["parent"]))
        print(f"page {item['title']}")
        for name in item["attachments"]:
            attach(ids[item["title"]], name)
    for item in pages.BLOGS:
        upsert(item, "blogpost")
        print(f"blog {item['title']}")
    print(f"Done: {len(pages.PAGES)} pages and {len(pages.BLOGS)} blog posts in space {SPACE}")


if __name__ == "__main__":
    main()
