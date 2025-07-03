import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/lib/authContext';
import { ThemedText } from '@/components/ThemedText';

export default function Index() {
  const { session, loading } = useAuth();

  // While we're checking authentication status, show a loading spinner
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#eb7334" />
        <ThemedText style={styles.loadingText}>
          Loading...
        </ThemedText>
      </View>
    );
  }

  // If user is signed in, redirect to the tabs profile page
  // Otherwise, redirect to the login page
  return session ? <Redirect href="/(tabs)/profile" /> : <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
}); 