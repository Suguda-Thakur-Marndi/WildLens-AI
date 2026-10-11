import asyncio

from app.schemas.journal import JournalObservation
from app.services.gemini_service import GeminiService
from app.services.journal_service import JournalSyncService


def test_gemini_service_status_when_unconfigured(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "gemini_api_key", "")
    service = GeminiService()

    status = asyncio.run(service.get_status())
    assert status.configured is False
    assert status.status == "unconfigured"
    assert "not configured" in status.message.lower()


def test_journal_sync_service_deduplication_and_conflict_resolution():
    service = JournalSyncService()
    service._storage.clear()

    # Client syncs first version of observation
    obs_v1 = JournalObservation(
        id="obs-robin-001",
        common_name="American Robin",
        scientific_name="Turdus migratorius",
        family="Turdidae",
        timestamp=1000,
        last_modified=1000,
        notes="First spotted in oak tree",
    )
    res1 = service.sync_observations([obs_v1])
    assert res1.synced_count == 1
    assert len(res1.server_observations) == 1
    assert res1.server_observations[0].notes == "First spotted in oak tree"

    # Client syncs duplicate observation with older last_modified - should NOT overwrite
    obs_older = JournalObservation(
        id="obs-robin-001",
        common_name="American Robin",
        scientific_name="Turdus migratorius",
        family="Turdidae",
        timestamp=1000,
        last_modified=500,
        notes="Older stale note",
    )
    res2 = service.sync_observations([obs_older])
    assert len(res2.server_observations) == 1
    assert res2.server_observations[0].notes == "First spotted in oak tree"

    # Client syncs newer edit with higher last_modified - SHOULD update without duplicating
    obs_v2 = JournalObservation(
        id="obs-robin-001",
        common_name="American Robin",
        scientific_name="Turdus migratorius",
        family="Turdidae",
        timestamp=1000,
        last_modified=2000,
        notes="Observed foraging for earthworms after rain",
    )
    res3 = service.sync_observations([obs_v2])
    assert res3.synced_count == 1
    assert len(res3.server_observations) == 1  # Never duplicate!
    assert res3.server_observations[0].notes == "Observed foraging for earthworms after rain"
