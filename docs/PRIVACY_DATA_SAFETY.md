# Data Integrity, Privacy & Wildlife Safety Architecture

## 1. Zero Cloud Egress by Default
WildLens AI was engineered from the ground up for total privacy and zero external tracking:
- **No Third-Party APIs:** We do not proxy images to closed AI providers (OpenAI, Anthropic, Google, etc.).
- **No User Account Requirement:** You do not need to register, provide an email address, or log in to use identification, field mode, or the journal.
- **Local Storage Exclusively:** All observations and notes are stored inside the browser's IndexedDB engine on your device.
- **No Precise Automatic Geolocation:** The app does not query or track device GPS sensors. If a user wishes to note a general trail name (e.g., "North Ridge Trail"), it is entered manually as a text string.

---

## 2. Safe Image Decoding & Input Hardening
To prevent security vulnerabilities from untrusted file uploads:
1. **Pillow Two-Pass Verification:** Incoming byte streams are first verified with `PIL.Image.verify()` to validate headers without decompressing pixel payloads.
2. **Dimension Guards:** Images smaller than 10x10 px or larger than 8000x8000 px are rejected or clamped to protect against decompression bomb attacks.
3. **Payload Clamping:** Hard limit of 15 MB per upload enforced at both FastAPI backend and Vite frontend.
4. **MIME Whitelist:** Strictly permits `image/jpeg`, `image/png`, and `image/webp`. Executable files, scripts, or SVG XML payloads are rejected with HTTP 400.

---

## 3. Touch Grass Wildlife Safety & Ethics
Outdoor nature exploration must respect wild organisms:
- **Do Not Harass or Pursue:** Maintain a respectful distance (minimum 20 feet from birds, reptiles, and mammals).
- **No Foraging Advice on Fungi:** Fungi predictions always carry explicit toxic warnings: *Never consume wild mushrooms based on computer vision identification.*
- **Leave No Trace:** Observe leaves while attached to living plants; do not strip bark or destroy vegetation.
- **Screen Detachment:** The primary goal of the app is to confirm the specimen and encourage looking at the living subject rather than remaining screen-locked.
