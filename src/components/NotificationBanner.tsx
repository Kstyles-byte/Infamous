import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface NotificationBannerProps {
  title: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error' | 'rank';
  duration?: number;
  onClose?: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  title,
  message,
  type = 'success',
  duration = 5000,
  onClose,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    // Trigger haptic feedback on banner appearance
    if (Platform.OS !== 'web') {
      if (type === 'rank') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (type === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }

    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate out after duration
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onClose) onClose();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  // Get icon based on type
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FontAwesome name="check-circle" size={24} color="#fff" />;
      case 'info':
        return <FontAwesome name="info-circle" size={24} color="#fff" />;
      case 'warning':
        return <FontAwesome name="exclamation-triangle" size={24} color="#fff" />;
      case 'error':
        return <FontAwesome name="times-circle" size={24} color="#fff" />;
      case 'rank':
        return <FontAwesome name="trophy" size={24} color="#fff" />;
      default:
        return <FontAwesome name="info-circle" size={24} color="#fff" />;
    }
  };

  // Get background color based on type
  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#4CAF50';
      case 'info':
        return '#146383';
      case 'warning':
        return '#FF9800';
      case 'error':
        return '#F44336';
      case 'rank':
        return '#8E44AD'; // Purple for rank changes
      default:
        return '#146383';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: getBackgroundColor(),
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>{getIcon()}</View>
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>{title}</Text>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <FontAwesome name="times" size={16} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 1000,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  titleText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
  },
  closeButton: {
    padding: 5,
  },
}); 