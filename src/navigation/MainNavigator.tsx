// src/navigation/MainNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import HomeScreen from '../screens/home/HomeScreen';
import EventsNavigator from './EventsNavigator';
import PaymentsNavigator from './PaymentsNavigator';
import GroupsNavigator from './GroupsNavigator';
import { theme } from '../styles/theme';

const Tab = createBottomTabNavigator();

const MainNavigator = () => {
    return (
        <Tab.Navigator
        screenOptions={{
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: '#999',
            headerShown: false,
        }}
        >
        <Tab.Screen
            name="HomeTab"
            component={HomeScreen}
            options={{
            tabBarLabel: 'ホーム',
            tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="home" color={color} size={size} />
            ),
            }}
        />
        <Tab.Screen
            name="EventsTab"
            component={EventsNavigator}
            options={{
            tabBarLabel: 'イベント',
            tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="calendar" color={color} size={size} />
            ),
            }}
        />
        <Tab.Screen
            name="PaymentsTab"
            component={PaymentsNavigator}
            options={{
            tabBarLabel: '支払い',
            tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="cash" color={color} size={size} />
            ),
            }}
        />
        <Tab.Screen
            name="GroupsTab"
            component={GroupsNavigator}
            options={{
            tabBarLabel: 'グループ',
            tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="account-group" color={color} size={size} />
            ),
            }}
        />
        </Tab.Navigator>
    );
};

export default MainNavigator;
