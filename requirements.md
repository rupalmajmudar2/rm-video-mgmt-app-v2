Awesome—rolled everything together into a single, Cursor-ready `requirements.md`, with:

* The **MediaSource** abstraction + OO validation via `source.validate()` (your style).
* **VideoTapes** as the first source with `tape_number` on `media` (required/unique only for VideoTape).
* Clean, normalized (not over-normalized) schema.
* Phased plan incl. **Phase 3: Synology NAS migration** item.
* TDD-oriented acceptance criteria, API surface, and dev guardrails.

You can paste this directly into Cursor.

---

# Video-Photo Consolidation Tool

## 1. Summary

A **web-based gallery** for family & friends to log in and view photos/videos stored on a **Synology DS224+ NAS**.
Targets: **iPhone**, **Android**, **Sony Android TV**, and **modern browsers**.
Goals: **simplicity**, **non-tech-friendly UX**, **multi-device compatibility**.
Sources: Manual updates from Video-tapes, thereafter iCloud and Google photos

---

## 2. Target Users

* **Admin / Maintainer** — full content + user management.
* **Family & Friends** — authenticated viewing, tagging, commenting.
* **Guests** *(future)* — optional limited viewing.

---

## 3. Core Features

### 3.1 Content Management (Admin)

* Secure admin login.
* Upload via **drag-and-drop** or file picker.
* **Duplicate prevention** (hash; filename/size precheck).
* **Rename / Delete** media.
* Persist users, roles/permissions, tags, comments, media metadata in **MySQL**.

### 3.2 Viewing

* Authenticated login for family/friends.
* **Gallery** with thumbnails + list, **lightbox** preview.
* Filters: **date**, **tag**, **source** (VideoTape / iCloud / Google / GuestUpload / UserUpload).
* **Tags**: users add/remove own; admin manage all.
* **Comments**: users add/remove own; admin manage all.
* Tags & comments visible **inline** and in **detail** views.

### 3.3 User Management

* Multi-user login & **self-onboarding** (name, phone, email).
* Admin email notifications for: new users, new comments/tags, new uploads.
* Admin can remove any media/text/tag, **block / delete** users.

---

## 4. Sources & Ingestion (Phased)

### Phase 1 — **VideoTapes (initial source)**

* Admin uploads digitized videos from \~50 tapes.
* Each **VideoTape** media includes: **tape\_number** *(required & unique among VideoTape items)*, title, date (captured\_at), description, tags.
* UI:

  * Upload form shows **Tape Number** when source = VideoTape (required).
  * Gallery cards show **Tape # badge**; filter by **Tape Number**.
  * Show also the description if provided

### Phase 2 — **Cloud & TV**

* **iCloud**: import photos/videos + metadata; start with latest 5 videos; admin can fetch more; weekly auto-download on NAS.
* **Google Photos/Drive**: import parity with iCloud.
* **Extended Uploads**: allow selected non-admins to upload; prompt for date/time, initial tags/comments.
* **TV Slideshow**: random playback (video 20s, photo 5s; configurable).

### Phase 3 — **Synology Migration & Ops**

* Package & deploy to Synology DS224+ (containerized services).
* Confirm DB engine (MySQL 8 vs. MariaDB 10) and apply any **DB-specific migration/enforcement** (e.g., triggers vs. generated columns).
* NAS job for weekly iCloud/Google sync.
* Backup/restore strategy for DB + media volumes.

---

## 5. Tech Stack

* **Frontend**: Next.js (React + TypeScript)
* **Styling**: Tailwind CSS
* **Backend**: Python (FastAPI)
* **Database**: MySQL
* **Testing**: TDD (test-first, unit + integration)
* **VCS**: Git

---

## 6. UI/UX Guidelines

* Minimal, accessible UI; responsive (mobile/TV/desktop).
* **Sidebar**: filters (date, tag, source, Tape Number).
* **Lightbox** for fullscreen previews; range requests for video.
* Clear moderation affordances for admin.

---

## 7. Architecture & Coding Guidelines

### 7.1 Clean OO Design (your style)

* **Abstractions**: `MediaSource` base class with concrete subclasses:

  * `VideoTapeSource`, `ICloudSource`, `GooglePhotosSource`, `GoogleDriveSource`, `GuestUploadSource`, `UserUploadSource`.
* Each subclass implements:

  * `validate(media_dto)` — e.g., **VideoTape** requires `tape_number`; others **forbid** it.
  * Optional `normalize(media_dto)` — e.g., trim/lowercase tags, null-out empty tape numbers.
  * Optional `hydrate(metadata)` — provider-specific mapping (e.g., EXIF, iCloud IDs).
