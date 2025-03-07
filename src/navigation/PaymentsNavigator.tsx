// src/navigation/PaymentsNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, View } from 'react-native';

const Stack = createStackNavigator();

// 仮のコンポーネント（後で実装される本物のスクリーンに置き換えます）
const PaymentsPlaceholder = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>支払い画面 - 開発中</Text>
    </View>
);

const PaymentsNavigator = () => {
    return (
        <Stack.Navigator>
        <Stack.Screen name="Payments" component={PaymentsPlaceholder} options={{ title: '支払い' }} />
        </Stack.Navigator>
    );
};

export default PaymentsNavigator;
