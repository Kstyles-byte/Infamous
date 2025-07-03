import { Stack } from 'expo-router';
import React from 'react';

export default function SignupSuccessLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Registration Complete" }} />
    </Stack>
  );
} 