* **Service Layer**: `MediaService`, `TagService`, `CommentService`, `AuthService`, `NotificationService`.
* **Repositories** for DB access; dependency injection for testability.
* **No statics** for mutable collaborators; prefer **instances** and interfaces.

### 7.2 General Principles

* Object-Oriented code. Abstraction, encapsulation, composition; minimal duplication.
* Small, coherent modules; clear boundaries.
* Explicit DTOs for API; strict validation.
* Cursor prompts should point to these structures to generate consistent scaffolds.

---

## 8. User Stories & Acceptance Criteria

### VideoTapes Ingestion

* *As an admin, I can upload VideoTape media with a Tape Number.*

  * ✅ `tape_number` **required** when source = VideoTape.
  * ✅ `tape_number` **unique** among VideoTape items.
  * ✅ Gallery shows **Tape #** and filter by **Tape Number**.

### Upload (General)

* *As an admin, I can upload photos/videos and see them in the gallery.*

  * ✅ Duplicate prevention via `content_hash`.
  * ✅ Stored on NAS; metadata in DB.

### Viewing & Filters

* *As a user, I can browse and filter by date, tag, source, and tape number (for VideoTape).*

  * ✅ Combined filters work (e.g., Source=VideoTape + Tag=Family).

### Tags & Comments

* *As a user, I can add/remove my own tags/comments; as admin, I can manage all.*

  * ✅ Shown inline + detail view.

### User Onboarding

* *As a new user, I can self-register (name, email, phone).*
* *As admin, I’m notified and can approve/block.*

### TV Slideshow (Phase 2)

* *As a user/admin, I can run a randomized slideshow with configurable durations.*

  * ✅ Only `status='READY'` media are included.

---

## 9. API Surface (initial)

**Auth**

* `POST /auth/register` — name, email, phone, password (pending approval optional)
* `POST /auth/login` — tokens; `POST /auth/refresh`; `POST /auth/logout`

**Media**

* `GET /media` — filters: `date_from`, `date_to`, `tag_ids[]`, `source`, `tape_number`
* `POST /media` *(ADMIN; selected USERS)* — body:
  `kind`, `title?`, `description?`, `captured_at?`, `tags[]?`, `source_kind`, `tape_number?`, `source_ref?`
* `GET /media/{id}`
* `PATCH /media/{id}` — rename, visibility, notes, captured\_at, etc.
  *(If VideoTape, `tape_number` remains required & unique)*
    *(If VideoTape, `description` (or comments) from the tape-data)*
* `DELETE /media/{id}` — soft delete

**Tags**

* `POST /media/{id}/tags` — add (user-owned)
* `DELETE /media/{id}/tags/{tag_id}` — delete (own vs admin)

**Comments**

* `POST /media/{id}/comments`
* `PATCH /comments/{id}` — edit own
* `DELETE /comments/{id}` — delete own; admin can delete any

**Assets**

* `GET /media/{id}/assets` — thumbnails/previews

**Slideshow (Phase 2)**

* `GET /slideshow?source=…&limit=…` — returns randomized list with durations

**Admin**

* `GET /admin/users` — list; `PATCH /admin/users/{id}` — block/unblock/role
* `GET /admin/notifications` — queue status
* **Imports** (Phase 2): `POST /imports/run`, `GET /imports?run_id=…`

---

## 10. Database Schema (MySQL)

> ORM: SQLAlchemy. UTC timestamps. `id` = BIGINT PK.
> **Normalization**: just enough; `tape_number` lives on `media` (no separate tapes table).

### 10.1 Entities & Relationships

* `users` —< `sessions`
* `users` —< `media` (uploader)
* `media` —< `comments`
* `media` —< `media_assets`
* `media` —<> `tags` via `media_tags`
* `users` —< `comments`
* `users` —< `notifications`
* `imports` linked to `media` via `source_ref` (cloud)

### 10.2 Tables

#### `media_sources`

* `id` BIGINT PK
* `kind` ENUM('VIDEOTAPE','ICLOUD','GOOGLE\_PHOTOS','GOOGLE\_DRIVE','GUEST\_UPLOAD','USER\_UPLOAD') **UNIQUE NOT NULL**
* `name` VARCHAR(120) NOT NULL
* `created_at` DATETIME NOT NULL

*(Seed one row per kind.)*

#### `media`  *(tape\_number lives here)*

