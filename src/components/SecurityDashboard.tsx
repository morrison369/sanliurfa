/**
 * Security Dashboard Component
 * View active sessions and security events
 */

import { useEffect, useState } from 'react';

interface Session {
  id: string;
  device_name: string;
  browser: string;
  os: string;
  ip_address: string;
  location: string;
  last_activity_at: string;
  is_mobile: boolean;
  is_trusted: boolean;
}

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  ip_address: string;
  description: string;
  is_suspicious: boolean;
  created_at: string;
}

export function SecurityDashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'sessions' | 'events'>('sessions');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, eventsRes] = await Promise.all([
        fetch('/api/security/sessions'),
        fetch('/api/security/events')
      ]);

      const sessionsData = await sessionsRes.json();
      const eventsData = await eventsRes.json();

      if (sessionsData.success) setSessions(sessionsData.data);
      if (eventsData.success) setEvents(eventsData.data.events);
    } catch (error) {
      console.error('Failed to load security data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/security/sessions?session_id=${sessionId}`, { method: 'DELETE' });
      if (response.ok) {
        setSessions(sessions.filter(s => s.id !== sessionId));
      }
    } catch (error) {
      console.error('Failed to terminate session', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setTab('sessions')}
          className={`px-4 py-2 ${tab === 'sessions' ? 'border-b-2 border-blue-600 font-bold' : 'text-gray-600'}`}
        >
          Aktif Oturumlar ({sessions.length})
        </button>
        <button
          onClick={() => setTab('events')}
          className={`px-4 py-2 ${tab === 'events' ? 'border-b-2 border-blue-600 font-bold' : 'text-gray-600'}`}
        >
          Güvenlik Olayları ({events.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
      ) : (
        <>
          {tab === 'sessions' && (
            <div className="space-y-3">
              {sessions.length === 0 ? (
                <p className="text-gray-500">Aktif oturum yok</p>
              ) : (
                sessions.map(session => (
                  <div key={session.id} className="bg-white border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold">{session.device_name}</p>
                        <p className="text-sm text-gray-600">{session.browser} • {session.os}</p>
                        <p className="text-sm text-gray-500 mt-1">IP: {session.ip_address}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Son etkinlik: {new Date(session.last_activity_at).toLocaleString('tr-TR')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleTerminateSession(session.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Kapat
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'events' && (
            <div className="space-y-3">
              {events.length === 0 ? (
                <p className="text-gray-500">Güvenlik olayı yok</p>
              ) : (
                events.map(event => (
                  <div key={event.id} className="bg-white border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex gap-2 items-center">
                          <span className={`text-xs px-2 py-1 rounded font-medium ${getSeverityColor(event.severity)}`}>
                            {event.severity.toUpperCase()}
                          </span>
                          {event.is_suspicious && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-medium">⚠ ŞÜPHELİ</span>
                          )}
                        </div>
                        <p className="font-bold mt-2">{event.event_type}</p>
                        <p className="text-sm text-gray-600">{event.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          IP: {event.ip_address} • {new Date(event.created_at).toLocaleString('tr-TR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
