import json
import logging
import threading
from typing import Dict, List, Optional

from app.core.config import PROJECT_ROOT
from app.schemas.journal import JournalObservation, JournalSyncResponse

logger = logging.getLogger("wildlens.journal")


class JournalSyncService:
    _instance: Optional["JournalSyncService"] = None

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._storage: Dict[str, JournalObservation] = {}
        self._storage_file = PROJECT_ROOT / "scratch" / "journal_server_store.json"
        self._load()

    @classmethod
    def get_instance(cls) -> "JournalSyncService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load(self) -> None:
        try:
            if self._storage_file.exists():
                with open(self._storage_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data:
                        obs = JournalObservation(**item)
                        self._storage[obs.id] = obs
                logger.info(f"Loaded {len(self._storage)} journal observations from server storage.")
        except Exception as e:
            logger.warning(f"Could not load journal storage file: {e}")

    def _save(self) -> None:
        try:
            self._storage_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self._storage_file, "w", encoding="utf-8") as f:
                json.dump([obs.model_dump() for obs in self._storage.values()], f, indent=2)
        except Exception as e:
            logger.warning(f"Could not save journal storage file: {e}")

    def sync_observations(self, incoming: List[JournalObservation]) -> JournalSyncResponse:
        """
        Synchronizes incoming client observations with server storage:
        - Resolves conflicts by checking last_modified / timestamp (newer edit wins)
        - Prevents duplicates by matching unique observation ID
        - Returns combined collection of all observations
        """
        with self._lock:
            synced_count = 0
            for item in incoming:
                existing = self._storage.get(item.id)
                if existing is None:
                    self._storage[item.id] = item
                    synced_count += 1
                else:
                    item_mod = item.last_modified or item.timestamp
                    exist_mod = existing.last_modified or existing.timestamp
                    if item_mod >= exist_mod:
                        self._storage[item.id] = item
                        synced_count += 1

            if synced_count > 0:
                self._save()

            server_items = sorted(
                list(self._storage.values()),
                key=lambda o: o.last_modified or o.timestamp,
                reverse=True,
            )

            return JournalSyncResponse(
                status="success",
                synced_count=synced_count,
                server_observations=server_items,
                message=f"Synced {synced_count} observations. Total on server: {len(server_items)}.",
            )

    def get_all(self) -> List[JournalObservation]:
        with self._lock:
            return sorted(
                list(self._storage.values()),
                key=lambda o: o.last_modified or o.timestamp,
                reverse=True,
            )


journal_sync_service = JournalSyncService.get_instance()
