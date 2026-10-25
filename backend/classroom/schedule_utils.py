import zoneinfo
from datetime import datetime, timedelta, time
from urllib.parse import quote, urlencode

DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
BYDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']


def get_next_occurrence(schedule, reference_now=None):
    """
    Finds the next upcoming datetime for a recurring weekly schedule item.
    """
    try:
        tz = zoneinfo.ZoneInfo(schedule.timezone_name)
    except Exception:
        tz = zoneinfo.ZoneInfo('UTC')

    now_in_tz = datetime.now(tz) if reference_now is None else reference_now.astimezone(tz)

    current_weekday = now_in_tz.weekday()
    target_weekday = schedule.day_of_week

    days_ahead = target_weekday - current_weekday
    target_start = datetime.combine(now_in_tz.date(), schedule.start_time, tzinfo=tz)

    if days_ahead == 0 and now_in_tz >= target_start:
        days_ahead = 7
    elif days_ahead < 0:
        days_ahead += 7

    next_date = (now_in_tz + timedelta(days=days_ahead)).date()
    return datetime.combine(next_date, schedule.start_time, tzinfo=tz)


def format_human_relative(target_dt, now_dt):
    delta = target_dt - now_dt
    total_seconds = int(delta.total_seconds())
    if total_seconds <= 0:
        return 'Starting now'

    days = total_seconds // 86400
    hours = (total_seconds % 86400) // 3600
    minutes = (total_seconds % 3600) // 60

    day_str = target_dt.strftime('%A at %I:%M %p').replace(' 0', ' ')

    if days > 1:
        rel = f"in {days} days"
    elif days == 1:
        rel = "tomorrow"
    elif hours > 1:
        rel = f"in {hours} hours"
    elif hours == 1:
        rel = "in 1 hour"
    elif minutes > 1:
        rel = f"in {minutes} minutes"
    else:
        rel = "in less than a minute"

    return f"{day_str} ({rel})"


def get_classroom_next_session(classroom, schedules, reference_now=None):
    if not schedules:
        return None

    now_utc = datetime.now(zoneinfo.ZoneInfo('UTC')) if reference_now is None else reference_now.astimezone(zoneinfo.ZoneInfo('UTC'))

    earliest_session = None
    earliest_dt = None
    is_live_now = False

    for sched in schedules:
        if not sched.is_active:
            continue

        try:
            tz = zoneinfo.ZoneInfo(sched.timezone_name)
        except Exception:
            tz = zoneinfo.ZoneInfo('UTC')

        now_in_tz = now_utc.astimezone(tz)

        # Check if live right now
        if (
            sched.day_of_week == now_in_tz.weekday()
            and sched.start_time <= now_in_tz.time() <= sched.end_time
        ):
            is_live_now = True

        next_dt = get_next_occurrence(sched, reference_now=now_utc)
        if earliest_dt is None or next_dt < earliest_dt:
            earliest_dt = next_dt
            earliest_session = sched

    if not earliest_session or not earliest_dt:
        return None

    seconds_until_start = max(0, int((earliest_dt - now_utc).total_seconds()))
    day_name = DAY_NAMES[earliest_session.day_of_week]

    return {
        'schedule_id': earliest_session.id,
        'title': earliest_session.title,
        'day_of_week': earliest_session.day_of_week,
        'day_name': day_name,
        'start_time': earliest_session.start_time.strftime('%H:%M'),
        'end_time': earliest_session.end_time.strftime('%H:%M'),
        'timezone': earliest_session.timezone_name,
        'start_iso': earliest_dt.isoformat(),
        'seconds_until_start': seconds_until_start,
        'human_relative': format_human_relative(earliest_dt, now_utc),
        'is_live_now': is_live_now,
    }


def generate_classroom_ics(classroom, schedules, frontend_base_url):
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//LessonLive//Classroom Schedule//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{classroom.name} - LessonLive",
    ]

    for sched in schedules:
        if not sched.is_active:
            continue

        byday = BYDAYS[sched.day_of_week]
        dtstart = get_next_occurrence(sched)
        
        # Calculate duration
        start_secs = sched.start_time.hour * 3600 + sched.start_time.minute * 60 + sched.start_time.second
        end_secs = sched.end_time.hour * 3600 + sched.end_time.minute * 60 + sched.end_time.second
        duration_secs = max(1800, end_secs - start_secs)
        dtend = dtstart + timedelta(seconds=duration_secs)

        start_utc = dtstart.astimezone(zoneinfo.ZoneInfo("UTC")).strftime("%Y%m%dT%H%M%SZ")
        end_utc = dtend.astimezone(zoneinfo.ZoneInfo("UTC")).strftime("%Y%m%dT%H%M%SZ")
        class_url = f"{frontend_base_url.rstrip('/')}/classrooms/{classroom.class_id}"

        lines.extend([
            "BEGIN:VEVENT",
            f"UID:ll-sched-{sched.id}@{classroom.class_id}.lessonlive",
            f"DTSTAMP:{datetime.now(zoneinfo.ZoneInfo('UTC')).strftime('%Y%m%dT%H%M%SZ')}",
            f"DTSTART:{start_utc}",
            f"DTEND:{end_utc}",
            f"RRULE:FREQ=WEEKLY;BYDAY={byday}",
            f"SUMMARY:{classroom.name}: {sched.title}",
            f"DESCRIPTION:Live interactive classroom lecture on LessonLive.\\nJoin URL: {class_url}",
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


def generate_calendar_links(classroom, next_session, frontend_base_url):
    if not next_session:
        return {
            'google': '',
            'outlook': '',
            'ics_download_url': f"/api/classrooms/{classroom.class_id}/schedule/ics/",
        }

    class_url = f"{frontend_base_url.rstrip('/')}/classrooms/{classroom.class_id}"
    title = f"{classroom.name}: {next_session['title']}"
    details = f"Live interactive classroom lecture on LessonLive.\nJoin: {class_url}"
    byday = BYDAYS[next_session['day_of_week']]

    # Dates in UTC
    start_dt = datetime.fromisoformat(next_session['start_iso']).astimezone(zoneinfo.ZoneInfo("UTC"))
    # Duration approx 1.5h or from start/end
    end_dt = start_dt + timedelta(hours=1, minutes=30)
    start_utc = start_dt.strftime("%Y%m%dT%H%M%SZ")
    end_utc = end_dt.strftime("%Y%m%dT%H%M%SZ")

    google_params = {
        'action': 'TEMPLATE',
        'text': title,
        'dates': f"{start_utc}/{end_utc}",
        'recur': f"RRULE:FREQ=WEEKLY;BYDAY={byday}",
        'details': details,
        'location': class_url,
    }
    google_url = f"https://calendar.google.com/calendar/render?{urlencode(google_params)}"

    outlook_params = {
        'subject': title,
        'startdt': start_dt.isoformat(),
        'enddt': end_dt.isoformat(),
        'body': details,
        'location': class_url,
    }
    outlook_url = f"https://outlook.live.com/calendar/0/deeplink/compose?{urlencode(outlook_params)}"

    return {
        'google': google_url,
        'outlook': outlook_url,
        'ics_download_url': f"/api/classrooms/{classroom.class_id}/schedule/ics/",
    }
