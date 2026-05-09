# AgriSync — Bug Report

**Author:** Allan  
**Role:** Backend QA Engineer  
**Date:** May 2026  
**Status:** Updated after full test suite run

---

## How to Read This Report

| Severity    | Meaning                                   |
| ----------- | ----------------------------------------- |
| 🔴 Critical | Causes a 500 server crash or data loss    |
| 🟡 Medium   | Wrong output or missing data but no crash |
| 🟢 Low      | Minor issue, cosmetic, or edge case       |

---

## Bugs Found

### 🔴 BUG-001 — `/analyze` returns 500 for unknown crop

- **Location:** `app/routers/pipeline.py`
- **Steps to reproduce:** POST `/analyze` with `crop: "Durian"` (not in database)
- **Expected:** HTTP 404 with message "Crop not found"
- **Actual:** HTTP 500 Internal Server Error
- **Root cause:** The arbitrage agent raises `ValueError` for unknown crops but
  the `/analyze` router only catches generic `Exception` and wraps it as 500.
  The `/arbitrage` router correctly catches `ValueError` and returns 404.
- **Recommended fix:** Add `ValueError` handling in `pipeline.py`:

```python
  except ValueError as exc:
      raise HTTPException(status_code=404, detail=str(exc))
```

- **Severity:** 🔴 Critical — judges will likely test unknown crops

---

## Warnings (Non-Critical)

🟢 **Pydantic V2 class-based config deprecation**

- **Location:** `app/config.py`, `app/schemas/models.py`
- **Details:** `class Config` inside Pydantic models is deprecated in V2 — should use `ConfigDict` instead
- **Impact:** None — works perfectly, just a future-facing warning
- **Recommended fix:** Replace `class Config` with `model_config = ConfigDict(...)`

🟢 **CrewAI internal deprecation warnings**

- **Location:** `crewai` library internals
- **Details:** Several deprecation warnings from `crewai/agent/core.py` and `crewai/crew.py`
- **Impact:** None — library internals, not our code

---

## Schema Mismatches

✅ No schema mismatches found. Pydantic validation behaved correctly
across all endpoints — missing fields returned 422, invalid types
were rejected cleanly.

---

## Missing Seed Data

✅ No unexpected KeyErrors found. Unknown crops are handled gracefully
by the arbitrage agent via ValueError (documented in BUG-001 above).

---

## Test Summary

| Test File            | Tests  | Passed | Failed |
| -------------------- | ------ | ------ | ------ |
| `test_agents.py`     | 10     | 10     | 0      |
| `test_api.py`        | 30     | 30     | 0      |
| `test_edge_cases.py` | 10     | 10     | 0      |
| **Total**            | **50** | **50** | **0**  |

---

## Notes

- All tests run with `USE_MOCK_VISION=true` — no real GPU required
- AMD cloud validation results will be added after Liam provisions the node
- See `tasks/AMD_CLOUD_TEST_REPORT.md` for cloud-specific results once available
