import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, Image, TextInput, Modal, Platform, ActivityIndicator, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { MaterialIcons, FontAwesome, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Post } from '@/src/components/Post';
import { STATES } from '@/src/constants/stateAreas';
import { useAuth } from '@/src/lib/authContext';
import { supabase } from '@/src/lib/supabase';
import { fetchHomeFeed } from '@/src/lib/homeHelper';
import { pointsEventEmitter, addPointsToUser, POINTS_VALUES } from '../../lib/pointsSystem';
import { uploadImage as uploadToCloudinary, isCloudinaryUrl } from '@/src/lib/cloudinary';

// Mock category data for display
const CATEGORIES = [
  { id: '1', name: 'Electrician', icon: 'bolt' },
  { id: '2', name: 'Plumbing', icon: 'tint' },
  { id: '3', name: 'Carpentry', icon: 'hammer' },
  { id: '4', name: 'Painting', icon: 'paint-brush' },
  { id: '5', name: 'Gardening', icon: 'leaf' },
  { id: '6', name: 'Cleaning', icon: 'broom' },
];

// Mock featured workers
const FEATURED_WORKERS = [
  { id: '1', name: 'John Smith', job: 'Electrician', rating: 4.9, image: null },
  { id: '2', name: 'Jane Doe', job: 'Plumber', rating: 4.8, image: null },
  { id: '3', name: 'Mike Johnson', job: 'Carpenter', rating: 4.7, image: null },
];

// Define post types
const POST_TYPES = {
  SHOWCASE: 'showcase',
  JOB: 'job',
  UPDATE: 'update'
};

// Define job types
const JOB_TYPES = [
  { id: 'full-time', name: 'Full Time' },
  { id: 'part-time', name: 'Part Time' },
  { id: 'contract', name: 'Contract' },
  { id: 'intern', name: 'Internship' },
];

// Type definitions for our app
interface Area {
  id: string;
  name: string;
  stateId: string;
}

interface State {
  id: string;
  name: string;
  code: string;
  areas: Area[];
}

interface User {
  id: string;
  name: string;
  avatar?: string | null;
  rank: string;
  points: number;
}

interface Post {
  id: string;
  content: string;
  type: string;
  title?: string;
  job_type?: string;
  location?: string;
  created_at: string;
  images: string[];
  likes_count: number;
  comments_count: number;
  user: {
    id: string;
    full_name: string;
    name?: string;  // For backward compatibility
    avatar_url: string | null;
    rank: string;
    points: number;
  };
}

// Mock posts for development
const MOCK_POSTS: Post[] = [
  {
    id: '1',
    type: 'update',
    content: 'Just completed a major electrical installation project!',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    images: [],
    likes_count: 12,
    comments_count: 3,
    user: {
      id: '1',
      full_name: 'John Smith',
      avatar_url: null,
      rank: 'Expert',
      points: 850
    }
  },
  {
    id: '2',
    type: 'showcase',
    content: 'Check out this plumbing work I did today',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    images: [],
    likes_count: 8,
    comments_count: 1,
    user: {
      id: '2',
      full_name: 'Jane Doe',
      avatar_url: null,
      rank: 'Master',
      points: 1600
    }
  },
  {
    id: '3',
    type: 'job',
    title: 'Need an experienced carpenter',
    content: 'Looking for someone to build custom cabinets',
    job_type: 'contract',
    location: 'Lagos, Nigeria',
    created_at: new Date(Date.now() - 10800000).toISOString(),
    images: [],
    likes_count: 4,
    comments_count: 6,
    user: {
      id: '3',
      full_name: 'Mike Johnson',
      avatar_url: null,
      rank: 'Skilled',
      points: 450
    }
  }
];

const getInitialsAvatar = (name: string | null | undefined): string => {
  if (!name || typeof name !== 'string') return 'A';
  return name.trim().charAt(0).toUpperCase() || 'A';
};

const stringToColor = (str: string | null | undefined): string => {
  if (!str || typeof str !== 'string') {
    return '#146383'; // Default color if string is null/undefined
  }
  
  let hash = 0;
  const string = str.trim();
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#146383', '#eb7334', '#4CAF50', '#9C27B0', '#FF5722'];
  return colors[Math.abs(hash) % colors.length];
};

