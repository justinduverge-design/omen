# Legal spot-check — Valor Ventures footer and public legal pages

**Date:** 2026-08-02
**Scope:** `Footer.jsx`, `Landing.jsx`, `Privacy.jsx`, `Terms.jsx`, and the canonical brand identity statement
**Purpose:** Pre-merge issue spotting; not legal advice or a substitute for counsel

## Verdict

No P0 or P1 issue remains in the reviewed change.

## Findings resolved before merge

- **Operator identity:** Privacy and Terms now identify Valor Ventures LLC as Omen's operator/product owner, matching the public footer and canonical brand hierarchy.
- **Contact accuracy:** The draft `owner@slopssaloon.com` address was replaced with the existing monitored `legal@slopssaloon.com` contact already used by Omen's public legal surfaces.
- **Copyright durability:** The footer year is generated at runtime instead of being fixed to 2026.
- **Accessibility of legal notice:** Small legal copy uses the secondary text token, and the legal contact has a 44px minimum target. Rendered light/dark checks found no horizontal overflow.

## Residual counsel item

The public Privacy and Terms pages remain plain-language product drafts and should receive counsel approval before being represented as final legal instruments. This change improves entity consistency; it does not certify the documents' legal completeness.
