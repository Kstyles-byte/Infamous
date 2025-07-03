import React from 'react';
import { StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function ProfileSettingsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Profile Settings' }} />
      <ThemedView style={styles.container}>
        <ThemedText type="title">Profile Settings</ThemedText>
        <ThemedText style={styles.placeholder}>Your settings UI goes here.</ThemedText>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  placeholder: {
    marginTop: 12,
  },
}); 