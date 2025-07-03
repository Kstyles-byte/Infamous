import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  likes_count: number;
  user: {
    full_name: string;
    avatar_url: string;
  };
  isLiked?: boolean;
}

interface Post {
  id: string;
  title?: string;
  content: string;
  user_id: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  user: {
    full_name: string;
    avatar_url: string;
  };
  isLiked?: boolean;
}

interface PostProps {
  post: Post;
  currentUserId: string;
}

export const Post: React.FC<PostProps> = ({ post, currentUserId }) => {
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showAllComments, setShowAllComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLike = async () => {
    try {
      if (isLiked) {
        // Unlike the post
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUserId);

        if (error) throw error;
        setLikesCount(prev => prev - 1);
      } else {
        // Like the post
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: post.id,
            user_id: currentUserId,
          });

        if (error) throw error;
        setLikesCount(prev => prev + 1);
      }
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleLikeComment = async (commentId: string, isCommentLiked: boolean) => {
    try {
      if (isCommentLiked) {
        // Unlike the comment
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', currentUserId);

        if (error) throw error;
      } else {
        // Like the comment
        const { error } = await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: currentUserId,
          });

        if (error) throw error;
      }

      // Update comments state to reflect the like/unlike
      setComments(prevComments =>
        prevComments.map(comment =>
          comment.id === commentId
            ? {
                ...comment,
                likes_count: isCommentLiked ? comment.likes_count - 1 : comment.likes_count + 1,
                isLiked: !isCommentLiked,
              }
            : comment
        )
      );
    } catch (error) {
      console.error('Error toggling comment like:', error);
    }
  };

  const loadComments = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          user:profiles(full_name, avatar_url)
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get comment likes for current user
      const { data: likes } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', currentUserId);

      const likedCommentIds = new Set((likes || []).map((like: { comment_id: string }) => like.comment_id));

      // Add isLiked property to comments
      const commentsWithLikes = (data || []).map((comment: any) => ({
        ...comment,
        isLiked: likedCommentIds.has(comment.id),
      }));

      setComments(commentsWithLikes);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          user_id: currentUserId,
          content: newComment.trim(),
        })
        .select(`
          *,
          user:profiles(full_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      setComments(prev => [data, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // Load initial comment when component mounts
  React.useEffect(() => {
    loadComments();
  }, []);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {/* Add user avatar here */}
          <ThemedText type="defaultSemiBold">{post.user.full_name}</ThemedText>
        </View>
        <ThemedText style={styles.timestamp}>
          {new Date(post.created_at).toLocaleDateString()}
        </ThemedText>
      </View>

      {post.title && <ThemedText type="title" style={styles.title}>{post.title}</ThemedText>}
      <ThemedText style={styles.content}>{post.content}</ThemedText>

      <View style={styles.actions}>
        <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
          <MaterialIcons
            name={isLiked ? 'favorite' : 'favorite-border'}
            size={24}
            color={isLiked ? '#F44336' : '#666'}
          />
          <ThemedText style={styles.actionText}>{likesCount}</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowAllComments(!showAllComments)}
          style={styles.actionButton}
        >
          <MaterialIcons name="comment" size={24} color="#666" />
          <ThemedText style={styles.actionText}>{comments.length}</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.commentSection}>
        <View style={styles.commentInput}>
          <TextInput
            placeholder="Add a comment..."
            value={newComment}
            onChangeText={setNewComment}
            style={styles.input}
            multiline
          />
          <TouchableOpacity onPress={handleAddComment} style={styles.sendButton}>
            <MaterialIcons name="send" size={24} color="#146383" />
          </TouchableOpacity>
        </View>

        {/* Show first comment or all comments */}
        {comments.length > 0 && (
          <View style={styles.comments}>
            {(showAllComments ? comments : comments.slice(0, 1)).map(comment => (
              <View key={comment.id} style={styles.comment}>
                <View style={styles.commentHeader}>
                  <ThemedText type="defaultSemiBold">{comment.user.full_name}</ThemedText>
                  <ThemedText style={styles.timestamp}>
                    {new Date(comment.created_at).toLocaleDateString()}
                  </ThemedText>
                </View>
                <ThemedText style={styles.commentContent}>{comment.content}</ThemedText>
                <TouchableOpacity
                  onPress={() => handleLikeComment(comment.id, comment.isLiked || false)}
                  style={styles.commentLike}
                >
                  <MaterialIcons
                    name={comment.isLiked ? 'favorite' : 'favorite-border'}
                    size={16}
                    color={comment.isLiked ? '#F44336' : '#666'}
                  />
                  <ThemedText style={styles.commentLikeCount}>{comment.likes_count}</ThemedText>
                </TouchableOpacity>
              </View>
            ))}
            {comments.length > 1 && (
              <TouchableOpacity
                onPress={() => setShowAllComments(!showAllComments)}
                style={styles.viewMoreButton}
              >
                <ThemedText style={styles.viewMoreText}>
                  {showAllComments ? 'Show less' : `View ${comments.length - 1} more comments`}
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    marginBottom: 8,
  },
  content: {
    marginBottom: 16,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: '#666',
  },
  commentSection: {
    gap: 12,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  sendButton: {
    padding: 8,
  },
  comments: {
    gap: 12,
  },
  comment: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentContent: {
    marginBottom: 8,
  },
  commentLike: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentLikeCount: {
    fontSize: 12,
    color: '#666',
  },
  viewMoreButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  viewMoreText: {
    color: '#146383',
    fontWeight: '600',
  },
}); 