import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useAuth } from '../lib/authContext';
import { ThemedText } from '@/components/ThemedText';

export default function Index() {
  const { session, loading, connectionError } = useAuth();

  useEffect(() => {
    console.log('Index: Auth state -', loading ? 'Loading' : (connectionError ? 'Connection Error' : (session ? 'Authenticated' : 'Not authenticated')));
    
    // Only navigate when auth state is determined
    if (!loading && !connectionError) {
      if (session) {
        console.log('User authenticated, redirecting to profile');
      } else {
        console.log('User not authenticated, redirecting to login');
      }
    }
  }, [loading, session, connectionError]);

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

  // If there's a connection error, show an offline mode message
  if (connectionError) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.errorText}>
          Unable to connect to server
        </ThemedText>
        <ThemedText style={styles.loadingText}>
          Please check your internet connection and try again
        </ThemedText>
        {/* For demo purposes, we'll redirect to login after showing the error */}
        <Redirect href="/login" />
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
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 10
  }
}); 