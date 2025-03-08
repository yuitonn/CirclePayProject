// src/navigation/GroupsNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import GroupsScreen from '../screens/groups/GroupsScreen';
import GroupDetailsScreen from '../screens/groups/GroupDetailsScreen';
import CreateGroupScreen from '../screens/groups/CreateGroupScreen';
import EditGroupScreen from '../screens/groups/EditGroupScreen';
import AddMemberScreen from '../screens/groups/AddMemberScreen';

const Stack = createStackNavigator();

const GroupsNavigator = () => {
    return (
        <Stack.Navigator>
        <Stack.Screen 
            name="Groups" 
            component={GroupsScreen} 
            options={{ title: 'グループ' }} 
        />
        <Stack.Screen 
            name="GroupDetails" 
            component={GroupDetailsScreen} 
            options={{ title: 'グループ詳細' }} 
        />
        <Stack.Screen 
            name="CreateGroup" 
            component={CreateGroupScreen} 
            options={{ title: '新しいグループ' }} 
        />
        <Stack.Screen 
            name="EditGroup" 
            component={EditGroupScreen} 
            options={{ title: 'グループを編集' }} 
        />
        <Stack.Screen 
            name="AddMember" 
            component={AddMemberScreen} 
            options={{ title: 'メンバーを追加' }} 
        />
        </Stack.Navigator>
    );
};

export default GroupsNavigator;
