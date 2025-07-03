import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Image, TouchableOpacity, Alert, Platform, View, TextInput, ScrollView, ActivityIndicator, Modal, FlatList } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Post } from '@/src/components/Post';
import { supabase } from '../../lib/supabase';
import { JOB_CATEGORIES, getCategoryById } from '../../constants/jobCategories';
import { useAuth } from '../../../src/lib/authContext';
import { uploadImage } from '../../lib/cloudinary';
import { getPointsForNextRank, pointsEventEmitter } from '../../lib/pointsSystem';
import { PointsHistory } from '../../components/PointsHistory';
import { STATES } from '@/src/constants/stateAreas';

interface Post {
  id: string;
  title: string;
  description: string;
  created_at: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [jobCategory, setJobCategory] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [pointsData, setPointsData] = useState<{nextRank: string, pointsNeeded: number} | null>(null);
  const [showPointsHistory, setShowPointsHistory] = useState(false);
  const [selectedImageForView, setSelectedImageForView] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error('Error fetching profile:', error);
        } else if (data) {
          console.log('Profile data:', data);
          console.log('Job category:', data.job_category);
          
          // Only set job category for workers
          if (data.role !== 'EMPLOYER') {
            // If job_category doesn't exist, set a default one
            if (!data.job_category) {
              const defaultCategory = JOB_CATEGORIES[0]?.id || 'category_1';
              setJobCategory(defaultCategory);
              
              // Update in database
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ job_category: defaultCategory })
                .eq('id', user.id);
                
              if (updateError) {
                console.error('Error setting default category:', updateError);
              } else {
                console.log('Default category set');
                data.job_category = defaultCategory;
              }
            } else {
              setJobCategory(data.job_category);
            }
          }
          
          setProfile(data);
          setJobDescription(data.job_description || '');
          
          // Get points needed for next rank
          if (data.points !== undefined) {
            const nextRankData = getPointsForNextRank(data.points);
            setPointsData(nextRankData);
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    if (!session?.user) return;
    
    try {
      setIsLoading(true);
      
      // Fetch posts created by the user
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user:profiles(full_name, avatar_url, rank, points)
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Get post likes for the current user to determine which posts are liked
      const { data: likes } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', session.user.id);
      
      const likedPostIds = new Set((likes || []).map((like: { post_id: string }) => like.post_id));
      
      // Add isLiked property to posts
      const postsWithLikes = (data || []).map((post: any) => ({
        ...post,
        isLiked: likedPostIds.has(post.id)
      }));
      
      setPosts(postsWithLikes);
    } catch (error) {
      console.error('Error fetching user posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchProfile();
    fetchUserPosts();
  }, []);
  
  // Setup points update listener
  useEffect(() => {
    // Function to handle the points updated event
    const handlePointsUpdated = (data: any) => {
      console.log('Points updated event received:', data);
      fetchProfile(); // Refresh profile when points change
    };
    
    // Add event listener
    pointsEventEmitter.on('pointsUpdated', handlePointsUpdated);
    
    // Clean up function
    return () => {
      pointsEventEmitter.removeListener('pointsUpdated', handlePointsUpdated);
    };
  }, []);

  const saveProfileChanges = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const updateData: any = {
          job_description: jobDescription,
          updated_at: new Date().toISOString(),
        };

        // Only include job_category in update if user is not an employer
        if (profile?.role !== 'EMPLOYER') {
          updateData.job_category = jobCategory;
        }

        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', user.id);
          
        if (error) {
          Alert.alert('Error', 'Failed to update profile: ' + error.message);
        } else {
          Alert.alert('Success', 'Profile updated successfully');
          setIsEditing(false);
          fetchProfile();
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsEditing(true);
  };

  const cancelEdit = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsEditing(false);
    // Reset values to original
    if (profile) {
      setJobCategory(profile.job_category || '');
      setJobDescription(profile.job_description || '');
    }
  };

  const getJobCategoryName = (categoryId: string) => {
    const category = getCategoryById(categoryId);
    return category ? category.name : 'Unknown';
  };

  const handleChangeCategory = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Show category selection modal
    setShowCategoryModal(true);
  };
  
  const selectCategory = (categoryId: string) => {
    setJobCategory(categoryId);
    setShowCategoryModal(false);
  };

  const profileImage = profile?.avatar_url 
    ? { uri: profile.avatar_url } 
    : require('../../../assets/images/icon.png');

  const handleSignOut = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    try {
      await signOut();
      // No need to manually navigate - auth context will handle redirection
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const handleImagePick = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photo library to change your profile picture.');
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: false,
      });
      
      if (result.canceled) {
        return;
      }
      
      if (result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        if (selectedImage.uri) {
          uploadProfileImage(selectedImage.uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };
  
  const uploadProfileImage = async (imageUri: string) => {
    try {
      setUploading(true);
      // Upload to Cloudinary
      const uploadResult = await uploadImage(imageUri);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload image');
      }
      
      // Update profile with new image URL
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_url: uploadResult.url,
          cloudinary_public_id: uploadResult.publicId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
        
      if (error) {
        throw new Error(error.message);
      }
      
      // Refresh profile to show new image
      await fetchProfile();
      Alert.alert('Success', 'Profile image updated successfully');
    } catch (error) {
      console.error('Error uploading profile image:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update profile image');
    } finally {
      setUploading(false);
    }
  };

  // Add a function to toggle points history visibility
  const togglePointsHistory = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowPointsHistory(!showPointsHistory);
  };

  const handleImagePress = () => {
    if (profile?.avatar_url) {
      setSelectedImageForView(profile.avatar_url);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header with gradient background */}
      <View style={styles.header}>
        <View style={styles.headerBackground}>
          <LinearGradient
            colors={['#146383', '#eb7334']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          />
        </View>
        
        {/* Edit button for the entire profile */}
        <TouchableOpacity 
          style={styles.headerEditButton} 
          onPress={handleEdit}
        >
          <MaterialIcons name="edit" size={24} color="#fff" />
        </TouchableOpacity>
        
        {/* Profile header section with image and basic info side by side */}
        <View style={styles.profileHeaderSection}>
          {/* Profile image section */}
          <View style={styles.profileImageContainer}>
            <TouchableOpacity onPress={handleImagePress}>
              <Image
                source={profileImage}
                style={styles.profileImage}
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.cameraButton, uploading && styles.disabledButton]}
              onPress={handleImagePick}
              disabled={uploading}
            >
              {uploading 
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="camera" size={20} color="#fff" />
              }
            </TouchableOpacity>
          </View>

          {/* Basic user info section */}
          <View style={styles.basicUserInfo}>
            {/* Name */}
            <ThemedText style={styles.nameText}>
              {profile?.full_name || 'User'}
            </ThemedText>
            
            {/* Rank and Points */}
            <View style={styles.expertiseRow}>
              <FontAwesome name="trophy" size={18} color="#146383" />
              <ThemedText style={styles.expertiseText}>
                {profile?.rank || 'Beginner'} • {profile?.points || 0} points
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Main profile content */}
        <View style={styles.profileContent}>
          {/* Next Rank Progress */}
          {pointsData && pointsData.pointsNeeded > 0 && (
            <View style={styles.nextRankContainer}>
              <ThemedText style={styles.nextRankText}>
                {pointsData.pointsNeeded} points until {pointsData.nextRank} rank
              </ThemedText>
              <View style={styles.progressBarBackground}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: profile?.points
                        ? `${Math.min(100, (profile.points / (profile.points + pointsData.pointsNeeded)) * 100)}%`
                        : '0%'
                    }
                  ]} 
                />
              </View>
            </View>
          )}

          {/* Points History Toggle Button */}
          <TouchableOpacity
            style={styles.pointsHistoryToggle}
            onPress={togglePointsHistory}
          >
            <FontAwesome name="history" size={18} color="#146383" />
            <ThemedText style={styles.pointsHistoryToggleText}>
              {showPointsHistory ? "Hide Points History" : "View Points History"}
            </ThemedText>
            <FontAwesome 
              name={showPointsHistory ? "chevron-up" : "chevron-down"} 
              size={14} 
              color="#666" 
            />
          </TouchableOpacity>

          {/* Points History Section */}
          {showPointsHistory && profile?.id && (
            <View style={styles.pointsHistoryContainer}>
              <PointsHistory userId={profile.id} limit={10} />
            </View>
          )}

          {/* Job Category Pill */}
          {!isEditing && profile?.role !== 'EMPLOYER' && (
            <TouchableOpacity 
              style={styles.categoryPill}
              onPress={!profile?.job_category ? handleEdit : undefined}
            >
              <ThemedText style={styles.categoryText}>
                {(profile?.job_category && getJobCategoryName(profile?.job_category)) || 
                 (jobCategory && getJobCategoryName(jobCategory)) || 
                 'Add Category'}
              </ThemedText>
            </TouchableOpacity>
          )}

          {/* Job category editor (when editing) */}
          {isEditing && profile?.role !== 'EMPLOYER' && (
            <View style={styles.editContainer}>
              <ThemedText style={styles.editLabel}>Job Category</ThemedText>
              <TouchableOpacity 
                style={styles.categorySelector}
                onPress={handleChangeCategory}
              >
                <ThemedText>{getJobCategoryName(jobCategory)}</ThemedText>
                <FontAwesome name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Job Description */}
          {!isEditing && (
            <ThemedText style={styles.descriptionText}>
              {profile?.job_description || 'Add a description of your professional services here.'}
            </ThemedText>
          )}
          
          {/* Job description editor (when editing) */}
          {isEditing && (
            <View style={styles.editContainer}>
              <ThemedText style={styles.editLabel}>Job Description</ThemedText>
              <TextInput
                style={styles.textInput}
                value={jobDescription}
                onChangeText={setJobDescription}
                multiline
                placeholder="Describe your services..."
              />
            </View>
          )}
          
          {/* Location Information */}
          {profile?.state && profile?.area && (
            <View style={styles.infoRow}>
              <MaterialIcons name="location-on" size={20} color="#666" />
              <ThemedText style={styles.infoText}>
                {profile.area}, {profile.state}
              </ThemedText>
            </View>
          )}
          
          {/* Phone Number */}
          {profile?.phone_number && (
            <View style={styles.infoRow}>
              <MaterialIcons name="phone" size={20} color="#666" />
              <ThemedText style={styles.infoText}>
                {profile.phone_number}
              </ThemedText>
            </View>
          )}
          
          {/* Edit mode buttons */}
          {isEditing && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={cancelEdit}
                disabled={loading}
              >
                <ThemedText style={styles.buttonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, loading && styles.buttonDisabled]}
                onPress={saveProfileChanges}
                disabled={loading}
              >
                <ThemedText style={styles.saveButtonText}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* User Posts Section */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>My Posts</ThemedText>
        
        {isLoading ? (
          <ActivityIndicator size="large" color="#146383" />
        ) : posts.length > 0 ? (
          <View style={styles.postsContainer}>
            {posts.map(post => (
              <Post 
                key={post.id}
                post={post}
                currentUserId={session?.user?.id || ''}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#ccc" />
            <ThemedText style={styles.emptyStateText}>
              You haven't posted anything yet
            </ThemedText>
          </View>
        )}
      </View>

      {/* Sign Out Button */}
      <View style={styles.signOutContainer}>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <MaterialIcons name="logout" size={20} color="#fff" />
          <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Job Category</ThemedText>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={JOB_CATEGORIES}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.categoryItem, 
                    jobCategory === item.id && styles.selectedCategoryItem
                  ]}
                  onPress={() => selectCategory(item.id)}
                >
                  <ThemedText 
                    style={[
                      styles.categoryItemText,
                      jobCategory === item.id && styles.selectedCategoryItemText
                    ]}
                  >
                    {item.name}
                  </ThemedText>
                  {jobCategory === item.id && (
                    <Ionicons name="checkmark" size={20} color="#146383" />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </View>
      </Modal>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    position: 'relative',
    paddingBottom: 20,
  },
  headerBackground: {
    height: 150,
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  gradient: {
    height: '100%',
    width: '100%',
  },
  headerEditButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    padding: 8,
  },
  profileHeaderSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 90, // Position to partially overlap the header
    paddingHorizontal: 16,
    marginBottom: 10, // Add some bottom margin
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 100, // Slightly smaller image for the side layout
    height: 100, // Slightly smaller image for the side layout
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'white',
    backgroundColor: '#f0f0f0',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0, // Adjust position for left-aligned image
    backgroundColor: '#eb7334',
    borderRadius: 20,
    width: 36, // Slightly smaller button
    height: 36, // Slightly smaller button
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  basicUserInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 20, // Adjusted top padding
  },
  profileContent: {
    padding: 16,
    alignItems: 'flex-start',
    paddingTop: 0, // Reduce top padding since we have the header section now
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    alignSelf: 'flex-start',
    color: '#000000', // Set text color to black
  },
  expertiseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  expertiseText: {
    fontSize: 16,
    color: '#146383',
    marginLeft: 8,
    fontWeight: '500',
  },
  categoryPill: {
    backgroundColor: '#146383',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 15,
  },
  categoryText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    marginBottom: 15,
    alignSelf: 'stretch',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  editContainer: {
    width: '100%',
    marginBottom: 15,
  },
  editLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginTop: 20,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#eb7334',
  },
  buttonDisabled: {
    backgroundColor: '#f0a77d',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  postsContainer: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
  signOutContainer: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 30,
  },
  signOutButton: {
    backgroundColor: '#146383',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
    maxWidth: 200,
  },
  signOutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  selectedCategoryItem: {
    backgroundColor: '#f0f8ff',
  },
  categoryItemText: {
    fontSize: 16,
  },
  selectedCategoryItemText: {
    color: '#146383',
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
  },
  nextRankContainer: {
    marginBottom: 15,
    width: '100%',
  },
  nextRankText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#146383',
    borderRadius: 4,
  },
  pointsHistoryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
    justifyContent: 'space-between',
  },
  pointsHistoryToggleText: {
    fontSize: 14,
    color: '#146383',
    fontWeight: '500',
    marginHorizontal: 8,
  },
  pointsHistoryContainer: {
    width: '100%',
    marginBottom: 20,
    height: 300, // Fixed height for the points history
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
}); 