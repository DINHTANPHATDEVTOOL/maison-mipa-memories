# MAISON MIPA STUDIO OPERATIONS MODEL & RUNBOOK V2

## 1. Overview & Architectural Principles
Maison MIPA Studio Operations V2 transforms the studio booking lifecycle into a real-time, concurrency-safe workforce scheduling and equipment/prop resource reservation system.

- **Authoritative Data Authority**: All scheduling conflicts, leave approvals, and resource allocations are validated and enforced server-side via PostgreSQL functions and advisory locks.
- **Zero Client Guesswork**: Frontend calculations are never trusted for staff availability or serialized equipment reservations.
- **Strict Separation of Concerns**: Customer-facing endpoints are strictly isolated from internal staff rosters, equipment serial numbers, purchase prices, and damage histories.
- **Timezone Authority**: All business operations and timestamps adhere strictly to Vietnam Standard Time (`Asia/Ho_Chi_Minh`, UTC+7) using PostgreSQL `TIMESTAMPTZ`.

---

## 2. Workforce Availability & Scheduling Precedence

When determining whether an employee is available for a booking slot `[start_at, end_at]`, the system applies the following strict order of precedence:

1. **Approved Leave (`APPROVED` in `staff_leave_requests`)**: Highest precedence. If an employee has approved leave overlapping the interval, they are **UNAVAILABLE**.
2. **Explicit Temporary Unavailability (`staff_shifts` where `shift_type = 'UNAVAILABLE'`)**: Takes precedence over regular schedules.
3. **Confirmed Booking Assignment (`booking_assignments` for non-cancelled bookings)**: An employee assigned to an active booking is **BUSY**. Overlapping assignments are rejected by the database.
4. **Explicit Shift Assignment (`staff_shifts` where `shift_type != 'UNAVAILABLE'`)**: Overrides regular weekly working hours for that specific date.
5. **Regular Weekly Schedule (`staff_working_hours`)**: Standard recurring working hours per day of the week (0 = Sunday to 6 = Saturday). If marked `is_day_off = TRUE` or if the booking starts/ends outside working hours, the employee is off-duty.

Pending leave requests (`REQUESTED`) do **NOT** block assignments until officially approved by a Manager or Admin.

---

## 3. Concurrency Protection & Conflict Engine

### Staff Assignment Locking Strategy
To prevent double-booking when two managers concurrently assign the same staff member to overlapping sessions:
- The PostgreSQL RPC `assign_booking_staff_v2` acquires a transaction-level advisory lock:
  ```sql
  PERFORM pg_advisory_xact_lock(hashtext('staff_assign_' || p_employee_id::text));
  ```
- Any concurrent transaction attempting to assign the same employee will wait until the lock releases, then re-evaluate the active assignments and fail with `STAFF_ASSIGNMENT_CONFLICT`.

### Equipment Reservation Locking Strategy
- For serialized equipment (`is_serialized = TRUE`, e.g., cameras, lenses):
  ```sql
  PERFORM pg_advisory_xact_lock(hashtext('resource_lock_' || p_resource_id::text));
  ```
  The RPC validates that zero overlapping reservations exist in `booking_resource_reservations` (`status IN ('RESERVED', 'CHECKED_OUT')`).
- For quantity/consumable resources (`is_serialized = FALSE`, e.g., paper backdrops, battery packs, small props):
  The RPC computes `COALESCE(SUM(quantity), 0)` of all overlapping active reservations. If `current_reserved + requested_quantity > quantity_total`, the reservation fails with `INSUFFICIENT_RESOURCE_QUANTITY`.

---

## 4. Leave Management & Conflict Detection

Staff members can submit leave requests (`ANNUAL`, `SICK`, `PERSONAL`, `UNPAID`, `OTHER`).
When a Manager or Admin attempts to approve a leave request via `approve_staff_leave`:
1. **Self-Approval Prevention**: A staff member or manager cannot approve their own leave (`actor_id != employee_id`).
2. **Fail-Closed Assignment Conflict Check**: The RPC queries `booking_assignments` joined with active `bookings` within `[start_at, end_at]`.
   - If any active booking is found, the approval **FAILS CLOSED** with error code `LEAVE_CONFLICT_ACTIVE_BOOKINGS`, returning the conflicting booking code(s).
   - The Manager must explicitly reassign or remove the staff member from the affected booking(s) prior to approving the leave request.

---

## 5. Equipment & Prop Lifecycle

### Resource States
- `AVAILABLE`: Ready for booking reservation and checkout.
- `RESERVED`: Allocated to an upcoming confirmed booking.
- `IN_USE`: Checked out physically to a crew member for a shoot session.
- `MAINTENANCE`: Under scheduled servicing, cleaning, or calibration. Blocks new reservations.
- `DAMAGED`: Reported damaged during return or shoot. Unusable until repaired.
- `LOST`: Missing from inventory.
- `RETIRED`: Decommissioned from studio service.

### Cleaning States (Wardrobe & Textile Props)
- `AVAILABLE`: Laundered, pressed, and ready.
- `IN_USE`: In active shoot.
- `NEEDS_CLEANING`: Post-shoot return requiring laundry/dry cleaning. Item is not returned to `AVAILABLE` until marked clean.
- `CLEANING`: Currently with laundry service.