* `id` BIGINT PK
* `kind` ENUM('PHOTO','VIDEO') NOT NULL
* `title` VARCHAR(255) NULL
* `description` TEXT NULL
* `storage_path` VARCHAR(1024) NOT NULL
* `filename` VARCHAR(255) NOT NULL
* `ext` VARCHAR(16) NOT NULL
* `byte_size` BIGINT UNSIGNED NOT NULL
* `content_hash` CHAR(64) NOT NULL **UNIQUE**
* `duration_sec` INT UNSIGNED NULL
* `width` INT UNSIGNED NULL
* `height` INT UNSIGNED NULL
* `captured_at` DATETIME NULL
* `uploaded_by` BIGINT FK → users(id)
* `source_id` BIGINT FK → media\_sources(id) **NOT NULL**
* `tape_number` VARCHAR(32) **NULL**

  > **Required & unique among VideoTape items; NULL for other sources**
* `source_ref` VARCHAR(255) NULL  *(e.g., iCloud/Google external id)*
* `visibility` ENUM('PRIVATE','LINK','AUTHED') NOT NULL DEFAULT 'AUTHED'
* `status` ENUM('READY','PROCESSING','FAILED') NOT NULL DEFAULT 'READY'
* `notes` TEXT NULL
* `created_at` DATETIME NOT NULL
* `updated_at` DATETIME NOT NULL
* `deleted_at` DATETIME NULL

**Indexes**

* `idx_media_source (source_id)`
* `idx_media_captured_at (captured_at)`
* `idx_media_status (status)`
* `idx_media_deleted_at (deleted_at)`
* `idx_media_tape_number (tape_number)`

> **Conditional rules (enforced in code via OO validation):**
>
> * If `source.kind == 'VIDEOTAPE'` ⇒ `tape_number` **required** and **unique** among VideoTape items.
> * Else ⇒ `tape_number` **must be NULL** (normalize empty to NULL).

#### `tags`

* `id` BIGINT PK
* `name` VARCHAR(64) **UNIQUE** (case-insensitive collation)
* `created_at` DATETIME NOT NULL

#### `media_tags` (junction)

* `media_id` BIGINT PK part, FK → media(id) ON DELETE CASCADE
* `tag_id` BIGINT PK part, FK → tags(id) ON DELETE CASCADE
* `created_by` BIGINT FK → users(id)
* `created_at` DATETIME NOT NULL

#### `comments`

* `id` BIGINT PK
* `media_id` BIGINT FK → media(id) ON DELETE CASCADE
* `user_id` BIGINT FK → users(id)
* `body` TEXT NOT NULL
* `created_at` DATETIME NOT NULL
* `updated_at` DATETIME NOT NULL
* `deleted_at` DATETIME NULL

#### `media_assets`

* `id` BIGINT PK
* `media_id` BIGINT FK → media(id) ON DELETE CASCADE
* `asset_type` ENUM('THUMBNAIL','PREVIEW','TRANSCODE','SUBTITLE') NOT NULL
* `storage_path` VARCHAR(1024) NOT NULL
* `mime_type` VARCHAR(127) NOT NULL
* `width` INT UNSIGNED NULL
* `height` INT UNSIGNED NULL
* `duration_sec` INT UNSIGNED NULL
* `quality_label` VARCHAR(32) NULL
* `status` ENUM('READY','PROCESSING','FAILED') NOT NULL DEFAULT 'READY'
* `created_at` DATETIME NOT NULL
* `updated_at` DATETIME NOT NULL

#### `users`

* `id` BIGINT PK
* `role` ENUM('ADMIN','USER','GUEST') NOT NULL DEFAULT 'USER'
* `email` VARCHAR(255) **UNIQUE NOT NULL**
* `phone` VARCHAR(32) NULL
* `name` VARCHAR(120) NOT NULL
* `password_hash` VARCHAR(255) NOT NULL
* `is_blocked` TINYINT(1) NOT NULL DEFAULT 0
* `created_at` DATETIME NOT NULL
* `updated_at` DATETIME NOT NULL
* `deleted_at` DATETIME NULL

#### `sessions`

* `id` BIGINT PK
* `user_id` BIGINT FK → users(id) ON DELETE CASCADE
* `refresh_token_hash` CHAR(64) **UNIQUE NOT NULL**
* `user_agent` VARCHAR(255) NULL
* `ip` VARBINARY(16) NULL
* `created_at` DATETIME NOT NULL
* `expires_at` DATETIME NOT NULL
* `revoked_at` DATETIME NULL

#### `notifications`

