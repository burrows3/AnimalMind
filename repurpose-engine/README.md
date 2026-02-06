# Veterinary Drug Repurpose Engine (Animal Mind)

This module builds research-only repurpose signals for veterinary medicine.
It is not a clinical recommendation tool. All outputs are hypotheses with
evidence trails and disclaimers.

## What it does
- Ingests public literature and trial data (connectors are modular).
- Normalizes entities (drug, species, condition).
- Extracts failure reasons, species rationale, vet evidence, and risk flags.
- Synthesizes RepurposeSignals with deterministic summaries.
- Publishes JSON for API + UI consumption.

## How to run
```bash
node scripts/repurpose-run.js
```

Outputs (default):
- memory/repurpose/signals.json
- memory/repurpose/signals/<signal_id>.json
- docs/repurpose/signals.json
- docs/repurpose/signals/<signal_id>.json

## Fixtures
Example signals live in:
repurpose-engine/fixtures/signals/
These are synthetic and for pipeline validation only.

## Safety
All outputs include:
- "Research hypothesis only; not medical advice."
- No dosing instructions
- No efficacy/safety claims
