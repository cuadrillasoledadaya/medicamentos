# Report Export Domain Specification

## Purpose

Defines PDF report generation (client-side via `@react-pdf/renderer`) and share-link generation (Supabase Storage signed URL with 7-day TTL).

---

## Requirements

### Requirement: PDF Report Content

The client-side PDF renderer SHALL generate a report containing:

1. Paciente info: name, date of birth, timezone
2. Active medications list: name, dose, unit, route, frequency
3. Active schedules list: time, weekdays, timezone
4. Tomas table for a user-specified date range: date, medication, scheduled time, status, taken-at time, notes
5. Adherence chart: daily adherence percentage over the date range (derived from `tomas` table)

#### Scenario: Generate PDF for date range

- GIVEN a cuidador selects date range "01 May 2026 – 31 May 2026"
- WHEN the PDF is generated
- THEN it SHALL include all tomas within that range for the selected paciente
- AND it SHALL include a daily adherence chart for the same range

### Requirement: Share Link Generation

The system SHALL generate a shareable JSON data URL (not a PDF file) via Supabase Storage signed URL with a 7-day TTL. The JSON payload contains the same data as the PDF (paciente info, medications, schedules, tomas, adherence chart data).

#### Scenario: Generate share link

- GIVEN a cuidador requests a share link for a date range
- WHEN the link is generated
- THEN the system SHALL upload a JSON blob to Supabase Storage
- AND generate a signed URL with `ExpiresIn = 7 days`
- AND return the URL to the client for sharing (e.g., via WhatsApp or email to a physician)

### Requirement: Share Link Access

The signed URL SHALL grant read access to anyone with the link, without requiring Supabase authentication. The physician receiving the link SHALL be able to view the JSON data in a simple in-app viewer without installing the PWA.

#### Scenario: Physician accesses share link

- GIVEN a physician receives a signed URL via email
- WHEN they open the URL in a browser
- THEN the in-app viewer SHALL display the reporte data without requiring login
- AND the link SHALL expire after 7 days
