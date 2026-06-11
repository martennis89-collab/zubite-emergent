# Zubite — Internal Daily Pilot Checklist

Last updated: June 2026. Run this once per business day during the controlled pilot.
ETA: ~5 minutes if there are no incidents.

---

## 1. Booking funnel review (Admin → Онлайн заявки)

URL: `https://zubite.bg/admin/online-orientation-bookings`

### A. Pending too long (≥12h old)
* Filter: status = `pending_clinic_confirmation`
* Sort by `created_at` ascending.
* Any row older than 12h → ping the clinic directly (phone/email outside the platform) to nudge confirmation, OR use admin override `Освободи слота` if patient signal is bad/expired.
* Expected behaviour: most pendings should resolve within 24h via lazy expiry.

### B. Just expired (last 24h)
* Filter: status = `expired_pending_confirmation`
* Each one means the clinic missed the 24h window.
* If pattern repeats for the same clinic → flag a 1:1 with that clinic.
* Patient already received the "не беше потвърден навреме" email — no manual follow-up needed unless they reach out.

### C. Confirmed but no movement
* Filter: status = `confirmed_by_clinic`
* If `clinic_confirmed_at` is older than the slot's `scheduled_at` + 1 day and status is still `confirmed_by_clinic` → likely clinic forgot to mark `completed` or `no_show`. Send a gentle nudge.

### D. Care Pass unlocks
* In the lead admin (or via audit log) check rows with `care_pass_unlocked=true` from the last 24h.
* For each: verify `consultation_type`, `care_pass_source`, `care_pass_unlocked_at` look sane.
* If you see an unlock without a matching confirmed booking → escalate to dev (helper invariant broken).

### E. No-shows / not-suitable / converted
* Check counts per clinic for the day.
* These are reporting marks, NOT penalties. If one clinic has >2 no-shows in a single day → may indicate slot density issues; review their availability windows.

## 2. Notification health

For each new booking from the last 24h:
* `notifications_sent` should include the matching status at least once.
* If `notifications_sent` is empty but the booking transitioned away from `pending`, check `RESEND_API_KEY` is still set + check the audit log for `booking_status_notification_failed` events.

## 3. Manual follow-up queue

A booking lands in the manual-follow-up queue if any of:
* `pending_clinic_confirmation` for ≥18h with no clinic response
* `expired_pending_confirmation` AND the patient has only 1 historical booking ever
* `cancelled_by_clinic` from the same patient twice in a row
* `no_show` with quiz `band=RED` (high-risk segment) — gentle outreach worth it

Manual outreach uses phone/email from the admin lead detail. Never expose this information to clinics outside their own bookings.

## 4. Operational sanity (≤30s)

* Backend up: `curl -s https://zubite.bg/api/admin/online-orientation-bookings -o /dev/null -w "%{http_code}\n"` should be 401 (auth required) or 200 (with admin session). 502/503 = call dev.
* Audit log has events for the day (filter recent in admin audit panel).
* No spike of `care_pass_unlock_failed_*` events.

## 5. Weekly aggregate (Mondays)

Quick numbers worth eye-balling weekly until we build dashboards:
* total leads with `contact_details_submitted=true` (Phase B conversion)
* total bookings created (Phase E conversion)
* total `confirmed_by_clinic` (Phase F success)
* total `care_pass_unlocked` (should == confirmed count)
* funnel drop-offs by step

If you want a quick MongoDB pulse:
```js
db.leads.countDocuments({contact_details_submitted: true, created_at: {$gte: "2026-..." }})
db.online_orientation_bookings.aggregate([
  {$match: {created_at: {$gte: "2026-..."}}},
  {$group: {_id: "$status", n: {$sum: 1}}}
])
```

## 6. Things we should NOT be doing in the pilot

* Sending bulk reminder emails (Phase G — not built yet).
* Showing patient phone/email to anyone except the owning clinic & admin.
* Blocking patients on no-show (Phase H scope change — explicitly NOT implemented).
* Auto-rebooking on behalf of patients.
* Pushing slots through the homepage / public clinic profiles.

## 7. Incident response

If a clinic reports a bug:
1. Reproduce in the admin booking detail panel (status history is the source of truth).
2. Check the audit log for the booking_id.
3. If reproducible → file a ticket in the internal tracker; do NOT patch directly during pilot.
4. Update the affected clinic on workaround within ≤2 hours.

If patient complains about email content:
1. Pull the booking's `status_history` to confirm which template was sent.
2. Cross-check copy in `backend/routers/orientation_bookings.py::_PATIENT_NOTIFICATIONS`.
3. If copy is wrong → fix and redeploy; if behaviour is wrong → escalate.

---

**End-of-pilot review:** after ~2 weeks compile aggregate numbers + 3 most-frequent
clinic complaints + 3 most-frequent patient complaints → that drives the Phase G
priorities (reminders / dashboards / dedup-on-anonymous).
