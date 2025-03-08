// src/screens/groups/GroupDetailsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Button, Card, Avatar, FAB, Menu, Portal, Provider, IconButton } from 'react-native-paper';
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
    
    const isCreator = user && group?.createdBy === user.uid;
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
        if (group) {
        navigation.navigate('EditGroup', { groupId, group });
        setMenuVisible(false); // メニューを閉じる
        }
    };
    
    const handleDeleteGroup = () => {
        setMenuVisible(false); // メニューを閉じる
        
        Alert.alert(
        '確認',
        'このグループを削除しますか？この操作は元に戻せません。',
        [
            { text: 'キャンセル', style: 'cancel' },
            {
            text: '削除する',
            style: 'destructive',
            onPress: async () => {
                try {
                await groupService.deleteGroup(groupId);
                navigation.goBack();
                } catch (error) {
                console.error('Error deleting group:', error);
                Alert.alert('エラー', '削除に失敗しました');
                }
            }
            }
        ]
        );
    };
    
    const handleRemoveMember = (memberId: string) => {
        Alert.alert(
        '確認',
        'このメンバーをグループから削除しますか？',
        [
            { text: 'キャンセル', style: 'cancel' },
            {
            text: '削除する',
            style: 'destructive',
            onPress: async () => {
                try {
                await groupService.removeMember(groupId, memberId);
                // メンバーリストを更新
                setMembers(members.filter(member => member.userId !== memberId));
                
                // グループ情報も更新
                if (group) {
                    setGroup({
                    ...group,
                    memberCount: group.memberCount - 1
                    });
                }
                } catch (error) {
                console.error('Error removing member:', error);
                Alert.alert('エラー', 'メンバー削除に失敗しました');
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
                {/* ここを修正: userId ではなく displayName を優先的に表示 */}
                <Text style={styles.memberName}>{item.displayName || '名称未設定'}</Text>
                <Text style={styles.memberRole}>
                    {item.role === 'admin' ? '管理者' : item.role === 'treasurer' ? '会計担当' : 'メンバー'}
                </Text>
                </View>
                {isAdmin && item.userId !== user?.uid && (
                <IconButton
                    icon="delete"
                    size={20}
                    iconColor="#999"  // color から iconColor に変更
                    onPress={() => handleRemoveMember(item.userId)}
                />
                )}
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
        <Provider>
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
                メンバーを追加
                </Button>
            )}
            </View>
            
            <FlatList
            data={members}
            renderItem={renderMemberItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.membersList}
            />
            
            {isCreator && (
            <FAB
                style={styles.fab}
                icon="dots-vertical"
                onPress={() => setMenuVisible(true)}
                color="white"
            />
            )}
            
            <Portal>
            <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={{ x: 0, y: 0 }}
                style={{
                position: 'absolute',
                bottom: 80,
                right: 16,
                }}
            >
                <Menu.Item onPress={handleEditGroup} title="グループを編集" />
                <Menu.Item onPress={handleDeleteGroup} title="グループを削除" />
            </Menu>
            </Portal>
        </View>
        </Provider>
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
        paddingTop: 8,
        paddingBottom: 6,
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
        flex: 1,
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
