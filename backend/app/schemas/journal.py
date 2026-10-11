from typing import List, Optional

from pydantic import BaseModel, Field


class JournalObservation(BaseModel):
    id: str = Field(..., description="Unique client observation identifier")
    common_name: str
    scientific_name: str
    family: str
    kingdom: Optional[str] = "Plantae"
    photo_url: Optional[str] = ""
    date: Optional[str] = ""
    timestamp: int
    last_modified: Optional[int] = Field(None, description="Timestamp ms of latest edit for sync conflict resolution")
    location: Optional[str] = "Field Trail Observation"
    certainty: Optional[int] = 0
    status: Optional[str] = "User verified"
    notes: Optional[str] = ""
    diagnostic_traits: Optional[List[str]] = None
    elevation: Optional[str] = ""
    habitat: Optional[str] = ""
    exposure: Optional[str] = ""


class JournalSyncRequest(BaseModel):
    client_id: Optional[str] = Field("browser-client", description="Identifier for client sync queue")
    observations: List[JournalObservation] = Field(default_factory=list, description="Pending observations from client")


class JournalSyncResponse(BaseModel):
    status: str = "success"
    synced_count: int
    server_observations: List[JournalObservation] = Field(default_factory=list)
    message: str = "Journal synchronization completed."
