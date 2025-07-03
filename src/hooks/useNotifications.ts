import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error' | 'rank';
  created_at: string;
  is_read: boolean;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to determine notification type
  const getNotificationType = (dbType: string): Notification['type'] => {
    switch (dbType) {
      case 'rank_change':
        return 'rank';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'success':
        return 'success';
      default:
        return 'info';
    }
  };

  // Fetch notifications from the database
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Get notifications from the database
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching notifications:', error);
          setError(error.message);
        } else {
          // Convert to our Notification type and set state
          const typedNotifications: Notification[] = data.map((item: any) => ({
            id: item.id,
            title: item.title,
            message: item.message,
            type: getNotificationType(item.type),
            created_at: item.created_at,
            is_read: item.is_read
          }));
          
          setNotifications(typedNotifications);
          
          // Count unread notifications
          const unread = typedNotifications.filter(n => !n.is_read).length;
          setUnreadCount(unread);
        }
      }
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
      setError('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark a notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
        
      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      return true;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return false;
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
          
        if (error) {
          console.error('Error marking all notifications as read:', error);
          return false;
        }
        
        // Update local state
        setNotifications(prev => 
          prev.map(n => ({ ...n, is_read: true }))
        );
        
        // Reset unread count
        setUnreadCount(0);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return false;
    }
  };

  // Delete a notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
        
      if (error) {
        console.error('Error deleting notification:', error);
        return false;
      }
      
      // Update local state
      const deleted = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count if necessary
      if (deleted && !deleted.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      return false;
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Setup real-time listeners for new notifications
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      // Subscribe to notification changes
      const subscription = supabase
        .channel('public:notifications')
        .on(
          'postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          }, 
          (payload) => {
            const newNotification = payload.new as any;
            
            // Add to our notifications list
            const typedNotification: Notification = {
              id: newNotification.id,
              title: newNotification.title,
              message: newNotification.message,
              type: getNotificationType(newNotification.type),
              created_at: newNotification.created_at,
              is_read: newNotification.is_read
            };
            
            setNotifications(prev => [typedNotification, ...prev]);
            
            // Update unread count
            if (!newNotification.is_read) {
              setUnreadCount(prev => prev + 1);
            }
          }
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    };
    
    setupSubscription();
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };
}; 