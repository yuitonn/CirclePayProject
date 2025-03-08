// src/screens/groups/GroupsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { groupService, Group } from '../../services/firebase/groupService';
import { useAuth } from '../../hooks/useAuth';
import { Avatar, Button, Card, FAB } from 'react-native-paper';
import { theme } from '../../styles/theme';
import { GroupStackParamList } from '../../types/navigation';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

type GroupsScreenNavigationProp = StackNavigationProp<GroupStackParamList, 'Groups'>;

const GroupsScreen = () => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const navigation = useNavigation<GroupsScreenNavigationProp>();

    useFocusEffect(
        useCallback(() => {
            const fetchGroups = async () => {
            if (user) {
                setLoading(true);
                try {
                const userGroups = await groupService.getUserGroups(user.uid);
                setGroups(userGroups);
                } catch (error) {
                console.error('Error fetching groups:', error);
                } finally {
                setLoading(false);
                }
            }
            };
        
            fetchGroups();
        }, [user])
    );

    const handleCreateGroup = () => {
        navigation.navigate('CreateGroup');
    };

    const handleOpenGroup = (groupId: string) => {
        navigation.navigate('GroupDetails', { groupId });
    };

    const renderGroupItem = ({ item }: { item: Group }) => (
        <Card style={styles.groupCard} onPress={() => handleOpenGroup(item.id)}>
        <Card.Content style={styles.cardContent}>
            <Avatar.Text
            size={40}
            label={item.name.substring(0, 1)}
            color="white"
            style={{ backgroundColor: theme.colors.primary }}
            />
            <View style={styles.cardTextContainer}>
            <Text style={styles.groupName}>{item.name}</Text>
            <Text style={styles.groupMemberCount}>{item.memberCount}名のメンバー</Text>
            </View>
        </Card.Content>
        </Card>
    );

    if (loading) {
        return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
        );
    }

    return (
        <View style={styles.container}>
        <FlatList
            data={groups}
            renderItem={renderGroupItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                グループがありません。新しいグループを作成しましょう！
                </Text>
                <Button
                mode="contained"
                onPress={handleCreateGroup}
                style={styles.createButton}
                >
                グループを作成
                </Button>
            </View>
            }
        />
        
        <FAB
            style={styles.fab}
            icon="plus"
            onPress={handleCreateGroup}
            color="white"
        />
        </View>
    );
    };

    const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f3f4',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        padding: 16,
    },
    groupCard: {
        marginBottom: 12,
        elevation: 2,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardTextContainer: {
        marginLeft: 16,
    },
    groupName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    groupMemberCount: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 16,
        color: '#666',
    },
    createButton: {
        backgroundColor: theme.colors.primary,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        backgroundColor: theme.colors.primary,
    },
});

export default GroupsScreen;
