# TRACE

Transaction-based Risk And Affordability Confidence Engine, built for the Innovate X financial track.

## The problem

Standard income verification assumes a payslip. Most people don't have one clean monthly income figure. They have a mix of market sales, gig work, remittances, and other irregular income.

Treating all of that like a fixed salary can produce a confident-looking number that is actually just a guess.

## What TRACE does

A user grants scoped, revocable consent to specific transaction data.

TRACE analyses that history to:

* identify income patterns
* establish an income baseline
* assess affordability
* detect potentially manufactured transaction patterns
* attach confidence to each signal
* explain the result in plain language

TRACE produces signals, not lending or fraud decisions.

## Product flow

```text
Connect account
      ↓
Review requested access
      ↓
Grant consent
      ↓
Analyse transaction history
      ↓
Affordability + fraud signals
      ↓
View explanations
      ↓
Manage or revoke access
```

Lenders can also view an applicant dashboard containing signal bands, confidence, transaction patterns, and explanations.

## Repository structure

```text
api/
  main.py         API entry point for consent and scoring

consent/
  flow.py         creates, validates, expires and revokes consent
  ledger.py       append-only record of access events

schemas/
  contracts.py    shared data contracts used across modules

scoring/
  engine.py       income profiling, baseline and affordability scoring
  fraud.py        manufactured-pattern detection
  models.py       scoring-side data structures

frontend/
  src/App.jsx     applicant flow and lender dashboard
```

## Shared contracts

`schemas/contracts.py` is the single source of truth for data crossing module boundaries.

Current contracts include:

* Consent Grant
* Transaction History Payload
* Affordability Signal
* Revocation Event
* Fraud Signal

Signals explicitly carry explanations and cannot be treated as lending or fraud decisions.

## Frontend

The frontend is a React + Vite product prototype.

It currently supports:

* mock account/provider selection
* transaction-history review
* consent grant flow
* scoring/loading state
* affordability signal display
* fraud signal display
* transaction-pattern visualization
* consent revocation
* lender/applicant view switching
* applicant search
* affordability-band filtering
* applicant sorting
* expandable applicant details

The frontend currently uses mock transaction datasets for salaried, seasonal-trader, gig-income, and suspicious-pattern scenarios.

## Scoring

The scoring layer is responsible for turning transaction history into explainable signals.

### Affordability

The engine currently considers:

* observed inflows
* average income
* median income
* income stability
* reliable-income baseline
* transaction-history depth
* income seasonality

### Fraud patterns

The fraud engine currently checks for:

* repeated identical income amounts
* unusually high recurring-pattern scores
* unusually concentrated income activity

These produce a risk signal and explanation, not a fraud verdict.

## Consent

Consent is scoped to transaction history and has an explicit lifecycle:

```text
ACTIVE → EXPIRED
ACTIVE → REVOKED
```

Revocation cuts access off immediately.

The consent module owns consent state. It does not perform scoring, fraud detection, ledger writing, or API routing.

## Current status

TRACE is in active development for the Innovate X submission.

The consent flow and frontend prototype are implemented.

The scoring layer is being implemented and integrated with the shared contracts.

The next integration boundary is the API, which will connect the frontend product flow to the Python consent and scoring modules.

## Team ownership

The project is split by responsibility:

* Consent — consent lifecycle and access control
* Ledger — access-event recording
* Data & Scoring — income analysis, affordability, fraud-pattern signals
* Frontend — applicant and lender product experience
* API — integration boundary between the product and backend modules
