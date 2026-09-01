#!/usr/bin/env python3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
readme_path = root / 'README.md'
changelog_path = root / 'CHANGELOG.md'
readme = readme_path.read_text()
changelog = changelog_path.read_text()

old_checkpoint = """Current tested functional checkpoint:\n\n```text\ned38288 — Reduce AVR status polling connection churn\n```\n\nThis checkpoint includes the current rich personalised TIDAL/My Mixes UI and playback controls, protected TIDAL resume behaviour, deterministic suppression of transient HEOS queue metadata during queue replacement, explicit AVR `unknown` handling, and reduced AVR port-23 connection churn. Treat older `v3-development`, `v3`, and stable branches as historical/reference branches unless deliberately restoring or comparing them.\n"""
new_checkpoint = """Current tested functional checkpoint:\n\n```text\n300be7a — Fix personalised TIDAL artwork loading\n```\n\nThis checkpoint includes the current rich personalised TIDAL/My Mixes UI and playback controls, protected TIDAL resume behaviour, deterministic suppression of transient HEOS queue metadata during queue replacement, explicit AVR `unknown` handling, reduced AVR port-23 connection churn, and the production personalised-artwork path tested 10/10 from a cold backend cache. Treat older `v3-development`, `v3`, and stable branches as historical/reference branches unless deliberately restoring or comparing them.\n"""

art_heading = "## Personalised TIDAL artwork checkpoint — 1 Sep 2026\n"
art_section = """## Personalised TIDAL artwork checkpoint — 1 Sep 2026\n\nLanding-card artwork no longer loads each complete personalised playlist. The Pi now calls the dedicated backend `/api/tidal/personalised/artwork?id=...` endpoint, which returns up to four distinct official TIDAL artwork URLs from the first playlist page only. Artwork enrichment is deliberately sequential (`concurrency = 1`) to avoid bursts. A failed card gets one retry after a 2-second delay; successful cards make no extra request.\n\nThe backend artwork cache is independent of the full-playlist cache and lives for 30 minutes. A warm full personalised-playlist cache can also satisfy artwork without another TIDAL API call. The final production path was tested 10/10 with warm caches and again 10/10 after restarting the HP backend to force a genuinely cold in-memory cache. The temporary artwork diagnostics and migration helpers were removed before checkpointing.\n\nPi checkpoint:\n\n```text\n300be7a — Fix personalised TIDAL artwork loading\n```\n\nCompanion backend checkpoint:\n\n```text\n2c8ac84 — Add lightweight personalised TIDAL artwork\n```\n\nPLAY FROM HERE remains the next planned personalised-playlist feature; it has not been implemented yet.\n\n"""

old_personalised = """The touchscreen has an official-API-backed **My Mixes** experience covering My Mix 1-8, My Daily Discovery and My New Arrivals. The landing page renders immediately from the personalised recommendation listing, including TIDAL-provided names and descriptions, then progressively enriches each card with a 2x2 collage built from up to four distinct official TIDAL album covers. Artwork enrichment uses limited concurrency and is optional/fail-soft, so a slow or failed cover request never blocks the card or its navigation.\n"""
new_personalised = """The touchscreen has an official-API-backed **My Mixes** experience covering My Mix 1-8, My Daily Discovery and My New Arrivals. The landing page renders immediately from the personalised recommendation listing, including TIDAL-provided names and descriptions, then progressively enriches each card with a 2x2 collage built from up to four distinct official TIDAL album covers. Artwork uses the dedicated lightweight first-page backend endpoint, loads sequentially to avoid request bursts, and retries a failed card once after two seconds. Artwork remains optional/fail-soft, so a slow or failed cover request never blocks the card or its navigation.\n"""

for old, label in [(old_checkpoint, 'README checkpoint'), (old_personalised, 'README personalised paragraph')]:
    if readme.count(old) != 1:
        raise SystemExit(f'Expected exactly one {label}, found {readme.count(old)}')
if art_heading in readme:
    raise SystemExit('README artwork checkpoint already exists')

readme = readme.replace(old_checkpoint, new_checkpoint, 1)
readme = readme.replace('## AVR status/resume resilience checkpoint — 1 Sep 2026\n', art_section + '## AVR status/resume resilience checkpoint — 1 Sep 2026\n', 1)
readme = readme.replace(old_personalised, new_personalised, 1)

change_heading = '## 2026-09-01 — Personalised TIDAL artwork hardening\n'
change_section = """## 2026-09-01 — Personalised TIDAL artwork hardening\n\n- Replaced landing-card artwork enrichment through the full personalised playlist endpoint with the dedicated lightweight `/api/tidal/personalised/artwork?id=...` proxy.\n- Landing artwork now consumes up to four distinct official TIDAL artwork URLs returned by the backend rather than loading every playlist page merely to build a collage.\n- Reduced artwork enrichment concurrency from three workers to one, avoiding request bursts during a cold My Mixes landing load.\n- Added exactly one delayed retry after 2 seconds for a failed artwork request. Successful cards do not make an additional request.\n- Removed the temporary visible artwork diagnostics and both one-shot artwork migration helpers before the final checkpoint.\n- Live-tested all ten cards successfully with warm caches, then restarted `marantz-backend.service` to clear in-memory caches and repeated the test: all ten cards populated automatically from a genuine cold backend cache.\n- PLAY FROM HERE for personalised playlists remains intentionally unimplemented and is the next planned queue feature.\n\nCheckpoint:\n\n```text\n300be7a — Fix personalised TIDAL artwork loading\n```\n\nCompanion backend checkpoint:\n\n```text\n2c8ac84 — Add lightweight personalised TIDAL artwork\n```\n\nCurrent tested functional checkpoint:\n\n```text\n300be7a — Fix personalised TIDAL artwork loading\n```\n\n"""

if change_heading in changelog:
    raise SystemExit('CHANGELOG artwork checkpoint already exists')
anchor = '## 2026-09-01 — AVR status, TIDAL resume and HEOS transition resilience\n'
if changelog.count(anchor) != 1:
    raise SystemExit(f'Expected one CHANGELOG anchor, found {changelog.count(anchor)}')
changelog = changelog.replace(anchor, change_section + anchor, 1)

readme_path.write_text(readme)
changelog_path.write_text(changelog)
Path(__file__).unlink()
print('Updated Pi README/CHANGELOG checkpoint and removed migration helper')
