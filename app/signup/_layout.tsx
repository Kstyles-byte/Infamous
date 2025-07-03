import { Stack } from 'expo-router';
import React from 'react';

export default function SignupLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Sign Up" }} />
    </Stack>
  );
} 