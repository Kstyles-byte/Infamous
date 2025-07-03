import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';

// Define colors directly instead of importing them since there seems to be an issue
const Colors = {
  light: {
    tint: '#eb7334',
    tabIconDefault: '#ccc',
    tabIconSelected: '#eb7334',
  },
  dark: {
    tint: '#eb7334',
    tabIconDefault: '#ccc',
    tabIconSelected: '#eb7334',
  },
};

/**
 * You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
 */
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false, // Hide the header for all tab screens
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
        },
      }}>
      
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color }) => <TabBarIcon name="briefcase" color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <TabBarIcon name="comments" color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
} 