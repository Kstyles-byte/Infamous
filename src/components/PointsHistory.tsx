import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { supabase } from '../lib/supabase';
import { ThemedText } from '@/components/ThemedText';

interface PointActivity {
  id: string;
  points: number;
  reason: string;
  created_at: string;
}

interface PointsHistoryProps {
  userId: string;
  limit?: number;
}

export const PointsHistory: React.FC<PointsHistoryProps> = ({ userId, limit = 10 }) => {
  const [activities, setActivities] = useState<PointActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPointsHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('points_activity')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);
          
        if (error) {
          console.error('Error fetching points history:', error);
          setError('Failed to load points history');
        } else {
          setActivities(data || []);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPointsHistory();
  }, [userId, limit]);

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec} seconds ago`;
    
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
    
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs} hour${diffHrs !== 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
    
    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
  };

  const renderPointActivity = ({ item }: { item: PointActivity }) => {
    const isPositive = item.points > 0;
    const timeAgo = getTimeAgo(item.created_at);
    
    return (
      <View style={styles.activityItem}>
        <View style={styles.activityHeader}>
          <ThemedText style={[styles.points, isPositive ? styles.positive : styles.negative]}>
            {isPositive ? '+' : ''}{item.points}
          </ThemedText>
          <ThemedText style={styles.timestamp}>{timeAgo}</ThemedText>
        </View>
        <ThemedText style={styles.reason}>{item.reason}</ThemedText>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#146383" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </View>
    );
  }

  if (activities.length === 0) {
    return (
      <View style={styles.centered}>
        <ThemedText style={styles.emptyText}>No points activity yet</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={activities}
        renderItem={renderPointActivity}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContent: {
    paddingVertical: 8,
  },
  activityItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  points: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#F44336',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  reason: {
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    color: '#F44336',
    textAlign: 'center',
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
}); 