// src/screens/groups/GroupDetailsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Button, Card, Avatar, FAB, Menu, Divider } from 'react-native-paper';
import { groupService, Group, GroupMember } from '../../services/firebase/groupService';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../styles/theme';
import { GroupStackParamList } from '../../types/navigation';

type GroupDetailsScreenRouteProp = RouteProp<GroupStackParamList, 'GroupDetails'>;
type GroupDetailsScreenNavigationProp = StackNavigationProp<GroupStackParamList, 'GroupDetails'>;

const GroupDetailsScreen = () => {
    const [group, setGroup] = useState<Group | null>(null);
    const [members, setMembers] = useState<(GroupMember & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [menuVisible, setMenuVisible] = useState(false);
    
    const route = useRoute<GroupDetailsScreenRouteProp>();
    const navigation = useNavigation<GroupDetailsScreenNavigationProp>();
    const { user } = useAuth();
    const { groupId } = route.params;
    
    const isAdmin = user && group?.adminUsers.includes(user.uid);
    
    useEffect(() => {
        const fetchGroupDetails = async () => {
        try {
            const groupData = await groupService.getGroup(groupId);
            setGroup(groupData);
            
            const membersData = await groupService.getGroupMembers(groupId);
            setMembers(membersData);
        } catch (error) {
            console.error('Error fetching group details:', error);
            Alert.alert('エラー', 'グループ情報の取得に失敗しました');
        } finally {
            setLoading(false);
        }
        };
        
        fetchGroupDetails();
    }, [groupId]);
    
    const handleAddMember = () => {
        navigation.navigate('AddMember', { groupId });
    };
    
    const handleEditGroup = () => {
        navigation.navigate('EditGroup', { groupId, group });
    };
    
    const handleLeaveGroup = async () => {
        if (!user) return;
        
        Alert.alert(
        '確認',
        'このグループから脱退しますか？',
        [
            { text: 'キャンセル', style: 'cancel' },
            {
            text: '脱退する',
            style: 'destructive',
            onPress: async () => {
                try {
                await groupService.removeMember(groupId, user.uid);
                navigation.goBack();
                } catch (error) {
                console.error('Error leaving group:', error);
                Alert.alert('エラー', '脱退に失敗しました');
                }
            }
            }
        ]
        );
    };
    
    const renderMemberItem = ({ item }: { item: GroupMember & { id: string } }) => (
        <Card style={styles.memberCard}>
        <Card.Content style={styles.memberCardContent}>
            <Avatar.Text
            size={36}
            label={item.displayName?.substring(0, 1) || '?'}
            color="white"
            style={{
                backgroundColor: 
                item.role === 'admin' 
                    ? theme.colors.primary 
                    : item.role === 'treasurer' 
                    ? theme.colors.accent 
                    : '#9e9e9e'
            }}
            />
            <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{item.displayName || item.userId}</Text>
            <Text style={styles.memberRole}>
                {item.role === 'admin' ? '管理者' : item.role === 'treasurer' ? '会計担当' : 'メンバー'}
            </Text>
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
    
    if (!group) {
        return (
        <View style={styles.loadingContainer}>
            <Text>グループが見つかりません</Text>
        </View>
        );
    }
    
    return (
        <View style={styles.container}>
        <View style={styles.header}>
            <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.groupType}>
                {group.type === 'circle' ? 'サークル' : 
                group.type === 'club' ? '部活動' : 
                group.type === 'committee' ? '委員会' : 'その他'}
            </Text>
            {group.description && (
                <Text style={styles.groupDescription}>{group.description}</Text>
            )}
            </View>
        </View>
        
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>メンバー ({members.length})</Text>
            {isAdmin && (
            <Button 
                mode="text" 
                onPress={handleAddMember}
                color={theme.colors.primary}
            >
                追加
            </Button>
            )}
        </View>
        
        <FlatList
            data={members}
            renderItem={renderMemberItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.membersList}
        />
        
        <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
            <FAB
                style={styles.fab}
                icon="dots-vertical"
                onPress={() => setMenuVisible(true)}
                color="white"
            />
            }
        >
            {isAdmin && <Menu.Item onPress={handleEditGroup} title="グループを編集" />}
            <Menu.Item onPress={handleLeaveGroup} title="グループを脱退" />
        </Menu>
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
    header: {
        padding: 16,
        backgroundColor: 'white',
        elevation: 2,
    },
    groupInfo: {
        marginTop: 8,
    },
    groupName: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    groupType: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    groupDescription: {
        fontSize: 14,
        marginTop: 8,
        lineHeight: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    membersList: {
        padding: 16,
    },
    memberCard: {
        marginBottom: 8,
    },
    memberCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    memberInfo: {
        marginLeft: 12,
    },
    memberName: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    memberRole: {
        fontSize: 12,
        color: '#666',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        backgroundColor: theme.colors.primary,
    },
});

export default GroupDetailsScreen;
