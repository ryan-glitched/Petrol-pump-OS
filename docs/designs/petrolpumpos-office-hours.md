# PetrolPumpOS — Office Hours Design Doc

> Status: **planning only, no app code.** This is a diagnostic + design doc, not an
> implementation. It exists to make sure we build the *right* thing in the right order.
> Mode: build for **one operator (PGL / Shahid Mohsin)** now → **productize to every station** later.
> Source artifacts: `PetrolPumpOS-Product-Spec.md` (the 9-PR build plan) and the existing
> Next.js prototype (`ryan-glitched/Petrol-pump-OS`).

---

## 1. Problem statement

PGL (PARCO Gunvor Ltd) runs multi-branch petrol stations. The daily operational loop —
shift open → nozzle/dip readings → sales + cash reconciliation → deliveries → expenses/credit
→ end-of-day numbers — is run today on **Excel / paper / WhatsApp** (assumed; see open questions).

The job-to-be-done is **not** "have an ERP." It is:

> *"Know my real numbers every day, and catch fuel/cash leaking before it adds up to real money."*

The prototype already renders 15 polished screens, but is 100% mock: nothing persists, no auth,
branch/role selectors are decorative, and the "variance alert" is hardcoded. So today it can
*demo* the loop but cannot *run* it, and critically it does not yet compute the one number that
justifies its existence: **tank book-vs-dip variance (loss).**

## 2. Demand evidence

**Current status: ASSUMED, not yet validated.** This is the single biggest risk in the project.

- **What we have:** a named design partner — Shahid Mohsin / PGL. A real operator with real
  stations is the strongest possible starting point.
- **What we do NOT have yet (and must get):** evidence that PGL would *run their day* on this and
  be upset if it disappeared. A built prototype, "this is cool," or a handover is **not** demand.
  The proof is behavioral: a station manager entering real readings every shift, and Shahid
  reacting to a variance flag.
- **Why it matters:** "build for one, sell to many" only works if the *one* genuinely adopts.
  If Shahid keeps his Excel open alongside this tool, we have neither a happy customer nor a
  validated product.

## 3. The specific user

