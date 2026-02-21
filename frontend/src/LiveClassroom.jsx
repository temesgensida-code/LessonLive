import React, { useState, useEffect } from 'react';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  useLocalParticipant,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { useParams } from 'react-router-dom';
import UsernameChat from './UsernameChat';

const serverUrl = 'wss://lessonlivemain-i0wqfwh8.livekit.cloud'; 
export default function LiveClassroom({ accessToken }) {
  const { classId } = useParams();
  const [token, setToken] = useState(null);
  const [isTeacher, setIsTeacher] = useState(false); 

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch(`/api/classrooms/${classId}/token/`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) {
            console.error(`Error fetching token: ${response.statusText}`);
            return;
        }
        const data = await response.json();
        setToken(data.token);
        
        const userRes = await fetch('/api/auth/me/', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        }); 
        if(userRes.ok) {
            const userData = await userRes.json();
            if (userData.profile?.role === 'teacher') {
                setIsTeacher(true);
            }
        }
      } catch (e) {
        console.error(e);
      }
    };
    if (accessToken) fetchToken();
  }, [classId, accessToken]);

  if (!token) return <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh'}}>Loading Live Classroom...</div>;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <LiveKitRoom
        video={true} 
        audio={true} 
        token={token}
        serverUrl={serverUrl}
        data-lk-theme="default"
        style={{ flex: 1, display: 'flex' }}
      >
        {/* Left 3/5 - Main Stage */}
        <div style={{ flex: 3, borderRight: '1px solid #333', display: 'flex', flexDirection: 'column', background: '#000' }}>
            <Stage />
            <div style={{ padding: '10px', display: 'flex', justifyContent: 'center', background: '#111' }}>
                <ControlBar variation="minimal" controls={{ screenShare: isTeacher, chat: false }} />
            </div>
        </div>

        {/* Right 2/5 - Sidebar */}
        <div style={{ flexBasis: '40%', flexGrow: 2, minWidth: 0, display: 'flex', flexDirection: 'column', background: '#f5f5f5', borderLeft: '1px solid #ddd' }}>
          <RightPanel isTeacher={isTeacher} classId={classId} accessToken={accessToken} />
        </div>

        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

function Stage() {
  const screenTracks = useTracks([Track.Source.ScreenShare]);
  const cameraTracks = useTracks([Track.Source.Camera]);
  const tracks = screenTracks.length > 0 ? screenTracks : cameraTracks;

  return (
    <div style={{ flex: 1 }}>
        <GridLayout tracks={tracks}>
            <ParticipantTile />
        </GridLayout>
    </div>
  );
}

function RightPanel({ isTeacher, classId, accessToken }) {
  const [teacherMode, setTeacherMode] = useState('chat');

  if (isTeacher) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
         <button 
            onClick={() => setTeacherMode(teacherMode === 'chat' ? 'notes' : 'chat')}
            style={{
                width: '100%',
                padding: '20px',
                fontSize: '18px',
                fontWeight: 'bold',
                backgroundColor: teacherMode === 'chat' ? '#007bff' : '#28a745',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
            }}
         >
            {teacherMode === 'chat' ? 'Switch to Writing Note' : 'Switch to Chat'}
         </button>
         
         <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            {teacherMode === 'chat' ? (
              <UsernameChat />
            ) : (
                 <NotesComponent classId={classId} accessToken={accessToken} />
            )}
         </div>
      </div>
    );
  }

  // Student View
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
       <div style={{ flex: 1, overflow: 'hidden' }}>
         <UsernameChat />
       </div>
       
       <div style={{ padding: '20px', backgroundColor: '#e9ecef', borderTop: '1px solid #ccc' }}>
          <h4>Audio Controls</h4>
          <AudioStreamButton />
       </div>
    </div>
  );
}

function AudioStreamButton() {
    const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();

    const toggleAudio = async () => {
        if (localParticipant) {
            const desired = !isMicrophoneEnabled;
            // Usually we enable/disable the track
            if (desired) {
                await localParticipant.setMicrophoneEnabled(true);
            } else {
                await localParticipant.setMicrophoneEnabled(false);
            }
        }
    };

    return (
        <button
            onClick={toggleAudio}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                padding: '15px',
                backgroundColor: isMicrophoneEnabled ? '#dc3545' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                fontWeight: 'bold'
            }}
        >
            {isMicrophoneEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
        </button>
    )
}

function NotesComponent({ classId, accessToken }) {
    const [note, setNote] = useState('');
  const [status, setStatus] = useState('');

    const handleSave = async () => {
    const trimmed = note.trim();
    if (!trimmed) {
      setStatus('Type a note before saving.');
      return;
    }

    try {
      setStatus('Saving...');
      const response = await fetch(`/api/classrooms/${classId}/notes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: `Live note ${new Date().toLocaleString()}`,
          content: trimmed,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setStatus(errorData.detail || 'Unable to save note.');
        return;
      }

      setStatus('Saved.');
    } catch {
      setStatus('Unable to save note.');
    }
    };

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3>Private Notes</h3>
            <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{
                    flex: 1,
                    width: '100%',
                    padding: '10px',
                    marginBottom: '15px',
                    borderRadius: '5px',
                    border: '1px solid #ccc',
                    resize: 'none',
                    fontSize: '14px',
                    fontFamily: 'sans-serif'
                }}
                placeholder="Type your notes regarding this class here..."
            />
            <button
                onClick={handleSave}
                style={{
                    padding: '12px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '16px'
                }}
            >
                Save Note
            </button>
            {status ? <p style={{ marginTop: '8px' }}>{status}</p> : null}
        </div>
    );
}
