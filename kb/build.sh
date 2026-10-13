#!/usr/bin/env bash
# Builds every sample document of the knowledge base into artifacts/kb/ (ignored by git):
#   artifacts/kb/sharepoint/               upload this folder to the SharePoint document library
#   artifacts/kb/confluence-attachments/   attached to pages by kb/publish_confluence.py
#
# Needs: python3 with python-docx and openpyxl, node with Playwright's Chromium (PDF).
# Slide decks need the my-presenter kit: set MPG to its bin/mpg (default ../my-presenter/bin/mpg).
# Without it the decks are skipped and everything else is still built.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=artifacts/kb
MPG="${MPG:-../my-presenter/bin/mpg}"

python3 kb/build_office.py "$OUT/sharepoint"
python3 kb/build_office_more.py "$OUT/sharepoint"
python3 kb/build_pdf_html.py "$OUT/_html" "$OUT/sharepoint" "$OUT/confluence-attachments"
node kb/render-pdf.js "$OUT/_html"
python3 kb/build_decks.py "$OUT/_decks"
# The error code workbook is also attached to a Confluence page.
cp "$OUT/sharepoint/ky-thuat/Ma-loi-va-den-bao.xlsx" "$OUT/confluence-attachments/"

if [ -x "$MPG" ] && "$MPG" --help >/dev/null 2>&1; then
  find "$OUT/_decks" -name '*.json' | sort | while read -r source; do
    target="$OUT/sharepoint/${source#"$OUT/_decks/"}"; target="${target%.json}.pptx"
    mkdir -p "$(dirname "$target")"
    "$MPG" validate "$source" --fit
    "$MPG" export "$source" --out "$target"
  done
else
  echo "Slide decks skipped: $MPG is not ready (run bin/setup in the my-presenter kit, then run this script again)."
fi

echo
find "$OUT/sharepoint" "$OUT/confluence-attachments" -type f | sed 's/.*\.//' | sort | uniq -c
