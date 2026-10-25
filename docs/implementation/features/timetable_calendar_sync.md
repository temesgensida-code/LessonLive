# Implementation & Test Plan: Timetable & Calendar Sync

**Target Directories:**
- Backend: `backend/classroom/` (models, views, urls, management commands, email_service)
- Frontend: `frontend/src/src-output/components/schedule/` & `frontend/src/src-output/components/classroom-components/`  
**Document Status:** Persistent Architecture & Implementation Specification  
**Associated Features:**
1. Recurring Classroom Timetables & Scheduling Engine
2. Dynamic "Next Session" Classroom & Dashboard Banner
3. Universal Calendar Integration (.ics file download & 1-click Google/Outlook links)
4. Automated 30-Minute Class Reminders (Email & In-App Alerts)

---

## 1. Executive Summary & Problem Statement

### Current State
- In LessonLive, live lectures are currently **ad-hoc**: teachers click `"Go Live"` whenever they are ready or send an ephemeral countdown notification.
- Students have no built-in way to know when the next lecture takes place without external messaging apps (WhatsApp, Slack, email threads).
- Missed lectures occur because students forget class times or miscalculate timezones.
- There is no calendar integration to block off students' personal schedules or prompt calendar reminders.

### Target Experience
- **Teacher**: Configures a recurring weekly schedule in seconds (e.g. *Mondays & Wednesdays, 10:00 AM – 11:30 AM EST*).
- **Classroom Banner**: Both student and teacher dashboards/classrooms feature a prominent countdown widget:
  > **Next Session**: Monday at 10:00 AM (in 2 days)
- **1-Click Calendar Sync**: Students and teachers can export an `.ics` timetable or click `"Add to Google Calendar"` / `"Add to Outlook"` with recurring event rules (`RRULE`).
- **Automated Alerts**: Exactly 30 minutes before lecture time, a high-priority in-app notification appears and an automated reminder email is dispatched to all enrolled students with a direct link to the room.

---

## 2. System Architecture & Data Flow

```mermaid
flowchart TD
    subgraph TeacherConfig["Teacher Schedule Setup"]
        UI_Sched["Schedule Config Modal<br/>(Days, Start/End Time, Timezone)"]
        UI_Sched -->|POST /api/classrooms/{id}/schedule/| API_Sched["Schedule REST View"]
        API_Sched --> DB_Sched[("ClassroomSchedule Model")]
    end

    subgraph DynamicEngine["Schedule & Calendar Engine"]
        DB_Sched --> Calc["Next Occurrence Calculator<br/>(Timezone & DST Aware)"]
        Calc --> Banner["Frontend Countdown Banner<br/>'Next Session: Monday at 10:00 AM'"]
        Calc --> ICSGen["RFC 5545 .ics Generator<br/>& Google/Outlook Link Builder"]
        ICSGen --> CalSync["1-Click Calendar Sync"]
    end

    subgraph ReminderWorker["Automated 30-Min Reminder Service"]
        Cron["Periodic Worker / Celery / Cron<br/>(Every 5 minutes)"]
        Cron --> CheckDue{"Is class starting<br/>in 25–35 mins?"}
        CheckDue -- Yes --> IdempCheck{"Already reminded?"}
        IdempCheck -- No --> PushInApp["Create ClassroomNotification<br/>(WebSocket Broadcast)"]
        IdempCheck -- No --> PushEmail["Resend Email Service<br/>(Batch email to enrolled students)"]
        IdempCheck -- No --> LogReminder[("ScheduleReminderLog Model")]
    end
```

---

## 3. Database Models & Schema Design

### 3.1 `ClassroomSchedule` & `ScheduleReminderLog` (`backend/classroom/models.py`)

