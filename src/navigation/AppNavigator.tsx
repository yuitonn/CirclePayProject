// src/navigation/AppNavigator.tsx
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { theme } from '../styles/theme';

const AppNavigator = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
        );
    }

    return user ? <MainNavigator /> : <AuthNavigator />;
};

export default AppNavigator;
