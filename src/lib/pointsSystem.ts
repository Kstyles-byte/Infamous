import { supabase } from './supabase';

// Simple event emitter for React Native
class SimpleEventEmitter {
  private listeners: Record<string, Function[]> = {};

  on(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Function): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: string, data: any): void {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error('Error in event listener:', err);
      }
    });
  }
}

// Create an event emitter for points updates
export const pointsEventEmitter = new SimpleEventEmitter();

// Point values for different actions
export const POINTS_VALUES = {
  DAILY_LOGIN: 10,
  CREATE_POST: 25,
  RECEIVED_JOB: 50,
  COMPLETED_JOB: 100,
  POSITIVE_REVIEW: 20,
  PROFILE_COMPLETION: 15,
};

// Rank thresholds
export const RANKS = [
  { name: 'Beginner', minPoints: 0, maxPoints: 99 },
  { name: 'Apprentice', minPoints: 100, maxPoints: 299 },
  { name: 'Skilled', minPoints: 300, maxPoints: 699 },
  { name: 'Expert', minPoints: 700, maxPoints: 1499 },
  { name: 'Master', minPoints: 1500, maxPoints: 2999 },
  { name: 'Grandmaster', minPoints: 3000, maxPoints: Number.MAX_SAFE_INTEGER },
];

// Get the rank for a given number of points
export const getRankByPoints = (points: number): string => {
  const rank = RANKS.find(r => points >= r.minPoints && points <= r.maxPoints);
  return rank ? rank.name : 'Beginner';
};

// Calculate points needed for next rank
export const getPointsForNextRank = (currentPoints: number): { nextRank: string, pointsNeeded: number } => {
  const currentRankIndex = RANKS.findIndex(r => 
    currentPoints >= r.minPoints && currentPoints <= r.maxPoints
  );
  
  if (currentRankIndex === RANKS.length - 1) {
    // Already at the highest rank
    return { nextRank: RANKS[currentRankIndex].name, pointsNeeded: 0 };
  }
  
  const nextRank = RANKS[currentRankIndex + 1];
  const pointsNeeded = nextRank.minPoints - currentPoints;
  
  return { nextRank: nextRank.name, pointsNeeded };
};

// Add points to a user and return their updated profile
export const addPointsToUser = async (userId: string, pointsToAdd: number, reason: string): Promise<{ 
  success: boolean; 
  oldPoints?: number; 
  newPoints?: number; 
  oldRank?: string; 
  newRank?: string;
  error?: any;
}> => {
  try {
    // First get the current points
    const { data: profileData, error: fetchError } = await supabase
      .from('profiles')
      .select('points, rank')
      .eq('id', userId)
      .single();
      
    if (fetchError) {
      console.error('Error fetching profile:', fetchError);
      return { success: false, error: fetchError };
    }
    
    const oldPoints = profileData?.points || 0;
    const oldRank = profileData?.rank || 'Beginner';
    const newPoints = oldPoints + pointsToAdd;
    
    // Update the points in the database
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', userId)
      .select('points, rank');
      
    if (updateError) {
      console.error('Error updating points:', updateError);
      return { success: false, error: updateError };
    }
    
    // The rank will be updated automatically by the database trigger
    const newRank = data?.[0]?.rank || oldRank;
    
    // Log the points activity
    await supabase.from('points_activity').insert({
      user_id: userId,
      points: pointsToAdd,
      reason,
      created_at: new Date().toISOString(),
    });
    
    // Emit an event for the points update
    pointsEventEmitter.emit('pointsUpdated', {
      userId,
      oldPoints,
      newPoints,
      oldRank,
      newRank
    });
    
    return {
      success: true,
      oldPoints,
      newPoints,
      oldRank,
      newRank
    };
  } catch (error) {
    console.error('Error in addPointsToUser:', error);
    return { success: false, error };
  }
};

// Update last login date and add daily login points if eligible
export const updateLoginAndAddPoints = async (userId: string): Promise<void> => {
  try {
    // Get the user's last login date
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('last_login_date')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error('Error fetching user data:', userError);
      return;
    }
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const lastLoginDate = userData?.last_login_date?.split('T')[0];
    
    // If last login was not today, award points for a new daily login
    if (lastLoginDate !== today) {
      // Add points
      await addPointsToUser(userId, POINTS_VALUES.DAILY_LOGIN, 'Daily login');
      
      // Update last login date
      await supabase
        .from('profiles')
        .update({ last_login_date: new Date().toISOString() })
        .eq('id', userId);
    }
  } catch (error) {
    console.error('Error in updateLoginAndAddPoints:', error);
  }
}; 