from pathlib import Path

readme = Path('README.md')
text = readme.read_text()

replacements = [
    (
        "Current tested functional checkpoint:\n\n```text\n300be7a — Fix personalised TIDAL artwork loading\n```",
        "Current tested functional checkpoint:\n\n```text\nbcabd8a — Remove TIDAL track action reuse helper\n```\n\nCompanion backend checkpoint:\n\n```text\n9ac4924 — Remove strict play from here helper\n```",
        'README current checkpoint',
    ),
    (
        "PLAY FROM HERE remains the next planned personalised-playlist feature; it has not been implemented yet.",
        "Personalised PLAY FROM HERE is now implemented and live-tested. Selecting a My Mix track replaces the queue with that exact selected track followed by the remaining tracks from the same Mix in original order. The selected track is strict/fail-closed: it must resolve and queue safely rather than silently skipping to the following track. Runtime acceptance confirmed repeated PLAY FROM HERE use, exact selected-track starts, and the last-track boundary: starting from the final track leaves no later queue entry, so NEXT does not start an unrelated track.",
        'README artwork pending statement',
    ),
    (
        "Individual personalised tracks support PLAY NOW, PLAY NEXT, ADD TO END and PLAY ONLY. PLAY FROM HERE remains deliberately unavailable for My Mixes until its generic queue-tail semantics are implemented.",
        "Individual personalised tracks support PLAY NOW, PLAY NEXT, ADD TO END, PLAY FROM HERE and PLAY ONLY. Personalised PLAY FROM HERE uses the official selected track ID plus its personalised-playlist context, starts that exact selected track, and builds only the remaining tail of the Mix. The shared track-action lifecycle always clears its disabled/loading state after success or failure, so PLAY FROM HERE and the other actions remain reusable without rebuilding the menu DOM.",
        'README personalised controls statement',
    ),
]

for old, new, label in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label} anchor count was {count}, expected 1')
    text = text.replace(old, new, 1)

roadmap_anchor = "## Current feature set\n"
roadmap = """## Near-term TIDAL roadmap\n\n- Replace the older HEOS-oriented shortcuts with faster, richer official-TIDAL equivalents where the official API can provide the catalogue/UI metadata while HEOS remains playback transport.\n- Add TIDAL favourite/like controls for tracks, albums and artists.\n- Add a touchscreen Current Queue view. The first version should be read-only, show the current track and upcoming queue with available artwork/title/artist/album metadata, and provide direct visibility into PLAY FROM HERE / PLAY NEXT / ADD TO END results. Later queue mutation such as play-this-track, remove, reorder or clear can be considered separately.\n- Longer-term backend opportunities already preserved in the backend handover include listening history/recently played and richer discovery.\n\n"""
count = text.count(roadmap_anchor)
if count != 1:
    raise SystemExit(f'README roadmap anchor count was {count}, expected 1')
text = text.replace(roadmap_anchor, roadmap + roadmap_anchor, 1)
readme.write_text(text)

changelog = Path('CHANGELOG.md')
text = changelog.read_text()
anchor = "This file records project-level milestones and known-good checkpoints. Git history remains the detailed source for individual code changes.\n\n"
entry = """## 2026-09-02 — Personalised TIDAL PLAY FROM HERE\n\n- Added PLAY FROM HERE to official-API-backed My Mix/personalised track actions. The Pi sends the personalised playlist ID plus the exact official selected track ID to the backend rather than falling back to a generic HEOS container action.\n- The backend validates that the selected official track belongs to the fetched personalised playlist, rejects PLAY FROM HERE combined with shuffle, slices the queue from the selected track onward, and preserves the existing deterministic resolver, first-track `aid=4`, background `aid=3` queue builder and generation-cancellation design.\n- Hardened selected-first semantics: when PLAY FROM HERE is requested, the selected first track must resolve and queue safely. Resolution ambiguity/failure returns fail-closed instead of silently starting the following track. Later tracks retain the normal safe-skip behaviour used by the background builder.\n- Fixed the shared track-action button lifecycle so successful actions clear their disabled/loading state in `finally`, making PLAY FROM HERE and other actions using the same handler reusable on subsequent menu openings.\n- Live touchscreen acceptance confirmed the exact selected track starts, PLAY FROM HERE remains available on repeated use, and selecting the final track produces the correct queue boundary: NEXT does not start an unrelated track.\n- A Current Queue touchscreen view is now a planned follow-up so queue contents can be inspected directly; initial scope should be read-only before considering queue editing.\n\nPi implementation/checkpoint sequence includes:\n\n```text\nbeaa458 — Enable My Mix play from here\n041b035 — Make TIDAL track actions reusable\nbcabd8a — Remove TIDAL track action reuse helper\n```\n\nCompanion backend final checkpoint:\n\n```text\n9ac4924 — Remove strict play from here helper\n```\n\nCurrent tested Pi source checkpoint:\n\n```text\nbcabd8a — Remove TIDAL track action reuse helper\n```\n\n"""
count = text.count(anchor)
if count != 1:
    raise SystemExit(f'CHANGELOG header anchor count was {count}, expected 1')
text = text.replace(anchor, anchor + entry, 1)
changelog.write_text(text)

print('Updated Pi README and CHANGELOG for completed personalised PLAY FROM HERE')
