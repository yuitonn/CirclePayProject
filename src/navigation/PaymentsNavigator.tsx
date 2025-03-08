// src/navigation/PaymentsNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PaymentsScreen from '../screens/payments/PaymentsScreen';
import PaymentDetailsScreen from '../screens/payments/PaymentDetailsScreen';
import CreatePaymentScreen from '../screens/payments/CreatePaymentScreen';

type PaymentsStackParamList = {
    Payments: undefined;
    PaymentDetails: { paymentId: string };
    CreatePayment: undefined;
};

const Stack = createStackNavigator<PaymentsStackParamList>();

const PaymentsNavigator = () => {
    return (
        <Stack.Navigator>
        <Stack.Screen 
            name="Payments" 
            component={PaymentsScreen} 
            options={{ title: '支払い' }} 
        />
        <Stack.Screen 
            name="PaymentDetails" 
            component={PaymentDetailsScreen} 
            options={{ title: '支払い詳細' }} 
        />
        <Stack.Screen 
            name="CreatePayment" 
            component={CreatePaymentScreen} 
            options={{ title: '新しい支払い' }} 
        />
        </Stack.Navigator>
    );
};

export default PaymentsNavigator;