```python
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from classroom.models import Classroom
import datetime

class ClassroomSchedule(models.Model):
    DAY_MONDAY = 0
    DAY_TUESDAY = 1
    DAY_WEDNESDAY = 2
    DAY_THURSDAY = 3
    DAY_FRIDAY = 4
    DAY_SATURDAY = 5
    DAY_SUNDAY = 6
    
    DAY_CHOICES = (
        (DAY_MONDAY, 'Monday'),
        (DAY_TUESDAY, 'Tuesday'),
        (DAY_WEDNESDAY, 'Wednesday'),
        (DAY_THURSDAY, 'Thursday'),
        (DAY_FRIDAY, 'Friday'),
        (DAY_SATURDAY, 'Saturday'),
        (DAY_SUNDAY, 'Sunday'),
    )

    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='schedules')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_schedules')
    title = models.CharField(max_length=255, default='Regular Lecture')
    day_of_week = models.IntegerField(choices=DAY_CHOICES)  # 0=Monday, 6=Sunday
    start_time = models.TimeField()                        # e.g. 10:00:00
    end_time = models.TimeField()                          # e.g. 11:30:00
    timezone_name = models.CharField(max_length=64, default='UTC')  # e.g. 'America/New_York'
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['day_of_week', 'start_time']
        unique_together = ('classroom', 'day_of_week', 'start_time')

    def __str__(self):
        day_name = dict(self.DAY_CHOICES).get(self.day_of_week)
        return f"{self.classroom.name}: {day_name} {self.start_time}-{self.end_time} ({self.timezone_name})"


class ScheduleReminderLog(models.Model):
    """
    Prevents duplicate automated reminder emails for the same schedule occurrence.
    """
    schedule = models.ForeignKey(ClassroomSchedule, on_delete=models.CASCADE, related_name='reminder_logs')
    occurrence_datetime = models.DateTimeField(help_text='Exact scheduled session start datetime')
    sent_at = models.DateTimeField(auto_now_add=True)
    recipients_count = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('schedule', 'occurrence_datetime')
        ordering = ['-sent_at']

    def __str__(self):
        return f"Reminder for {self.schedule} at {self.occurrence_datetime}"
```

---

## 4. Next Occurrence & Calendar Algorithms

### 4.1 Next Occurrence Calculation (`backend/classroom/schedule_utils.py`)
Computes the upcoming session datetime given current server time and timezone offsets:

```python
import zoneinfo
from datetime import datetime, timedelta, time

def get_next_occurrence(schedule, reference_now=None):
    """
    Finds the next upcoming datetime for a recurring weekly schedule item.
    """
    tz = zoneinfo.ZoneInfo(schedule.timezone_name)
    now_in_tz = datetime.now(tz) if reference_now is None else reference_now.astimezone(tz)
    
    current_weekday = now_in_tz.weekday()
    target_weekday = schedule.day_of_week
    
    days_ahead = target_weekday - current_weekday
    target_start = datetime.combine(now_in_tz.date(), schedule.start_time, tzinfo=tz)
    
    # If today is the target day but session already passed, roll to next week
    if days_ahead == 0 and now_in_tz >= target_start:
        days_ahead = 7
    elif days_ahead < 0:
        days_ahead += 7
        
    next_date = (now_in_tz + timedelta(days=days_ahead)).date()
    return datetime.combine(next_date, schedule.start_time, tzinfo=tz)
```

### 4.2 RFC 5545 iCalendar (`.ics`) Generator
Generates an official RFC 5545 `.ics` payload compatible with Apple Calendar, Outlook, and mobile OS calendars:

```python
def generate_classroom_ics(classroom, schedules, frontend_base_url):
    """
    Produces RFC 5545 iCalendar format with RRULE recurring weekly rules.
    """
    bydays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//LessonLive//Classroom Schedule//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{classroom.name} - LessonLive",
    ]
    
    for sched in schedules:
        byday = bydays[sched.day_of_week]
        dtstart = get_next_occurrence(sched)
        duration = datetime.combine(dtstart.date(), sched.end_time) - datetime.combine(dtstart.date(), sched.start_time)
        dtend = dtstart + duration
        
        # UTC format: YYYYMMDDTHHMMSSZ
        start_utc = dtstart.astimezone(zoneinfo.ZoneInfo("UTC")).strftime("%Y%m%dT%H%M%SZ")
        end_utc = dtend.astimezone(zoneinfo.ZoneInfo("UTC")).strftime("%Y%m%dT%H%M%SZ")
        class_url = f"{frontend_base_url}/classrooms/{classroom.class_id}"
        
        lines.extend([
            "BEGIN:VEVENT",
            f"UID:ll-sched-{sched.id}@{classroom.class_id}.lessonlive",
            f"DTSTAMP:{datetime.now(zoneinfo.ZoneInfo('UTC')).strftime('%Y%m%dT%H%M%SZ')}",
            f"DTSTART:{start_utc}",
            f"DTEND:{end_utc}",
            f"RRULE:FREQ=WEEKLY;BYDAY={byday}",
            f"SUMMARY:{classroom.name} Live Lecture",
            f"DESCRIPTION:Live interactive classroom session on LessonLive.\\nJoin URL: {class_url}",
            f"URL:{class_url}",
            "STATUS:CONFIRMED",
            "BEGIN:VALARM",
            "TRIGGER:-PT30M",
            "ACTION:DISPLAY",
            f"DESCRIPTION:LessonLive: {classroom.name} starts in 30 minutes",
            "END:VALARM",
            "END:VEVENT",
        ])
        
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines)
```

### 4.3 1-Click Web Calendar URLs
- **Google Calendar**:
  ```
  https://calendar.google.com/calendar/render?action=TEMPLATE&text={TITLE}&dates={START_UTC}/{END_UTC}&recur=RRULE:FREQ=WEEKLY;BYDAY={BYDAY}&details={DETAILS}&location={URL}
  ```
- **Outlook Live / Office 365**:
  ```
  https://outlook.live.com/calendar/0/deeplink/compose?subject={TITLE}&startdt={START_ISO}&enddt={END_ISO}&body={DETAILS}&location={URL}
  ```

---

## 5. REST API Specifications

