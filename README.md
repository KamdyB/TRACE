TRACE

Transaction-based Risk And Affordability Confidence Engine, built for the Innovate X financial track.

The problem

Standard income verification assumes a payslip. Most people don't have one clean monthly income figure, they have a mix of market sales, gig work, and remittances arriving on irregular schedules. Scoring that as if it were a salary produces a confident-looking number that's actually just a guess.

What TRACE does

A user grants scoped, revocable consent to specific transaction data. TRACE decomposes that history into separate income streams, scores affordability against each stream's own baseline, and attaches an explicit confidence band to the result based on how much reliable data actually backed it. Every score ships with a plain-language explanation, not a hidden weight.

Repository structure
README.md
api/
  main.py         entry point, exposes consent and scoring endpoints
consent/
  flow.py         issues and validates scoped consent grants
  ledger.py       append only record of what was accessed and when
schemas/
  contracts.py    shared data contracts used across consent, scoring, and api
scoring/
  engine.py       income decomposition, baseline calibration, affordability scoring
  fraud.py        score-gaming and manufactured-pattern detection
  models.py       scoring-side data structures (income streams, confidence bands)
My role

Data and Scoring Engineer on the four-person team. Owns everything in scoring, the scoring-relevant pieces of schemas/contracts.py, and defining what api/main.py needs to expose for scoring and explanation.

Status

In development for the Innovate X submission. All files currently scaffolded, no logic written yet.