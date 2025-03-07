// src/screens/groups/AddMemberScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Alert, TextInput as RNTextInput } from 'react-native';
import { Button, Text, Card, Avatar, ActivityIndicator, Searchbar } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { groupService, GroupMember } from '../../services/firebase/groupService';
import { theme } from '../../styles/theme';

interface UserSearchResult {
    id: string;
    name: string;
    email: string;
}

const AddMemberScreen = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [adding, setAdding] = useState(false);
    
    const route = useRoute();
    const navigation = useNavigation();
    const { groupId } = route.params as { groupId: string };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
        Alert.alert('エラー', '検索キーワードを入力してください');
        return;
        }

        setSearching(true);
        try {
        // メールアドレスで検索
        const emailQuery = query(
            collection(db, 'users'),
            where('email', '==', searchQuery.trim())
        );
        
        // 名前で検索（部分一致は直接サポートされていないため完全一致）
        const nameQuery = query(
            collection(db, 'users'),
            where('name', '==', searchQuery.trim())
        );

        const [emailSnapshot, nameSnapshot] = await Promise.all([
            getDocs(emailQuery),
            getDocs(nameQuery)
        ]);

        // 検索結果を重複なく統合
        const results: UserSearchResult[] = [];
        const addedIds = new Set();

        emailSnapshot.forEach(doc => {
            const userData = doc.data();
            if (!addedIds.has(doc.id)) {
            results.push({
                id: doc.id,
                name: userData.name || 'Unknown',
                email: userData.email || ''
            });
            addedIds.add(doc.id);
            }
        });

        nameSnapshot.forEach(doc => {
            if (!addedIds.has(doc.id)) {
            const userData = doc.data();
            results.push({
                id: doc.id,
                name: userData.name || 'Unknown',
                email: userData.email || ''
            });
            addedIds.add(doc.id);
            }
        });

        setSearchResults(results);
        } catch (error) {
        console.error('Error searching users:', error);
        Alert.alert('エラー', 'ユーザー検索中にエラーが発生しました');
        } finally {
        setSearching(false);
        }
    };

    const handleAddMember = async (user: UserSearchResult) => {
        setAdding(true);
        try {
        const memberData: GroupMember = {
            userId: user.id,
            role: 'member',
            status: 'active',
            displayName: user.name
        };

        await groupService.addMember(groupId, memberData);
        Alert.alert('成功', `${user.name}をグループに追加しました`, [
            { text: 'OK', onPress: () => {
            setSearchResults(results => results.filter(item => item.id !== user.id));
            }}
        ]);
        } catch (error) {
        console.error('Error adding member:', error);
        Alert.alert('エラー', 'メンバー追加に失敗しました');
        } finally {
        setAdding(false);
        }
    };

    const renderUserItem = ({ item }: { item: UserSearchResult }) => (
        <Card style={styles.userCard}>
        <Card.Content style={styles.userCardContent}>
            <Avatar.Text
            size={40}
            label={item.name.substring(0, 1) || '?'}
            color="white"  // テキストの色を白に設定
            style={{ backgroundColor: theme.colors.primary }}  // backgroundColorをstyleプロパティの中に移動
            />
            <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            </View>
            <Button
            mode="contained"
            onPress={() => handleAddMember(item)}
            style={styles.addButton}
            disabled={adding}
            >
            追加
            </Button>
        </Card.Content>
        </Card>
    );

    return (
        <View style={styles.container}>
        <View style={styles.searchContainer}>
            <Searchbar
            placeholder="メールアドレスまたは名前で検索"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            />
            <Button
            mode="contained"
            onPress={handleSearch}
            style={styles.searchButton}
            disabled={searching}
            >
            検索
            </Button>
        </View>
        
        {searching ? (
            <View style={styles.centeredContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        ) : searchResults.length > 0 ? (
            <FlatList
            data={searchResults}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.resultsList}
            />
        ) : (
            <View style={styles.centeredContainer}>
            <Text>検索結果がありません</Text>
            <Text style={styles.searchTip}>
                ヒント: 完全一致で検索されます。正確なメールアドレスを入力してください。
            </Text>
            </View>
        )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f3f4',
    },
    searchContainer: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchBar: {
        flex: 1,
        marginRight: 8,
    },
    searchButton: {
        backgroundColor: theme.colors.primary,
    },
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    searchTip: {
        marginTop: 10,
        color: '#666',
        textAlign: 'center',
    },
    resultsList: {
        padding: 16,
    },
    userCard: {
        marginBottom: 12,
        elevation: 2,
    },
    userCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    userEmail: {
        fontSize: 14,
        color: '#666',
    },
    addButton: {
        backgroundColor: theme.colors.primary,
    },
});

export default AddMemberScreen;
