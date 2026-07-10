import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF9F1C',
        tabBarInactiveTintColor: '#565B62',
        tabBarStyle: { backgroundColor: '#14171A', borderTopColor: '#262B30' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ignition',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flame" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}