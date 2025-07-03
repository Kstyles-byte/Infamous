import { supabase } from './supabase';

/**
 * Fetch workers sorted by points (highest first)
 * @param limit Number of workers to fetch
 * @returns Array of worker profiles
 */
export const fetchTopWorkers = async (limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_worker', true)
      .order('points', { ascending: false })
      .limit(limit);
      
    if (error) {
      console.error('Error fetching top workers:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchTopWorkers:', error);
    return [];
  }
};

/**
 * Fetch job posts sorted by author points (highest first)
 * @param limit Number of posts to fetch
 * @returns Array of job posts
 */
export const fetchPrioritizedJobPosts = async (limit = 20) => {
  try {
    // Join job_posts with profiles to get author's points
    const { data, error } = await supabase
      .from('job_posts')
      .select(`
        *,
        author:profiles(id, points, rank)
      `)
      .eq('status', 'open')
      .order('created_at', { ascending: false }) // First sort by creation date
      .limit(limit);
      
    if (error) {
      console.error('Error fetching prioritized job posts:', error);
      return [];
    }
    
    // Sort posts by author's points (highest first)
    const sortedPosts = (data || []).sort((a, b) => {
      const aPoints = a.author?.points || 0;
      const bPoints = b.author?.points || 0;
      return bPoints - aPoints;
    });
    
    return sortedPosts;
  } catch (error) {
    console.error('Error in fetchPrioritizedJobPosts:', error);
    return [];
  }
};

/**
 * Fetch combined data for the home feed
 * @returns Object containing top workers and prioritized job posts
 */
export const fetchHomeFeed = async () => {
  const [workers, posts] = await Promise.all([
    fetchTopWorkers(5),
    fetchPrioritizedJobPosts(15)
  ]);
  
  return {
    topWorkers: workers,
    prioritizedPosts: posts
  };
}; 