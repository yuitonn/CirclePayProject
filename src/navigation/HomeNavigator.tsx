// src/navigation/HomeNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/home/HomeScreen';

const Stack = createStackNavigator();

const HomeNavigator = () => {
    return (
        <Stack.Navigator>
        <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'ホーム' }} 
        />
        </Stack.Navigator>
    );
};

export default HomeNavigator;
