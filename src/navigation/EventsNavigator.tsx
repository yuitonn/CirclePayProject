// src/navigation/EventsNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, View } from 'react-native';

const Stack = createStackNavigator();

// 仮のコンポーネント（後で実装される本物のスクリーンに置き換えます）
const EventsPlaceholder = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>イベント画面 - 開発中</Text>
    </View>
);

const EventsNavigator = () => {
    return (
        <Stack.Navigator>
        <Stack.Screen name="Events" component={EventsPlaceholder} options={{ title: 'イベント' }} />
        </Stack.Navigator>
    );
};

export default EventsNavigator;
