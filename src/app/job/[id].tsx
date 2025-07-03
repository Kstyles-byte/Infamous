import React from 'react';
import { StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function JobDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ title: 'Job Details' }} />
      <ThemedView style={styles.container}>
        <ThemedText type="title">Job Details #{id}</ThemedText>
        <ThemedText style={styles.placeholder}>Detailed view coming soon...</ThemedText>
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