* `id` BIGINT PK
* `recipient_user_id` BIGINT FK → users(id)
* `event_type` ENUM('USER\_CREATED','MEDIA\_UPLOADED','COMMENT\_ADDED','TAG\_ADDED') NOT NULL
* `payload_json` JSON NOT NULL
* `status` ENUM('PENDING','SENT','FAILED') NOT NULL DEFAULT 'PENDING'
* `created_at` DATETIME NOT NULL
* `sent_at` DATETIME NULL
* `error_msg` VARCHAR(255) NULL

#### `imports` *(Phase 2; cloud runs)*

* `id` BIGINT PK
* `source` ENUM('ICLOUD','GOOGLE\_PHOTOS','GOOGLE\_DRIVE') NOT NULL
* `external_id` VARCHAR(255) NULL
* `media_id` BIGINT FK → media(id)
* `run_id` VARCHAR(64) NOT NULL
* `status` ENUM('PENDING','IMPORTED','SKIPPED\_DUP','FAILED') NOT NULL
* `message` VARCHAR(255) NULL
* `created_at` DATETIME NOT NULL
* `updated_at` DATETIME NOT NULL

#### `audit_logs`

* `id` BIGINT PK
* `actor_user_id` BIGINT FK → users(id)
* `action` VARCHAR(64) NOT NULL  *(e.g., DELETE\_MEDIA, BLOCK\_USER)*
* `target_table` VARCHAR(64) NOT NULL
* `target_id` BIGINT NOT NULL
* `delta_json` JSON NULL
* `created_at` DATETIME NOT NULL

---

## 11. Validation & Enforcement

### 11.1 OO Source Validation

* `MediaSource.validate(dto)` is called by `MediaService` on create/update:

  * **VideoTapeSource**: requires `tape_number` (non-empty); ensures uniqueness among VideoTape items.
  * **Other sources**: assert `tape_number is None` (normalize empty → None).
* `MediaService` also enforces `content_hash` uniqueness and MIME allowlist.

### 11.2 Security

* Passwords: **Argon2id** (or bcrypt w/ strong cost).
* Store only **hashes** of refresh tokens.
* Validate MIME by sniffing + extension allowlist.
* Serve media via **authenticated proxy** or signed URLs (no direct NAS exposure).
* Rate-limit auth endpoints; log admin actions to `audit_logs`.


---

## 12. Performance & Ops

* Generate thumbnails/previews into `media_assets` via worker (Celery/RQ).
* HTTP **range requests** for video playback.
* TV mode: app-level randomization (avoid `ORDER BY RAND()` on large sets).
* Consider NAS path strategy like `/volume1/media/{yyyy}/{mm}/{content_hash[:2]}/{content_hash}.{ext}`.

---

## 13. TDD — High-Value Tests

**VideoTape rules**

* Create VideoTape media **without** `tape_number` ⇒ **400**.
* Create non-VideoTape media **with** `tape_number` ⇒ **400** (normalize/remove).
* Two VideoTape media with same `tape_number` ⇒ **409**.
* Changing source from VideoTape → other requires clearing `tape_number`.

**Duplicates**

* Upload with existing `content_hash` ⇒ **409**.

**Permissions**

* Non-admin cannot delete others’ tags/comments; admin can.
* Blocked user cannot log in or create content; existing sessions revoked.

**Filtering**

* `GET /media?source=VIDEOTAPE` ⇒ only items with source=VideoTape.
* `GET /media?source=VIDEOTAPE&tape_number=XYZ` ⇒ exact match.
* Tag filter joins performant (indexes present).

**Slideshow (Phase 2)**

* Only `status='READY'` items; respects configured durations.

---

## 14. Config & Defaults

Optional `system_settings` (key/value JSON):

* `playback_defaults`: `{"video_clip_sec":20,"photo_slide_sec":5}`
* `uploads`: `{"max_mb":2048,"allowed_ext":[".mp4",".mov",".jpg",".png",".heic"]}`
* `features`: `{"user_uploads":false,"guest_view":false}`

Seed: one **admin user**, `media_sources` kinds, sensible settings.

---

## 15. Dev Notes for Cursor

* Generate:

  * SQLAlchemy models & Alembic migrations (Phase 1 tables).
  * Source polymorphism (`MediaSource` + subclasses) with `validate()`.
  * Next.js pages: login, gallery, media detail, upload (VideoTape shows Tape Number), tags/comments.
  * API routers per section 9.
  * Tests per section 13 (pytest).
* Keep code **clean OO**: services + repositories; DI; no statics for mutable deps.
