import { useState } from 'react'
import { RoomAudioRenderer } from '@livekit/components-react'
import { MessageSquare, HelpCircle } from 'lucide-react'
import UsernameChat from '../UsernameChat'
import LiveAudioButton from './LiveAudioButton'
import QnABoard from './engagement/QnABoard'
import RaiseHandButton from './engagement/RaiseHandButton'
import TeacherHandQueueModal from './engagement/TeacherHandQueueModal'

function LiveClassSidePanel({ owned, chatStorageKey }) {
  const [activeTab, setActiveTab] = useState('chat') // 'chat' or 'qna'

  return (
    <div className="live-side-shell">
      <div className="live-side-content">
        <div className="qna-tabs-header">
          <button
            type="button"
            className={`qna-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
            aria-selected={activeTab === 'chat'}
          >
            <MessageSquare size={15} aria-hidden="true" />
            <span>Chat</span>
          </button>
          <button
            type="button"
            className={`qna-tab-btn ${activeTab === 'qna' ? 'active' : ''}`}
            onClick={() => setActiveTab('qna')}
            aria-selected={activeTab === 'qna'}
          >
            <HelpCircle size={15} aria-hidden="true" />
            <span>Q&amp;A</span>
          </button>
        </div>

        {/* Panel content fills available height */}
        <div className="live-chat-box" style={{ padding: 0 }}>
          {activeTab === 'chat' ? (
            <UsernameChat chatStorageKey={chatStorageKey} isTeacher={owned} />
          ) : (
            <QnABoard owned={owned} />
          )}
        </div>

        {/* Audio & Hand controls pinned at bottom */}
        <div className="live-audio-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <h4 style={{ margin: 0 }}>Audio &amp; Voice</h4>
            {owned && <TeacherHandQueueModal />}
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <LiveAudioButton owned={owned} />
            </div>
            {!owned && <RaiseHandButton />}
          </div>
        </div>
      </div>

      <RoomAudioRenderer />
    </div>
  )
}

export default LiveClassSidePanel