- **Economic buyer / champion:** Shahid Mohsin (owner). Cares about: total daily revenue, margin,
  and **shrinkage** (fuel/cash he can't account for). What keeps him up at night is loss he can't
  see until month-end.
- **Daily operators (the people who must actually type into this):** station manager, cashier,
  filler. They will only use it if it is **faster or safer than Excel for them** — not just nicer
  for the owner. If data entry is slower than their current sheet, they route around it.

This split matters: the owner feels the *loss* pain; the operators feel the *data-entry* pain.
A tool that helps only the owner and taxes the operators dies on adoption.

## 4. The narrowest wedge (build this first)

**Single-station daily reconciliation + tank variance.** One branch, the real fuel products,
the real readings — and the one output Excel can't give them for free: an automatic
**book-vs-dip variance + loss flag** at end of shift/day.

Concretely, the thin vertical slice:

1. Persist three forms only: **nozzle readings, tank dips, sales/cash entry** (one station).
2. Compute server-side: litres sold, expected tank balance (opening dip + deliveries − sold),
   actual (closing dip), **variance L / variance % / flagged?**, and cash difference.
3. Surface one screen: *"Today, Station X: expected vs actual, you are short N litres / PKR M — flagged."*

Explicitly **out** of the wedge: auth/RBAC, multi-branch, deliveries/expenses/credit/mobil-oil
modules, the 11 reports, forecasting, audit log, exports. They are sequencing, not the bet.

**Bonus ("value with zero setup"):** let PGL **import one month of their existing Excel** and
immediately show the variance they've been missing. If that single number lands ("you lost X last
month and didn't see it"), demand is real and the rest of the roadmap earns itself. If it doesn't
land, no amount of reports/forecasting will save it — and we found out in days, not months.

## 5. Premise challenge

- **Is "ERP" the right problem?** No — ERP is a *proxy*. The direct outcome Shahid wants is
  "stop the leak / trust my daily numbers." The most direct path to that is the
  reconciliation+variance loop, not 11 report cards or a forecasting chart.
- **Where the spec's effort is mis-weighted:** Reports (P4) and Forecasting (P5) are the most
  *impressive* to demo and the *least* likely to create panic-when-it-breaks. They should come
  **after** the variance engine has earned trust, not be treated as co-equal phases.
- **The data-entry trap:** a version that persists forms but doesn't compute loss is *worse than
  Excel* for the operators (slower to type, no payoff). Persistence alone (P1) is necessary
  plumbing but is **not** a standalone value milestone — it must ship *with* the variance payoff
  (P3 core) to be worth adopting. The spec's "earliest credibility win = PR2–PR4 (persistence)"
  is half right: persistence without variance is credibility to *engineers*, not to PGL.
- **What if we do nothing?** PGL keeps using Excel. That's the real competitor. We only beat it by
  giving back something Excel can't: the automatic, trustworthy loss flag. Everything else, Excel
  already does "well enough."

## 6. Alternatives considered

Effort shown in two frames: **[human team]** and **[AI-assisted]**.

| # | Approach | What it includes | Effort | Notes |
|---|----------|------------------|--------|-------|
| **A — Narrowest wedge** ⭐ | Single-station reconciliation + variance/loss flag (3 forms persisted, variance engine, one alert screen). No auth, no multi-branch. | P1(partial) + P3(core) for one branch | **[human] ~1–2 wks · [AI] ~2–4 days** | Only option that proves the core value and gets PGL running this week. |
| **B — Operational loop MVP** | All 8 forms persist + auth/RBAC + branch scoping + variance engine. The "credible internal tool" Shahid runs across stations. | P0–P3 | **[human] ~6–10 wks · [AI] ~1.5–3 wks** | The right *second* step, once A proves adoption. |
| **C — Full ERP (the spec)** | Everything: + reports/exports, forecasting/AI, audit/observability/a11y/deploy. The productize-to-everyone target. | P0–P6 | **[human] ~3–6 mo · [AI] ~3–6 wks** | The destination, not the starting line. Building this before A is the trap. |

**Recommendation: A, then B, then C.** One reason: only the variance/loss flag makes someone
*panic when it breaks* — build the smallest thing that produces that number, put it in front of
Shahid, and let his reaction (not the roadmap) decide what's next. The spec's P0 foundation
(money-as-integers, Zod, pinned deps, CI) is cheap and should ride along with A — it's good
hygiene, just don't let it become the whole first PR.

## 7. Risks & open questions — HANDOVER BACKLOG

> These are the diagnostic questions we deliberately deferred. Whoever takes this forward should
> answer them *with PGL*, not from assumption. Ordered by leverage.

**Demand & status quo (highest leverage — answer before building B/C):**
1. How does PGL run the loop *today*, exactly? Whose laptop, which Excel sheet, who fills it per
   shift, what's done on paper/WhatsApp, where does it break? (We assumed Excel to unblock; confirm.)
2. What does the current workaround cost — hours/day reconciling, and PKR/month of unexplained
   shrinkage? (This number is the business case.)
3. Would Shahid's *managers/cashiers* actually enter readings every shift, or only the owner cares?
   What makes the tool faster than their sheet for *them*?
4. Strongest behavioral signal we could get this month that PGL is "upset if it disappears"
   (e.g. a manager entering real readings daily for 2 weeks unprompted)?

**Domain correctness (must get right or the loss flag is noise):**
5. Real product list & units (Hi-Octane/HOBC/Hi-Super/Diesel/Mobil) and per-station tank/dispenser/
   nozzle layout.
6. Real fuel-price change cadence and who sets it (drives `FuelPrice` history + rate-on-date).
7. Acceptable variance **tolerance** before flagging — temperature/evaporation/meter drift mean
   small variance is normal. What % is "noise" vs "investigate"? (Per-branch config.)
8. How are stale/missing dips and mid-shift corrections handled today? (Drives the append-only
   adjusting-entry model.)

**Productization (defer until PGL adopts):**
9. Which parts of PGL's setup are bespoke vs generalizable to "any station"?
10. Multi-tenant boundary, deployment/hosting expectations, and data-residency for Pakistan.
11. SSO/role model the next operators will need vs PGL's credentials-only V1.

**Engineering (from the spec, still valid):**
12. SQLite→Postgres cutover trigger; Asia/Karachi display vs UTC storage; receipt object storage;
    seed reproducing real demo numbers; pinned-deps/CI hygiene.

## 8. The one concrete next action

**Get one month of one PGL station's real readings/sales from Shahid, and build Approach A
(single-station reconciliation + variance) seeded against that real data — so the very first demo
shows Shahid a *real* loss number he didn't already know.**

That single move does triple duty: it validates demand (does he react?), de-risks the domain
(real products/tanks/tolerances), and ships the only feature that justifies the whole product. If
the number lands, B and C are funded by a real customer. If it doesn't, we've spent days, not months.
