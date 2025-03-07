// src/navigation/EventsNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import EventsScreen from '../screens/events/EventsScreen';
import EventDetailsScreen from '../screens/events/EventDetailsScreen';
import CreateEventScreen from '../screens/events/CreateEventScreen';
import EditEventScreen from '../screens/events/EditEventScreen';

type EventsStackParamList = {
    Events: undefined;
    EventDetails: { eventId: string };
    CreateEvent: undefined;
    EditEvent: { eventId: string; event: any };
};

const Stack = createStackNavigator<EventsStackParamList>();

const EventsNavigator = () => {
    return (
        <Stack.Navigator>
        <Stack.Screen 
            name="Events" 
            component={EventsScreen} 
            options={{ title: 'イベント' }} 
        />
        <Stack.Screen 
            name="EventDetails" 
            component={EventDetailsScreen} 
            options={{ title: 'イベント詳細' }} 
        />
        <Stack.Screen 
            name="CreateEvent" 
            component={CreateEventScreen} 
            options={{ title: '新しいイベント' }} 
        />
        <Stack.Screen 
            name="EditEvent" 
            component={EditEventScreen} 
            options={{ title: 'イベントを編集' }} 
        />
        </Stack.Navigator>
    );
};

export default EventsNavigator;