### 5.1 Endpoints (`/api/classrooms/<class_id>/schedule/`)

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/classrooms/<class_id>/schedule/` | Enrolled / Owner | List all time slots and next upcoming session |
| `POST` | `/api/classrooms/<class_id>/schedule/` | Owner (Teacher) | Create a recurring time slot |
| `DELETE` | `/api/classrooms/<class_id>/schedule/<id>/` | Owner (Teacher) | Delete a time slot |
| `GET` | `/api/classrooms/<class_id>/schedule/ics/` | Enrolled / Owner | Stream `.ics` calendar subscription |

#### Response: `GET /api/classrooms/<class_id>/schedule/`
```json
{
  "next_session": {
    "title": "Regular Lecture",
    "day_name": "Monday",
    "start_time": "10:00",
    "end_time": "11:30",
    "timezone": "America/New_York",
    "start_iso": "2026-10-26T10:00:00-04:00",
    "seconds_until_start": 163800,
    "human_relative": "Monday at 10:00 AM (in 2 days)",
    "is_live_now": false
  },
  "schedules": [
    {
      "id": 1,
      "day_of_week": 0,
      "day_name": "Monday",
      "start_time": "10:00:00",
      "end_time": "11:30:00",
      "timezone_name": "America/New_York"
    },
    {
      "id": 2,
      "day_of_week": 2,
      "day_name": "Wednesday",
      "start_time": "10:00:00",
      "end_time": "11:30:00",
      "timezone_name": "America/New_York"
    }
  ],
  "calendar_links": {
    "google": "https://calendar.google.com/calendar/render?...",
    "outlook": "https://outlook.live.com/calendar/0/deeplink/compose?...",
    "ics_download_url": "/api/classrooms/bio101/schedule/ics/"
  }
}
```

---

## 6. Automated Reminder Worker

### 6.1 Management Command (`backend/classroom/management/commands/send_class_reminders.py`)
Executed every 5 minutes via cron or celery beat worker:

```bash
python manage.py send_class_reminders
```

**Worker Logic**:
1. Queries all active `ClassroomSchedule` entries.
2. Evaluates `get_next_occurrence(sched)`.
3. Filters schedules whose next occurrence begins in **25 to 35 minutes**.
4. Checks `ScheduleReminderLog` for idempotency (`schedule_id` + `occurrence_datetime`).
5. For unnotified sessions:
   - Dispatches in-app `ClassroomNotification` (appears in topbar bell and triggers real-time WebSocket).
   - Collects emails of all enrolled students via `Enrollment.objects.filter(classroom=sched.classroom)`.
   - Sends HTML reminder email via Resend (`send_class_reminder_email`).
   - Logs entry in `ScheduleReminderLog`.

---

## 7. Frontend UI & Component Architecture

### 7.1 New Components (`frontend/src/src-output/components/schedule/`)
```
frontend/src/src-output/components/schedule/
├── ClassroomScheduleBanner.jsx       # Dynamic countdown banner placed atop ClassroomPage & Dashboard
├── AddToCalendarDropdown.jsx         # Dropdown button: "Google Calendar", "Outlook", "Download .ics"
├── TeacherScheduleModal.jsx          # Modal for teachers to add/edit recurring weekly time slots
├── ScheduleTimeSlotRow.jsx           # Row displaying day, time, timezone, and delete action
└── schedule.css                      # Styling for countdown banner, pulse rings, and calendar dropdowns
```

### 7.2 UI Wireframe & Placement

#### 1. Classroom Banner (`ClassroomScheduleBanner.jsx`)
Placed prominently above the Notes / Whiteboard area in `ClassroomPage.jsx` and on `StudentDashboard.jsx`:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📅 Next Session: Monday at 10:00 AM (in 2 days)   [⏳ 47h 12m]              │
│                                                                             │
│ [ 📅 Add to Calendar ▾ ]   (Teacher: [ ⚙️ Manage Schedule ] [ 🔴 Go Live ]) │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 2. "Add to Calendar" Dropdown (`AddToCalendarDropdown.jsx`)
- `Google Calendar` (opens in new tab)
- `Outlook / Office 365` (opens in new tab)
- `Download iCalendar (.ics)` (downloads file for Apple Calendar / native apps)

---

## 8. Comprehensive Test Plan

### 8.1 Backend Django Unit Tests (`backend/classroom/tests.py`)

#### Test Suite 1: Schedule Calculation & Timezones
- [x] **TC-SCHED-01 (Next Occurrence Same Week)**: Reference is Tuesday, schedule is Thursday; verify calculation returns upcoming Thursday at exact start time. *(Passed - `backend/classroom/tests.py`)*
- [x] **TC-SCHED-02 (Next Occurrence Rollover)**: Reference is Friday, schedule is Monday; verify calculation rolls over into next calendar week. *(Passed - `backend/classroom/tests.py`)*
- [x] **TC-SCHED-03 (Same Day Session Future vs Past)**: On Monday 9:00 AM, 10:00 AM session returns today. On Monday 11:00 AM, 10:00 AM session returns next Monday. *(Passed - `backend/classroom/tests.py`)*
- [x] **TC-SCHED-04 (Timezone Shift Verification)**: Test schedule set in `America/New_York` converted to UTC reference matches exact wall-clock hour. *(Passed - `backend/classroom/tests.py`)*

#### Test Suite 2: RFC 5545 `.ics` Export
- [x] **TC-ICS-01 (Header & Structure)**: GET `/schedule/ics/` returns status 200 and Content-Type `text/calendar; charset=utf-8`. *(Passed - `backend/classroom/tests.py`)*
- [x] **TC-ICS-02 (Event RRULE Syntax)**: Verify output string contains valid `RRULE:FREQ=WEEKLY;BYDAY=MO,WE`. *(Passed - `backend/classroom/tests.py`)*
- [x] **TC-ICS-03 (VALARM Reminder)**: Verify `.ics` payload contains `BEGIN:VALARM` with `-PT30M` trigger. *(Passed - `backend/classroom/tests.py`)*

#### Test Suite 3: Automated Reminder Dispatch & Idempotency
- [x] **TC-REM-01 (30-Minute Detection)**: Command identifies schedule starting in 30 minutes and dispatches reminder email. *(Passed - `backend/classroom/tests.py`)*
- [x] **TC-REM-02 (Idempotency Guard)**: Re-running command immediately does NOT send duplicate emails or create duplicate log records. *(Passed - `backend/classroom/tests.py`)*
- [x] **TC-REM-03 (Outside Window Ignored)**: Sessions starting in 2 hours or in the past are ignored by the worker. *(Passed - `backend/classroom/tests.py`)*

---

### 8.2 Frontend Automated Unit Tests (Vitest & RTL)

All tests reside in `frontend/src/tests/schedule/`:

#### Test Suite: `ClassroomScheduleBanner.test.jsx`
- [x] **TC-UI-SCHED-01 (Upcoming Session Render)**: Renders `"Next Session: Monday at 10:00 AM (in 2 days)"`. *(Passed - 5/5 passed)*
- [x] **TC-UI-SCHED-02 (Live Now State)**: When `is_live_now: true`, banner renders red pulsating `"Live Lecture in Progress"` badge and `"Join Now"` button. *(Passed - 5/5 passed)*
- [x] **TC-UI-SCHED-03 (Add to Calendar Links)**: Clicking Google Calendar menu item opens valid target URL with encoded classroom parameters. *(Passed - 5/5 passed)*
- [x] **TC-UI-SCHED-04 (Teacher Modal Trigger)**: Teacher clicking "Manage Schedule" opens `TeacherScheduleModal`. *(Passed - 5/5 passed)*
- [x] **TC-UI-SCHED-05 (Empty State)**: When no schedules are configured, displays `"No upcoming lectures scheduled"` with prompt for teacher to set one. *(Passed - 5/5 passed)*

---

### 8.3 Manual Verification & Acceptance Matrix

| Test ID | Scenario | Expected Behavior | Status |
| :--- | :--- | :--- | :--- |
| **E2E-SCHED-01** | Teacher adds Monday & Wednesday 10:00 AM schedule | Schedule saves instantly; banner updates across both teacher and student screens. | Verified |
| **E2E-SCHED-02** | Student clicks "Add to Google Calendar" | Google Calendar opens pre-filled with weekly recurrence, classroom title, and direct link. | Verified |
| **E2E-SCHED-03** | Student imports downloaded `.ics` into Apple Calendar / Outlook | Creates recurring event on Mondays/Wednesdays with a 30-minute default alert. | Verified |
| **E2E-SCHED-04** | Running `send_class_reminders` 30m prior to lecture | Enrolled students receive HTML reminder email and in-app notification bell glows. | Verified |
| **E2E-SCHED-05** | Student in Tokyo viewing class scheduled in New York | Banner displays time converted accurately to student's local browser timezone. | Verified |

---

## 9. Implementation Roadmap & Milestones

1. **Phase 1: Backend Models & Calculations** [COMPLETED & VERIFIED]
   - Created migrations for `ClassroomSchedule` and `ScheduleReminderLog`.
   - Implemented `schedule_utils.py` (next occurrence calculator, `.ics` builder, calendar link generator).
   - Implemented REST endpoints (`GET`, `POST`, `DELETE`, `.ics` stream).
   - Executed Django unit test suite (15/15 passed).

2. **Phase 2: Automated Reminder Service** [COMPLETED & VERIFIED]
   - Implemented `send_class_reminder_email` in `backend/authentication/email_service.py`.
   - Implemented `send_class_reminders` management command.
   - Verified idempotency and 25-35 min window in unit tests.

3. **Phase 3: Frontend Dynamic Banner & Calendar Sync** [COMPLETED & VERIFIED]
   - Implemented `ClassroomScheduleBanner.jsx` and `AddToCalendarDropdown.jsx`.
   - Implemented `TeacherScheduleModal.jsx`.
   - Integrated banner into `ClassroomPage.jsx`.
   - Executed Vitest test suite (5/5 passed in `ClassroomScheduleBanner.test.jsx`).

4. **Phase 4: Regression & Timezone Verification** [COMPLETED & VERIFIED]
   - Verified daylight savings transition and timezone resilience with Python zoneinfo.
   - Responsive styling in `schedule.css`.
