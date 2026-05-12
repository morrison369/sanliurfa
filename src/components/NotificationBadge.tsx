import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
export default function NotificationBadge() {
 const [unreadCount, setUnreadCount] = useState(0);

 useEffect(() => {
 loadUnreadCount();
 const interval = setInterval(loadUnreadCount, 30000);
 return () => clearInterval(interval);
 }, []);

 const loadUnreadCount = async () => {
 try {
 const response = await fetch('/api/notifications?filter=unread&limit=1');
 if (!response.ok) return;
 const data = await response.json();
 setUnreadCount(data.count || 0);
 } catch (err) {
 console.error('Failed to load unread count', err);
 }
 };

 return (
 <a href="/bildirimler" className="relative p-2 text-[#7A6B58] hover:text-[#1F1410] transition-colors">
 <Bell className="w-5 h-5" />
 {unreadCount > 0 && (
 <span className="absolute top-1 right-1 w-5 h-5 bg-[rgba(239,68,68,0.1)]0 text-white text-xs rounded-full flex items-center justify-center font-bold">
 {unreadCount > 9 ? '9+' : unreadCount}
 </span>
 )}
 </a>
 );
}