// Function to validate and fix image URLs
const validateImageUrl = (url: string): string => {
  if (!url) return '';
  
  // If it's already a valid URL, return it
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Check if it's a Cloudinary URL that might be missing the protocol
  if (url.includes('cloudinary.com')) {
    return url.startsWith('//') ? `https:${url}` : `https://${url}`;
  }
  
  // For Supabase storage URLs
  if (url.includes('supabase.co')) {
    return url.startsWith('//') ? `https:${url}` : `https://${url}`;
  }
  
  // If it's a local URI (file://) return as is
  if (url.startsWith('file://')) {
    return url;
  }
  
  // For other cases, assume https
  return `https://${url}`;
};

const renderIcon = (iconName: string) => {
  // This is a simplified approach. In a real app, you'd want a more robust icon mapping system
  return <FontAwesome name={iconName as any} size={24} color="#eb7334" />;
};

export default function HomeScreen() {
  const { session } = useAuth();
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postType, setPostType] = useState(POST_TYPES.UPDATE);
  const [postContent, setPostContent] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [jobType, setJobType] = useState('');
  const [location, setLocation] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [showStateList, setShowStateList] = useState(false);
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [showAreaList, setShowAreaList] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [availableBuckets, setAvailableBuckets] = useState<string[]>([]);
  const [selectedImageForView, setSelectedImageForView] = useState<string | null>(null);

  useEffect(() => {
    // Initial data loading
    loadPosts();
    
    // Check available storage buckets 
    checkAvailableBuckets();
  }, []);
  
  // Setup points update listener
  useEffect(() => {
    const handlePointsUpdated = (data: any) => {
      console.log('Points updated in Home screen:', data);
      // Reload posts to refresh points display
      loadPosts();
    };
    
    // Add event listener
    pointsEventEmitter.on('pointsUpdated', handlePointsUpdated);
    
    // Clean up function
    return () => {
      pointsEventEmitter.removeListener('pointsUpdated', handlePointsUpdated);
    };
  }, []);

  const checkAvailableBuckets = async () => {
    try {
      // This is a workaround since there's no direct method to list buckets
      // Try to access a known bucket to see if it exists
      const { data: bucketExists, error: bucketError } = await supabase.storage
        .from('images')
        .list('');
        
      if (!bucketError) {
        setAvailableBuckets(prev => [...prev, 'images']);
        console.log('Found bucket: images');
      }
      
      // Try another potential bucket
      const { data: postImagesExists, error: postImagesError } = await supabase.storage
        .from('post_images')
        .list('');
        
      if (!postImagesError) {
        setAvailableBuckets(prev => [...prev, 'post_images']);
        console.log('Found bucket: post_images');
      }
      
      // If no buckets found, log a warning
      if (bucketError && postImagesError) {
        console.warn('No storage buckets found. Image uploads will not work.');
      }
    } catch (error) {
      console.error('Error checking storage buckets:', error);
    }
  };

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      // Request posts from the server
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching posts:', error);
        return;
      }
      
      if (data && data.length > 0) {
        // For each post, get the user info
        const postsWithUsers = await Promise.all(data.map(async (post) => {
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, rank, points')
            .eq('id', post.user_id)
            .single();
          
          if (userError) {
            console.error('Error fetching user data:', userError);
            return {
              ...post,
              images: post.images || [],
              likes_count: post.likes_count || 0,
              comments_count: post.comments_count || 0,
              user: {
                id: post.user_id,
                full_name: 'Anonymous',
                avatar_url: null,
                rank: 'Beginner',
                points: 0
              }
            };
          }
          
          // Ensure images is always an array
          const processedImages = Array.isArray(post.images) ? post.images : [];
          
          return {
            ...post,
            images: processedImages,
            likes_count: post.likes_count || 0,
            comments_count: post.comments_count || 0,
            user: {
              id: userData.id,
              full_name: userData.full_name || 'Anonymous',
              avatar_url: userData.avatar_url,
              rank: userData.rank || 'Beginner',
              points: userData.points || 0
            }
          };
        }));
        
        setPosts(postsWithUsers);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      // First, try to upload to Cloudinary (preferred permanent storage)
      const cloudinaryResult = await uploadToCloudinary(uri);
      if (cloudinaryResult.success && cloudinaryResult.url) {
        return cloudinaryResult.url;
      }
      
      // If Cloudinary fails, fallback to Supabase storage
      
      // First, fetch the image data
      const response = await fetch(uri);
      const blob = await response.blob();

      // For development, if no buckets are available, just return the local URI
      if (availableBuckets.length === 0) {
        return uri;
      }

      // Choose the first available bucket
      const bucketName = availableBuckets[0];
      
      // Convert to base64 for upload
      const fileReader = new FileReader();
      fileReader.readAsDataURL(blob);

      return new Promise((resolve, reject) => {
        fileReader.onload = async () => {
          if (typeof fileReader.result !== 'string') {
            reject('Failed to convert image');
            return;
          }

          // Extract base64 data
          const base64Data = fileReader.result.split(',')[1];
          
          // Generate a unique file name
          const fileName = `${new Date().getTime()}-${Math.random().toString(36).substring(2, 15)}.jpg`;
          const filePath = `${fileName}`;

          // Upload to Supabase storage using available bucket
          const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(filePath, decode(base64Data), {
              contentType: 'image/jpeg',
            });

          if (error) {
            console.error('Error uploading image to Supabase:', error);
            
            // Fallback to local URI if upload fails
            resolve(uri);
            return;
          }

          // Get the public URL
          const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);

          resolve(urlData.publicUrl);
        };

        fileReader.onerror = (error) => {
          console.error('FileReader error:', error);
          // Fallback to local URI if FileReader fails
          resolve(uri);
        };
      });
    } catch (error) {
      console.error('Error in uploadImage:', error);
      return uri; // Return original URI as fallback
    }
  };

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });
      
      if (!result.canceled) {
        setSelectedImages([...selectedImages, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const createPost = async () => {
    if (!session) {
      console.error('User not logged in');
      alert('You must be logged in to create a post');
      return;
    }

    // Common validation for all post types
    if (!postContent.trim()) {
      alert('Please enter some content for your post');
      return;
    }

    // Post type specific validation
    if (postType === POST_TYPES.JOB) {
      if (!postTitle.trim()) {
        alert('Please enter a job title');
        return;
      }
      
      if (!jobType) {
        alert('Please select a job type');
        return;
      }
      
      if (!location && !(selectedState && selectedArea)) {
        alert('Please specify a location');
        return;
      }
    } else if (postType === POST_TYPES.SHOWCASE && selectedImages.length === 0) {
      // Optional: Warn user if they try to create a showcase post without images
      const proceed = confirm('You haven\'t added any images to your showcase. Continue anyway?');
      if (!proceed) return;
    }

    setIsCreatingPost(true);
    
    try {
      // Upload images if any
      let imageUrls: string[] = [];
      
      if (selectedImages.length > 0) {
        // Show upload progress message
        alert('Uploading images... Please wait.');
        
        const uploadPromises = selectedImages.map(uri => uploadImage(uri));
        const results = await Promise.all(uploadPromises);
        // Filter out nulls and check if we have any successful uploads
        imageUrls = results.filter((url): url is string => url !== null);
        
        if (postType === POST_TYPES.SHOWCASE && selectedImages.length > 0 && imageUrls.length === 0) {
          // All image uploads failed for a showcase post
          alert('All image uploads failed. Please try again or choose different images.');
          setIsCreatingPost(false);
          return;
        }
      }
      
      // Create the basic post data
      let postData: Record<string, any> = {
        type: postType,
        content: postContent,
        user_id: session.user.id,
        images: imageUrls,
      };
      
      // Add type-specific fields
      if (postType === POST_TYPES.JOB) {
        postData = {
          ...postData,
          title: postTitle.trim(),
          job_type: jobType,
          location: selectedState && selectedArea 
            ? `${selectedArea.name}, ${selectedState.name}` 
            : location.trim()
        };
      }
      
      // Insert the post
      const { data, error } = await supabase
        .from('posts')
        .insert(postData)
        .select();
        
      if (error) {
        console.error('Error creating post:', error);
        
        // Display user-friendly error message
        if (error.message.includes('violates foreign key constraint')) {
          alert('Error: There seems to be an issue with your user account. Please log out and log back in.');
        } else if (error.message.includes('violates check constraint')) {
          alert('Error: One or more fields have invalid values. Please check your input.');
        } else {
          alert(`Error creating post: ${error.message}`);
        }
        return;
      }
      
      // Award points for creating a post
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await addPointsToUser(
          user.id,
          POINTS_VALUES.CREATE_POST,
          'Created a new post'
        );
      }
      
      // Reset form and close modal
      resetFormAndCloseModal();
      
      // Show loading indicator and refresh posts
      setRefreshing(true);
      
      // Reload posts to show the new one
      await loadPosts();
      
      // Show a success message based on post type
      const successMessages = {
        [POST_TYPES.UPDATE]: 'Update posted successfully!',
        [POST_TYPES.SHOWCASE]: 'Showcase posted successfully!',
        [POST_TYPES.JOB]: 'Job posted successfully!'
      };
      
      alert(successMessages[postType]);
    } catch (error: any) {
      console.error('Error in createPost:', error);
      alert(`Failed to create post: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsCreatingPost(false);
    }
  };

  const resetFormAndCloseModal = () => {
    setPostContent('');
    setPostTitle('');
    setJobType('');
    setLocation('');
    setSelectedImages([]);
    setSelectedState(null);
    setSelectedArea(null);
    setShowCreatePost(false);
  };

  const renderCreatePostModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={showCreatePost}
        onRequestClose={() => resetFormAndCloseModal()}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Create Post</ThemedText>
            <TouchableOpacity onPress={() => resetFormAndCloseModal()}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.postTypeSelector}>
            <TouchableOpacity 
              style={[
                styles.postTypeButton,
                postType === POST_TYPES.UPDATE && styles.activePostType
              ]}
              onPress={() => setPostType(POST_TYPES.UPDATE)}
            >
              <ThemedText style={styles.postTypeText}>Update</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.postTypeButton,
                postType === POST_TYPES.SHOWCASE && styles.activePostType
              ]}
              onPress={() => setPostType(POST_TYPES.SHOWCASE)}
            >
              <ThemedText style={styles.postTypeText}>Showcase</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.postTypeButton,
                postType === POST_TYPES.JOB && styles.activePostType
              ]}
              onPress={() => setPostType(POST_TYPES.JOB)}
            >
              <ThemedText style={styles.postTypeText}>Job</ThemedText>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Different forms based on post type */}
            {postType === POST_TYPES.JOB && (
              <>
                <View style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel}>Job Title</ThemedText>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter job title"
                    value={postTitle}
                    onChangeText={setPostTitle}
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel}>Job Type</ThemedText>
                  <View style={styles.jobTypeContainer}>
                    {JOB_TYPES.map(type => (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          styles.jobTypeButton,
                          jobType === type.id && styles.activeJobType
                        ]}
                        onPress={() => setJobType(type.id)}
                      >
                        <ThemedText style={styles.jobTypeText}>{type.name}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <View style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel}>Location</ThemedText>
                  <TouchableOpacity 
                    style={styles.locationSelector}
                    onPress={() => setShowStateList(true)}
                  >
                    <ThemedText style={styles.locationSelectorText}>
                      {selectedState ? 
                        (selectedArea ? 
                          `${selectedArea.name}, ${selectedState.name}` : 
                          selectedState.name) : 
                        "Select a location"}
                    </ThemedText>
                    <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
              </>
            )}
            
            {postType === POST_TYPES.SHOWCASE && (
              <View style={styles.inputContainer}>
                <View style={styles.imagePickerContainer}>
                  <TouchableOpacity 
                    style={styles.imagePicker}
                    onPress={pickImage}
                  >
                    <Ionicons name="image" size={24} color="#666" />
                    <ThemedText style={styles.imagePickerText}>Add Images</ThemedText>
                  </TouchableOpacity>
                  
                  {selectedImages.length > 0 && (
                    <ScrollView horizontal style={styles.selectedImagesContainer}>
                      {selectedImages.map((uri, index) => (
                        <View key={index} style={styles.selectedImageWrapper}>
                          <Image source={{ uri }} style={styles.selectedImage} />
                          <TouchableOpacity 
                            style={styles.removeImageButton}
                            onPress={() => {
                              const newImages = [...selectedImages];
                              newImages.splice(index, 1);
                              setSelectedImages(newImages);
                            }}
                          >
                            <Ionicons name="close-circle" size={20} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>
            )}
            
            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>
                {postType === POST_TYPES.JOB ? 'Job Description' : 'Post Content'}
              </ThemedText>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder={postType === POST_TYPES.JOB ? 
                  "Describe the job requirements and details" : 
                  "What's on your mind?"}
                value={postContent}
                onChangeText={setPostContent}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
          
          <TouchableOpacity 
            style={[
              styles.postButton,
              (!postContent.trim() || isCreatingPost) && styles.disabledButton
            ]}
            onPress={createPost}
            disabled={!postContent.trim() || isCreatingPost}
          >
            {isCreatingPost ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <ThemedText style={styles.postButtonText}>Post</ThemedText>
            )}
          </TouchableOpacity>
          
          {/* State selection modal */}
          <Modal
            visible={showStateList}
            transparent
            animationType="slide"
            onRequestClose={() => setShowStateList(false)}
          >
            <View style={styles.selectModal}>
              <View style={styles.selectModalContent}>
                <View style={styles.selectModalHeader}>
                  <ThemedText style={styles.selectModalTitle}>Select State</ThemedText>
                  <TouchableOpacity onPress={() => setShowStateList(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.selectModalList}>
                  {STATES.map(state => (
                    <TouchableOpacity 
                      key={state.id}
                      style={styles.selectModalItem}
                      onPress={() => {
                        setSelectedState(state);
                        setSelectedArea(null);
                        setShowStateList(false);
                        setShowAreaList(true);
                      }}
                    >
                      <ThemedText style={styles.selectModalItemText}>{state.name}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
          
          {/* Area selection modal */}
          <Modal
            visible={showAreaList && selectedState !== null}
            transparent
            animationType="slide"
            onRequestClose={() => setShowAreaList(false)}
          >
            <View style={styles.selectModal}>
              <View style={styles.selectModalContent}>
                <View style={styles.selectModalHeader}>
                  <ThemedText style={styles.selectModalTitle}>
                    Select Area in {selectedState?.name}
                  </ThemedText>
                  <TouchableOpacity onPress={() => setShowAreaList(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.selectModalList}>
                  {selectedState?.areas?.map((area: Area) => (
                    <TouchableOpacity 
                      key={area.id}
                      style={styles.selectModalItem}
                      onPress={() => {
                        setSelectedArea(area);
                        setShowAreaList(false);
                      }}
                    >
                      <ThemedText style={styles.selectModalItemText}>{area.name}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </ThemedView>
      </Modal>
    );
  };

  const renderPostItem = (post: Post) => {
    // Component to render images with fallback
    const ImageWithFallback = ({ uri, style, onPress }: { uri: string, style: any, onPress?: () => void }) => {
      const [hasError, setHasError] = useState(false);
      const validatedUri = validateImageUrl(uri);
      
      if (hasError) {
        return (
          <TouchableOpacity onPress={onPress} disabled={!onPress}>
            <View style={[style, styles.imageFallbackContainer]}>
              <Ionicons name="image" size={50} color="#ccc" />
              <ThemedText style={styles.imageFallbackText}>Image unavailable</ThemedText>
            </View>
          </TouchableOpacity>
        );
      }
      
      return (
        <TouchableOpacity onPress={onPress} disabled={!onPress}>
          <Image
            source={{ uri: validatedUri }}
            style={style}
            onError={(error) => {
              console.error(`Failed to load image:`, error.nativeEvent.error);
              setHasError(true);
            }}
          />
        </TouchableOpacity>
      );
    };

    return (
      <View key={post.id} style={[
        styles.postContainer,
        post.type === POST_TYPES.JOB && styles.jobPostContainer
      ]}>
        {post.type === POST_TYPES.JOB && (
          <View style={styles.jobPostBadge}>
            <Ionicons name="briefcase" size={16} color="#fff" />
            <ThemedText style={styles.jobPostBadgeText}>JOB</ThemedText>
          </View>
        )}
        
        {/* Use our Post component for rendering the post content and interactions */}
        <Post 
          post={{
            id: post.id,
            content: post.content,
            created_at: post.created_at,
            likes_count: post.likes_count,
            comments_count: post.comments_count,
            user: {
              full_name: post.user.full_name || '',
              avatar_url: post.user.avatar_url || '', // Convert null to empty string to satisfy type
            },
            ...(post.title && { title: post.title })
          }} 
          currentUserId={session?.user?.id || ''}
        />
        
        {/* For job-specific content that's not part of the generic Post component */}
        {post.type === POST_TYPES.JOB && post.job_type && (
          <View style={styles.jobTypeTag}>
            <ThemedText style={styles.jobTypeTagText}>
              {JOB_TYPES.find(t => t.id === post.job_type)?.name || post.job_type}
            </ThemedText>
          </View>
        )}
        
        {post.type === POST_TYPES.JOB && post.location && (
          <View style={styles.postLocation}>
            <MaterialIcons name="location-on" size={16} color="#666" />
            <ThemedText style={styles.postLocationText}>{post.location}</ThemedText>
          </View>
        )}
        
        {post.images && post.images.length > 0 && (
          <ScrollView 
            horizontal 
            style={styles.showcaseImages}
            contentContainerStyle={styles.showcaseImagesContainer}
          >
            {post.images.map((imageUri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <ImageWithFallback
                  uri={imageUri}
                  style={styles.showcaseImage}
                  onPress={() => handleImagePress(imageUri)}
                />
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const handleImagePress = (imageUri: string) => {
    const validatedUri = validateImageUrl(imageUri);
    setSelectedImageForView(validatedUri);
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ 
        headerShown: false 
      }} />
      
      {/* Create post modal */}
      {renderCreatePostModal()}
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header with search bar */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#146383', '#eb7334']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <ThemedText style={styles.welcomeText}>
              Find Skilled Professionals
            </ThemedText>
            
            <View style={styles.searchContainer}>
              <MaterialIcons name="search" size={24} color="#888" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for services..."
                placeholderTextColor="#888"
              />
            </View>
          </LinearGradient>
        </View>

        {/* Create Post Button */}
        <TouchableOpacity 
          style={styles.createPostButton}
          onPress={() => setShowCreatePost(true)}
        >
          <View style={styles.createPostButtonContent}>
            <Ionicons name="add-circle" size={24} color="#146383" />
            <ThemedText style={styles.createPostButtonText}>Create a Post</ThemedText>
          </View>
        </TouchableOpacity>

        {/* Posts Section */}
        <View style={styles.postsSection}>
          {isLoading || refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#146383" />
              <ThemedText style={styles.loadingText}>
                {refreshing ? 'Refreshing posts...' : 'Loading posts...'}
              </ThemedText>
            </View>
          ) : posts.length > 0 ? (
            posts.map(post => renderPostItem(post))
          ) : (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="newspaper-outline" size={48} color="#ccc" />
              <ThemedText style={styles.emptyStateText}>No posts yet. Be the first to post!</ThemedText>
            </View>
          )}
        </View>

        {/* Categories Section */}
        <View style={styles.sectionContainer}>
          <ThemedText style={styles.sectionTitle}>Categories</ThemedText>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity key={category.id} style={styles.categoryItem}>
                <View style={styles.categoryIconContainer}>
                  {renderIcon(category.icon)}
                </View>
                <ThemedText style={styles.categoryName}>{category.name}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Featured Workers Section */}
        <View style={styles.sectionContainer}>
          <ThemedText style={styles.sectionTitle}>Featured Professionals</ThemedText>
          
          {FEATURED_WORKERS.map((worker) => (
            <TouchableOpacity key={worker.id} style={styles.workerCard}>
              {worker.image ? (
                <Image
                  source={{ uri: worker.image }}
                  style={styles.workerImage}
                />
              ) : (
                <View style={[styles.workerImage, { backgroundColor: stringToColor(worker.name) }]}>
                  <ThemedText style={styles.avatarInitial}>
                    {getInitialsAvatar(worker.name)}
                  </ThemedText>
                </View>
              )}
              <View style={styles.workerInfo}>
                <ThemedText style={styles.workerName}>{worker.name}</ThemedText>
                <ThemedText style={styles.workerJob}>{worker.job}</ThemedText>
                <View style={styles.ratingContainer}>
                  <FontAwesome name="star" size={16} color="#FFD700" />
                  <ThemedText style={styles.ratingText}>{worker.rating}</ThemedText>
                </View>
              </View>
              <TouchableOpacity style={styles.contactButton}>
                <ThemedText style={styles.contactButtonText}>Contact</ThemedText>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity style={styles.viewAllButton}>
            <ThemedText style={styles.viewAllText}>View All</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Image Viewer Modal */}
      <Modal
        visible={!!selectedImageForView}
        transparent={true}
        onRequestClose={() => setSelectedImageForView(null)}
      >
        <View style={styles.imageViewerModal}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setSelectedImageForView(null)}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {selectedImageForView && (
            <Image
              source={{ uri: selectedImageForView }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  header: {
    width: '100%',
    overflow: 'hidden',
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 25,
    paddingHorizontal: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  sectionContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 8,
    borderTopWidth: 8,
    borderTopColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryName: {
    fontSize: 14,
    textAlign: 'center',
    color: '#333',
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyStateContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  
  // Worker card styles
  workerCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  workerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workerInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  workerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  workerJob: {
    fontSize: 14,
    color: '#666',
    marginVertical: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  contactButton: {
    backgroundColor: '#eb7334',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  contactButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllText: {
    color: '#146383',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  // Post styles
  createPostButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 0,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  createPostButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createPostButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  postsSection: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: '#fff',
  },
  postContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userRank: {
    fontSize: 12,
    color: '#146383',
    fontWeight: '500',
    marginRight: 6,
  },
  userPoints: {
    fontSize: 12,
    color: '#eb7334',
    marginRight: 6,
  },
  postTime: {
    fontSize: 12,
    color: '#888',
  },
  jobTypeTag: {
    backgroundColor: '#e6f2f7',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d0e8f2',
  },
  jobTypeTagText: {
    fontSize: 12,
    color: '#146383',
    fontWeight: '500',
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  postLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  postLocationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
    marginBottom: 16,
  },
  showcaseImages: {
    marginBottom: 16,
    width: '100%',
  },
  showcaseImagesContainer: {
    paddingHorizontal: 16,
  },
  showcaseImage: {
    width: 300,
    height: 300,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    resizeMode: 'cover',
  },
  postActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginTop: Platform.OS === 'ios' ? 40 : 0,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  postTypeSelector: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  postTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activePostType: {
    borderBottomColor: '#146383',
  },
  postTypeText: {
    fontWeight: '500',
    color: '#333',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  jobTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  jobTypeButton: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  activeJobType: {
    backgroundColor: '#e6f2f7',
    borderWidth: 1,
    borderColor: '#146383',
  },
  jobTypeText: {
    color: '#333',
  },
  locationSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  imagePickerContainer: {
    marginBottom: 16,
  },
  imagePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 24,
    marginBottom: 16,
    backgroundColor: '#f8f8f8',
  },
  imagePickerText: {
    marginLeft: 8,
    color: '#666',
  },
  selectedImagesContainer: {
    flexDirection: 'row',
  },
  selectedImageWrapper: {
    position: 'relative',
    marginRight: 8,
  },
  selectedImage: {
    width: 80,
    height: 80,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  postButton: {
    backgroundColor: '#146383',
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  postButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  selectModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
    maxHeight: '70%',
  },
  selectModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  selectModalList: {
    padding: 16,
    backgroundColor: '#fff',
  },
  selectModalItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectModalItemText: {
    color: '#333',
  },
  locationSelectorText: {
    color: '#333',
  },
  disabledButton: {
    backgroundColor: '#a0c1d1', // Lighter version of #146383
    opacity: 0.7,
  },
  jobPostBadge: {
    backgroundColor: '#146383',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 8,
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobPostBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  jobPostContainer: {
    backgroundColor: '#f0f7ff',
    borderLeftWidth: 3,
    borderLeftColor: '#146383',
  },
  imageViewerModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  avatarInitial: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  imageFallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
  },
  imageFallbackText: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
  imageWrapper: {
    marginRight: 16,
  },
}); 