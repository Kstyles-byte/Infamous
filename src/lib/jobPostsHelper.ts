import { supabase } from './supabase';
import { addPointsToUser, POINTS_VALUES } from './pointsSystem';
import { useNotificationContext } from './notificationContext';

// Interface for job post data
export interface JobPostData {
  title: string;
  description: string;
  budget?: number;
  location?: string;
  required_skills?: string[];
  category: string;
  is_remote?: boolean;
  deadline?: string;
  job_type: string;
  price?: string;
  duration?: string;
}

/**
 * Create a new job post and award points to the author
 * @param authorId The ID of the post author
 * @param postData The job post data
 * @returns Object containing success status and post data or error
 */
export const createJobPost = async (authorId: string, postData: JobPostData): Promise<{
  success: boolean;
  data?: any;
  error?: any;
  pointsAdded?: number;
  newPoints?: number;
}> => {
  try {
    // Create the job post
    const { data: jobPost, error: postError } = await supabase
      .from('job_posts')
      .insert({
        author_id: authorId,
        title: postData.title,
        description: postData.description,
        location: postData.location,
        job_type: postData.job_type,
        price: postData.price,
        duration: postData.duration,
      })
      .select()
      .single();
      
    if (postError) {
      console.error('Error creating job post:', postError);
      return { success: false, pointsAdded: 0, error: postError };
    }
    
    // Award points for creating a job post
    const pointsResult = await addPointsToUser(
      authorId,
      POINTS_VALUES.CREATE_POST,
      'Created a new job post'
    );
    
    // Fetch the latest profile data to get the updated points
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', authorId)
      .single();
      
    if (profileError) {
      console.error('Error fetching updated profile:', profileError);
    }
    
    return {
      success: true,
      data: jobPost,
      pointsAdded: POINTS_VALUES.CREATE_POST,
      newPoints: updatedProfile?.points
    };
  } catch (error) {
    console.error('Error in createJobPost:', error);
    return { success: false, pointsAdded: 0, error };
  }
};

/**
 * Hook to work with job posts and points
 */
export const useJobPosts = () => {
  const { showNotification } = useNotificationContext();

  // Create a job post with notification
  const createPost = async (authorId: string, postData: JobPostData) => {
    const result = await createJobPost(authorId, postData);
    
    if (result.success) {
      showNotification({
        title: 'Job Post Created',
        message: `You earned ${result.pointsAdded} points for creating a job post!`,
        type: 'success'
      });
      return result;
    } else {
      showNotification({
        title: 'Error',
        message: 'Failed to create job post. Please try again.',
        type: 'error'
      });
      return result;
    }
  };

  return {
    createPost,
  };
}; 