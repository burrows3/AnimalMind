# Repurpose Engine Scheduling

This engine is research-only. It does not provide treatment advice.

## Linux / VM (cron)

Run daily at 01:30:
```
30 1 * * * ~/AnimalMind/scripts/run-repurpose.sh >> ~/AnimalMind/memory/repurpose.log 2>&1
```

## Windows (Task Scheduler)

1. Create a new task named `AnimalMind Repurpose`.
2. Action: `scripts\run-repurpose.cmd`
3. Schedule: daily (or weekly).

Outputs:
- `memory/repurpose/signals.json`
- `docs/repurpose/signals.json`
- `public/repurpose/signals.json`
