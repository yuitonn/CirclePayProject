// src/navigation/HomeNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/home/HomeScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';

type HomeStackParamList = {
    Home: undefined;
    Notifications: undefined;
};

const Stack = createStackNavigator<HomeStackParamList>();

const HomeNavigator = () => {
    return (
        <Stack.Navigator>
        <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'ホーム' }} 
        />
        <Stack.Screen 
            name="Notifications" 
            component={NotificationsScreen} 
            options={{ title: '通知' }} 
        />
        </Stack.Navigator>
    );
};

export default HomeNavigator;
