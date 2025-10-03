# Data Model

**Feature**: 006-build-a-scalable-admin-dashboard-where-admins-can-

---

## Email

**Fields**:
- id: UUID
- name: string
- created_at: timestamp
- updated_at: timestamp

**Validations**:
- Email must have valid id

---

## Password

**Fields**:
- id: UUID
- name: string
- created_at: timestamp
- updated_at: timestamp

**Validations**:
- Password must have valid id

---

## Profile

**Fields**:
- id: UUID
- filename: string
- size: number
- mime_type: string
- upload_date: timestamp

**Validations**:
- Profile must have valid id

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