### Physical Handoff
- **Check-out (`checkout_booking_resource`)**: Authorized staff/manager issues the item to the assigned crew member, documenting `condition_before` and `actor_id`.
- **Return (`return_booking_resource`)**: Authorized staff/manager accepts the item upon shoot completion, recording `condition_after`. If marked damaged, an incident ticket is automatically created in `resource_incidents`, and the resource status transitions to `DAMAGED`.

---

## 6. Crew Requirements & Readiness States

Bookings calculate crew completeness dynamically:
- `CREW_READY`: All mandatory roles (Photographer, Makeup, etc.) per package requirements are fully assigned with zero conflicts.
- `CREW_INCOMPLETE`: One or more required roles are missing.
- `CREW_CONFLICT`: A staff member assigned to this booking has an overlap or approved leave.

Resource completeness operates analogously:
- `RESOURCE_READY`: Recommended camera body, lens, and lighting kits are reserved without conflict.
- `RESOURCE_INCOMPLETE`: Equipment requirements not yet fully met.
- `RESOURCE_CONFLICT`: A reserved item has entered maintenance or was reported damaged.

---

## 7. Operations Boards & Calendar

1. **Daily Operations Board ("Hôm nay")**:
   - Focuses on Front Desk & Studio readiness for today's date.
   - Highlights upcoming customer check-ins, active shoots, equipment checkout/return pending, and post-production editing due today.
2. **Tomorrow Prep Board ("Chuẩn bị ngày mai")**:
   - Verification checklist for tomorrow's bookings: Studio Room ✓, Photographer ✓, Makeup ✓, Equipment ✓, Props ✓, Customer Ack ✓, Drive Workspace ✓.
   - Surfaces any missing crew or unreserved equipment before the shoot day begins.
3. **Internal Operations Calendar**:
   - Aggregates Bookings, Staff Shifts, Staff Approved Leave, and Equipment Maintenance into a single unified calendar in `Asia/Ho_Chi_Minh`.
   - Managers can filter and toggle individual operational layers.

---

## 8. Role-Based Access Control (RBAC) Matrix

| Domain / Resource | Customer | Staff (Photo/Makeup/Edit) | Manager | Admin |
|:---|:---:|:---:|:---:|:---:|
| Staff Roster & Availability | BLOCKED | Own schedule only | Full read/write | Full read/write |
| Staff Leave Requests | BLOCKED | Create own / View own | Approve / Reject | Full management |
| Staff Assignment RPC | BLOCKED | BLOCKED | Execute | Execute |
| Equipment Inventory | BLOCKED | Assigned gear only | Full management | Full management |
| Purchase Costs & Serial Numbers | BLOCKED | BLOCKED | View / Edit | View / Edit |
| Equipment Checkout / Return | BLOCKED | View assigned / Acknowledge | Execute handoffs | Execute handoffs |
| Operations Calendar | BLOCKED | Assigned jobs only | Full view | Full view |
| Customer Booking Flow | Own booking | Assigned bookings | All bookings | All bookings |

---

## 9. Operations Runbook & Incident Protocols

### Scenario A: Staff Calls in Sick on Shoot Morning
1. Staff member or Manager files a `SICK` leave request in the Workforce tab.
2. If the employee has bookings scheduled for today, Manager opens the **Daily Operations Board** ("Hôm nay").
3. The affected booking displays `CREW_CONFLICT` / `CREW_INCOMPLETE`.
4. Manager opens the Booking Crew Planner, unassigns the sick staff member, and views suggested available replacements filtered by matching role and skills.
5. Manager assigns the replacement photographer/makeup artist. The database verifies zero conflict and updates `crew_status` to `CREW_READY`.
6. Manager approves the sick leave request.

### Scenario B: Camera Reported Damaged During Shoot Return
1. Front desk receptionist/manager receives equipment using `return_booking_resource`.
2. Manager checks `is_damaged = TRUE`, sets severity (`MEDIUM` or `HIGH`), and enters damage details (e.g. "Front element scratched, autofocus motor jammed").
3. The server automatically updates the camera status to `DAMAGED` and inserts an incident record in `resource_incidents`.
4. If this camera is reserved for tomorrow, tomorrow's booking automatically switches to `RESOURCE_CONFLICT`.
5. Manager reviews the Tomorrow Prep Board, sees the conflict, and reassigns an available backup camera body (e.g. `CAM-002`).

### Scenario C: Equipment Return Overdue
1. Equipment checked out for a 09:00–12:00 shoot is not returned by 13:00.
2. The Daily Operations Board surfaces the handoff as `OVERDUE_RETURN`.
3. Front desk contacts the assigned photographer directly to retrieve the equipment for maintenance/next booking.

### Scenario D: Cross-Midnight Booking (e.g., 22:00 to 01:00)
1. Bookings and shifts spanning across midnight are represented with exact ISO 8601 UTC timestamps stored as PostgreSQL `TIMESTAMPTZ`.
2. Overlap calculations use Postgres timestamp interval comparison:
   `b.start_at < p_end_at AND b.end_at > p_start_at`
3. This guarantees proper overlap prevention even when calendar dates transition from Day N to Day N+1.
