import { useState, useMemo } from 'react';

interface EventItem {
  id: string;
  title: string;
  slug: string;
  start_date: string;
  end_date?: string;
  location?: string;
  category?: string;
  is_free: boolean;
  image_url?: string;
}

interface Props {
  events: EventItem[];
}

const MONTHS_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const DAYS_TR = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Pzt=0
}

export default function EventCalendarToggle({ events }: Props) {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const eventsByDate = useMemo(() => {
    const map: Record<string, EventItem[]> = {};
    events.forEach((ev) => {
      const key = ev.start_date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [events]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <div className="ect-root">
      <div className="ect-toggle-bar">
        <button
          className={`ect-toggle-btn${view === 'list' ? ' ect-active' : ''}`}
          onClick={() => setView('list')}
          aria-pressed={view === 'list'}
        >
          ☰ Liste
        </button>
        <button
          className={`ect-toggle-btn${view === 'calendar' ? ' ect-active' : ''}`}
          onClick={() => setView('calendar')}
          aria-pressed={view === 'calendar'}
        >
          📅 Takvim
        </button>
      </div>

      {view === 'calendar' && (
        <div className="ect-calendar">
          <div className="ect-cal-header">
            <button className="ect-nav-btn" onClick={prevMonth} aria-label="Önceki ay">‹</button>
            <span className="ect-month-label">{MONTHS_TR[calMonth]} {calYear}</span>
            <button className="ect-nav-btn" onClick={nextMonth} aria-label="Sonraki ay">›</button>
          </div>
          <div className="ect-cal-grid">
            {DAYS_TR.map((d) => (
              <div key={d} className="ect-day-header">{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="ect-day ect-day-empty" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = eventsByDate[dateKey] || [];
              const isToday = dateKey === today;
              return (
                <div key={day} className={`ect-day${isToday ? ' ect-today' : ''}${dayEvents.length > 0 ? ' ect-has-event' : ''}`}>
                  <span className="ect-day-num">{day}</span>
                  {dayEvents.slice(0, 2).map((ev) => (
                    <a key={ev.id} href={`/etkinlikler/${ev.slug}`} className="ect-event-dot" title={ev.title}>
                      <span className="ect-event-label">{ev.title}</span>
                    </a>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="ect-more">+{dayEvents.length - 2}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .ect-root { width: 100%; }
        .ect-toggle-bar {
          display: flex; gap: .5rem; margin-bottom: 1.5rem;
        }
        .ect-toggle-btn {
          padding: .5rem 1.1rem; border-radius: .6rem; border: 1px solid rgba(184,115,51,.25);
          background: transparent; font-size: .85rem; font-weight: 600; cursor: pointer;
          color: var(--text-primary, #1a1a1a); transition: background .15s, color .15s;
        }
        .ect-active {
          background: var(--urfa-600, #b87333); color: #fff; border-color: transparent;
        }
        .ect-calendar {
          background: var(--bg-card, #fff);
          border: 1px solid rgba(184,115,51,.13);
          border-radius: 1rem; padding: 1.25rem; margin-bottom: 1.5rem;
        }
        .ect-cal-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 1rem;
        }
        .ect-month-label { font-weight: 700; font-size: 1rem; }
        .ect-nav-btn {
          background: none; border: none; font-size: 1.4rem; cursor: pointer;
          padding: .2rem .5rem; border-radius: .4rem; line-height: 1;
          color: var(--text-primary, #1a1a1a);
        }
        .ect-nav-btn:hover { background: rgba(184,115,51,.1); }
        .ect-cal-grid {
          display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;
        }
        .ect-day-header {
          text-align: center; font-size: .7rem; font-weight: 700;
          color: var(--text-muted, #777); padding: .3rem 0;
          letter-spacing: .05em; text-transform: uppercase;
        }
        .ect-day {
          min-height: 4.5rem; border-radius: .4rem; padding: .25rem .2rem;
          border: 1px solid transparent; position: relative;
          background: rgba(0,0,0,.02);
        }
        .ect-day-empty { background: transparent; border-color: transparent; }
        .ect-today { border-color: rgba(184,115,51,.4) !important; background: rgba(184,115,51,.06); }
        .ect-has-event { background: rgba(184,115,51,.04); }
        .ect-day-num {
          display: block; font-size: .75rem; font-weight: 600;
          color: var(--text-secondary, #555); margin-bottom: .15rem;
        }
        .ect-today .ect-day-num { color: var(--urfa-600, #b87333); }
        .ect-event-dot {
          display: block; background: var(--urfa-600, #b87333);
          border-radius: .2rem; padding: .1rem .25rem; margin-bottom: .1rem;
          text-decoration: none;
        }
        .ect-event-label {
          display: block; font-size: .6rem; font-weight: 600; color: #fff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 100%;
        }
        .ect-more { font-size: .6rem; color: var(--text-muted, #777); }
        @media (max-width: 600px) {
          .ect-day { min-height: 3rem; }
          .ect-event-label { display: none; }
          .ect-event-dot { width: 6px; height: 6px; padding: 0; border-radius: 50%; display: inline-block; }
        }
      `}</style>
    </div>
  );
}
