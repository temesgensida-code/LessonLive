# LessonLive

LessonLive is a live virtual classroom platform built with Django + React. It focuses on real-time teaching workflows: secure authentication, classroom management, student onboarding, live communication, and media collaboration.

## Core Features

- Custom authentication flow
  - Teacher sign-up and user login endpoints
  - JWT-based access with refresh token support
  - Profile-aware authorization (teacher/student roles)
- Classroom creation and management
  - Teachers can create classrooms and access class-specific dashboards
  - Classroom membership checks protect all class resources
- Student invitation system
  - Invite students by email list or CSV upload
  - Time-limited invitation links with enrollment automation
  - Re-invite and validation logic for pending/expired invites
- Live chat and classroom communication
  - Real-time class interaction for active sessions
  - Supports collaborative teaching flow during live classes
- Audio streaming for live sessions
  - Teachers and students can join audio-enabled live rooms
- Screen sharing
  - Teachers can share screens during class for demonstrations
- Note display and live note updates
  - Teachers save and display notes to all students in real time
  - Displayed notes are synchronized with WebSocket broadcasts

## Screen Share and Audio Streaming Method (SFU)

This project uses an SFU (Selective Forwarding Unit) approach through LiveKit for real-time media.

Why SFU was used:

- Better scalability than peer-to-peer mesh for classroom sizes
- Lower client bandwidth usage: each participant publishes once to the SFU
- Efficient fan-out: the SFU forwards streams to all subscribed participants
- Improved session quality and stability for live teaching

In practice, this means screen share and audio streams are published to LiveKit and selectively forwarded to classroom participants, enabling smooth multi-user sessions.

## Tech Stack

- Backend: Django, Django Channels, DRF SimpleJWT
- Frontend: React (Vite)
- Real-time media: LiveKit (SFU model)
- Real-time note events: WebSockets via Django Channels
- Database: SQLite (dev) / configurable for production

## API Areas

- Authentication: `/api/auth/...`
- Classrooms: `/api/classrooms/...`
- Notes WebSocket: `/ws/classrooms/<class_id>/notes/`

## Local Development

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs by default at `http://localhost:5173` and backend at `http://localhost:8000`.

## Environment Variables (Important)

Set these in backend `.env` for production-like setup:

- `DJANGO_SECRET_KEY`
- `DEBUG`
- `ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
- `FRONTEND_BASE_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- Email settings for invitation delivery (`EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, etc.)

## Roadmap / Upcoming Components

Planned improvements include:

- Student examination module
- Automatic grading and exam analytics
- Machine learning integration to analyze each student's weak points based on examination results
- Personalized learning recommendations driven by performance trends
- Extended teacher insights dashboard

## Project Vision

LessonLive is designed to become an end-to-end digital classroom system where teachers can teach live, assess students continuously, and use data-driven insights to improve learning outcomes.
