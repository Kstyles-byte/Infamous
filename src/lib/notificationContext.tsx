import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { NotificationBanner } from '../components/NotificationBanner';
import { useNotifications, Notification } from '../hooks/useNotifications';

interface NotificationContextType {
  showNotification: (notification: { 
    title: string; 
    message: string; 
    type?: 'success' | 'info' | 'warning' | 'error' | 'rank'; 
    duration?: number;
  }) => void;
  unreadCount: number;
  markAllAsRead: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [activeNotification, setActiveNotification] = useState<{
    id: string;
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error' | 'rank';
    duration: number;
  } | null>(null);

  const { 
    notifications, 
    unreadCount,
    markAsRead,
    markAllAsRead 
  } = useNotifications();

  // Function to show a notification
  const showNotification = useCallback((notification: { 
    title: string; 
    message: string; 
    type?: 'success' | 'info' | 'warning' | 'error' | 'rank'; 
    duration?: number;
  }) => {
    const id = Date.now().toString();
    setActiveNotification({
      id,
      title: notification.title,
      message: notification.message,
      type: notification.type || 'info',
      duration: notification.duration || 5000
    });
  }, []);

  // Clear the active notification
  const handleClose = useCallback(() => {
    setActiveNotification(null);
  }, []);

  // Show new notifications as they come in
  useEffect(() => {
    // Find the first unread notification of type 'rank_change'
    const unreadRankNotification = notifications.find(
      (notification) => !notification.is_read && notification.type === 'rank'
    );

    if (unreadRankNotification && !activeNotification) {
      showNotification({
        title: unreadRankNotification.title,
        message: unreadRankNotification.message,
        type: 'rank',
        duration: 7000 // Show rank notifications a bit longer
      });

      // Mark it as read
      markAsRead(unreadRankNotification.id);
    }
  }, [notifications, activeNotification, markAsRead, showNotification]);

  return (
    <NotificationContext.Provider 
      value={{ 
        showNotification,
        unreadCount,
        markAllAsRead
      }}
    >
      {children}
      {activeNotification && (
        <NotificationBanner
          title={activeNotification.title}
          message={activeNotification.message}
          type={activeNotification.type}
          duration={activeNotification.duration}
          onClose={handleClose}
        />
      )}
    </NotificationContext.Provider>
  );
}

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}; 