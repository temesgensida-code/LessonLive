import zoneinfo
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.conf import settings
from classroom.models import ClassroomSchedule, ScheduleReminderLog, ClassroomNotification, Enrollment
from classroom.schedule_utils import get_next_occurrence
from authentication.email_service import send_class_reminder_email


class Command(BaseCommand):
    help = 'Dispatches in-app notifications and email reminders for classes starting in 25-35 minutes'

    def add_arguments(self, parser):
        parser.add_argument('--window-min', type=int, default=25, help='Minimum minutes before session start')
        parser.add_argument('--window-max', type=int, default=35, help='Maximum minutes before session start')
        parser.add_argument('--reference-time', type=str, default=None, help='ISO datetime string to simulate current time')

    def handle(self, *args, **options):
        window_min = options['window_min'] * 60
        window_max = options['window_max'] * 60
        ref_time_str = options.get('reference_time')

        if ref_time_str:
            now_utc = datetime.fromisoformat(ref_time_str.replace('Z', '+00:00'))
            if now_utc.tzinfo is None:
                now_utc = now_utc.replace(tzinfo=zoneinfo.ZoneInfo('UTC'))
            else:
                now_utc = now_utc.astimezone(zoneinfo.ZoneInfo('UTC'))
        else:
            now_utc = datetime.now(zoneinfo.ZoneInfo('UTC'))

        self.stdout.write(f"Checking scheduled classes at {now_utc.isoformat()} (Window: {window_min//60}-{window_max//60} mins)...")

        schedules = ClassroomSchedule.objects.filter(is_active=True).select_related('classroom', 'created_by')
        reminders_dispatched = 0

        for sched in schedules:
            try:
                next_occ = get_next_occurrence(sched, reference_now=now_utc)
                diff_seconds = (next_occ.astimezone(zoneinfo.ZoneInfo('UTC')) - now_utc).total_seconds()

                if not (window_min <= diff_seconds <= window_max):
                    continue

                # Idempotency check
                if ScheduleReminderLog.objects.filter(schedule=sched, occurrence_datetime=next_occ).exists():
                    self.stdout.write(f"Skipping {sched} at {next_occ} - already reminded.")
                    continue

                # 1. In-app notification
                time_str = sched.start_time.strftime('%I:%M %p').lstrip('0')
                msg = f"Upcoming: {sched.classroom.name} ({sched.title}) starts at {time_str}!"
                ClassroomNotification.objects.create(
                    classroom=sched.classroom,
                    created_by=sched.created_by,
                    message=msg,
                    countdown_seconds=int(diff_seconds),
                )

                # 2. Email reminders
                enrollments = Enrollment.objects.filter(classroom=sched.classroom).select_related('student')
                join_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/classrooms/{sched.classroom.class_id}"
                recipients = 0

                for enroll in enrollments:
                    student = enroll.student
                    if student.email:
                        send_class_reminder_email(
                            user=student,
                            classroom=sched.classroom,
                            schedule=sched,
                            time_str=time_str,
                            join_url=join_url,
                        )
                        recipients += 1

                # 3. Log reminder
                ScheduleReminderLog.objects.create(
                    schedule=sched,
                    occurrence_datetime=next_occ,
                    recipients_count=recipients,
                )

                reminders_dispatched += 1
                self.stdout.write(self.style.SUCCESS(
                    f"Dispatched reminder for {sched.classroom.name} ({sched.title}) to {recipients} student(s)."
                ))

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error processing schedule {sched.id}: {str(e)}"))

        self.stdout.write(self.style.SUCCESS(f"Finished: {reminders_dispatched} reminder(s) dispatched."))
