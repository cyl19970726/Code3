# Data Model

**Feature**: 004-build-a-file-upload-system-where-users-can-upload-

---

## File

**Fields**:
- id: UUID
- filename: string
- size: number
- mime_type: string
- upload_date: timestamp

**Validations**:
- File must have valid id

---

## Notification

**Fields**:
- id: UUID
- name: string
- created_at: timestamp
- updated_at: timestamp

**Validations**:
- Notification must have valid id

---

