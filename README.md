# Gem Finder

A private, browser-based tool for discovering **recent preprints on arXiv and chemRxiv** for editorial acquisition, powered by the [OpenAlex](https://openalex.org) open scholarly metadata API.

Given a topic, an author, or a list imported from a companion tool, the app surfaces preprints published within a configurable time window, displays publication-status indicators, shows on-demand author profiles, and exports selected results for review.

> **Private tool** — intended to run locally or from a secure cloud location. Not deployed as a public page.

---

## Features

| Mode | What it does |
|------|-------------|
| **Topic search** | Autocomplete against OpenAlex's full topic taxonomy (Subfield + Topic levels). Multi-select with OR / AND boolean. Pre-flight count check before fetching. |
| **Author search** | Name search with disambiguation card, or direct ORCID lookup. Toggle between repository-only preprints and all works. |
| **CSV import** | Accepts flexible CSV column names from companion tools. All rows are imported; up to 25 can be toggled on/off for the search. Topics searched with OR; authors offer a Repository only / All works scope toggle. |
| **Author profiles** | On-demand per result card: institution, career citations, publication count, "publishing since" year, and recent venue history — three API calls, cached for the session. |
| **Publication status** | Green / amber / grey indicator per card based on DOI prefix and source type. Tooltip: "Verify publication status before contacting". |
| **CSV export** | Exports selected results as two files: a full results CSV and a shared-schema authors CSV for import into companion tools. |

---

## Running Locally

**Requirements:** Node.js 18+ and npm.

```bash
# 1. Clone the repo
git clone https://github.com/teowaits/gem_finder.git
cd gem_finder

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

```bash
# Build for production
npm run build

# Preview the production build
npm run preview
```

No API key is required — OpenAlex is free and open. For sustained heavy usage, you can register a polite-pool email at [openalex.org/settings/api](https://openalex.org/settings/api).

---

## How It Works

1. **Source verification** — at startup, the hardcoded arXiv and chemRxiv source IDs are verified against the OpenAlex `/sources` endpoint. A non-blocking warning banner appears if either ID has changed.
2. **Topic autocomplete** — queries the `/topics` and `/subfields` endpoints in parallel, merges results (subfields first), and presents a combined dropdown of up to 10 matches.
3. **Pre-flight count check** — before every topic or import fetch, a single `per_page=1` request reads `meta.count`. If the result set exceeds 250 the user is warned; if it is zero a broadening suggestion is shown.
4. **Work fetching** — paginated in batches of 200 with a 60 ms inter-request delay, capped at 250 results. In author mode a client-side filter optionally restricts results to `source.type = "repository"`.
5. **Author disambiguation** — name searches return up to 8 candidates displayed with institution, top topics, and career stats. ORCID input bypasses the card and resolves directly.
6. **Author profile** — triggered per card on demand. Three sequential API calls fetch the career summary, earliest work date, and recent venue history; results are cached in a session Map.
7. **CSV import** — flexible column detection accepts headers from multiple companion-tool export formats (`openalex_id`, `OpenAlex ID`, `Open Alex ID`, `Name`, etc.; extra columns ignored). All rows are parsed without a hard cap; up to 25 can be selected via checkboxes (top 25 pre-ticked). Topic rows are fetched with OR (any matching topic area); author rows respect the Repository only / All works scope toggle. Passes are merged and deduplicated by OpenAlex Work ID.
8. **Export** — selected cards are written to two CSVs: a detailed results file and a shared-schema author file compatible with journal-overlap and journal-profile-analyser.

### Practical limits

| Cap | Value |
|-----|-------|
| Results per search | 250 |
| Topics / subfields per import | 25 |
| Authors per import | 25 |
| OpenAlex paging wall | 10,000 results (50 pages × 200) |
| Inter-request delay | 60 ms |

---

## CSV Import Format

Gem Finder accepts CSVs from companion tools with flexible column naming. A `type` column and an OpenAlex ID column are required; all other columns are optional and extras are ignored.

**Topics / subfields** (exported by journal-profile-analyser):
```csv
type,OpenAlex ID,display_name,notes
topic,T10104,Machine Learning,from journal-profiler
subfield,S2208,Artificial Intelligence,from journal-profiler
```

**Authors** (exported by journal-overlap):
```csv
type,Name,ORCID,Open Alex ID,Notes
author,Heather Piwowar,0000-0003-1613-5981,A5023888391,from journal-overlap
```

Mixed files containing both topics and authors are supported. Valid `type` values: `topic`, `subfield`, `author`. All rows are imported; use the checkboxes in the panel to select up to 25 for the search (top 25 pre-selected by default).

### Export schema

Exports use the shared cross-tool schema:
```csv
type,openalex_id,display_name,notes,orcid
author,A5023888391,Heather Piwowar,gem-finder export,0000-0003-1613-5981
```

---

## Companion Tools

| Tool | Purpose |
|------|---------|
| [journal-overlap](https://github.com/teowaits/journal-overlap) | Authorship overlap between two sets of journals |
| journal-profile-analyser | Topic and venue profiling for a journal (in development) |

---

## Data & Acknowledgements

All scholarly metadata is provided by **[OpenAlex](https://openalex.org)** — a fully open, free index of global research output maintained by [OurResearch](https://ourresearch.org). OpenAlex data is released under the [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) public domain dedication.

> Priem, J., Piwowar, H., & Orr, R. (2022). OpenAlex: A fully-open index of the world's research. *arXiv*. https://doi.org/10.48550/arXiv.2205.01833

---

## Created By

**[teowaits](https://github.com/teowaits)**

This tool was built with the assistance of [Claude Sonnet 4.6](https://www.anthropic.com/claude) by Anthropic, following OpenAlex API best practices:

- Source ID verification at startup rather than filtering by name
- Pre-flight count checks before every paginated fetch
- `select=` field filtering to minimise response payload
- Client-side deduplication and status-indicator logic to avoid redundant API calls
- AbortController cancellation on every in-flight request

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| **1.1.0** | 2026-04-08 | **CSV import overhaul** — flexible column detection accepts headers from multiple companion-tool formats; no row limit on import; checkbox selection UI (top 25 pre-ticked, 25-item cap enforced live); OR label for topics; Repository only / All works scope toggle for authors |
| **1.0.0** | 2026-04-08 | Initial release — topic search (OR/AND, subfield autocomplete, pre-flight check), author search (ORCID detection, disambiguation card, repository toggle), CSV import/export (shared schema), on-demand author profiles, publication status indicators, landing page with example topics |

---

## License

[MIT](LICENSE)
