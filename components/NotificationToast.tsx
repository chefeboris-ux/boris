
import React, { useEffect, useState } from 'react';
import { Notification } from '../types.ts';

interface NotificationToastProps {
  notifications: Notification[];
  removeNotification: (id: string) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notifications, removeNotification }) => {
  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col space-y-3 pointer-events-none">
      {notifications.map((notif) => (
        <ToastItem key={notif.id} notification={notif} onRemove={() => removeNotification(notif.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ notification: Notification; onRemove: () => void }> = ({ notification, onRemove }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onRemove, 300); // Wait for exit animation
    }, 5000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  const icons = {
    info: 'fa-circle-info text-blue-500',
    success: 'fa-check-circle text-emerald-500',
    warning: 'fa-triangle-exclamation text-amber-500',
  };

  const borderColors = {
    info: 'border-blue-100',
    success: 'border-emerald-100',
    warning: 'border-amber-100',
  };

  return (
    <div
      className={`pointer-events-auto w-80 bg-white/90 backdrop-blur-md border ${borderColors[notification.type]} shadow-2xl rounded-2xl p-4 transition-all duration-300 transform ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 pt-0.5">
          <i className={`fas ${icons[notification.type]} text-lg`}></i>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-slate-800 font-medium leading-snug">{notification.message}</p>
          <p className="mt-2 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onRemove, 300);
          }}
          className="ml-4 flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors"
        >
          <i className="fas fa-times text-xs"></i>
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
