// src/screens/groups/EditGroupScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, RadioButton } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { groupService, Group } from '../../services/firebase/groupService';
import { theme } from '../../styles/theme';

const EditGroupScreen = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'circle' | 'club' | 'committee' | 'other'>('circle');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    
    const route = useRoute();
    const navigation = useNavigation();
    const { groupId, group } = route.params as { groupId: string, group: Group };

    useEffect(() => {
        if (group) {
        setName(group.name || '');
        setDescription(group.description || '');
        setType(group.type || 'circle');
        setInitialLoading(false);
        } else {
        const fetchGroup = async () => {
            try {
            const groupData = await groupService.getGroup(groupId);
            if (groupData) {
                setName(groupData.name || '');
                setDescription(groupData.description || '');
                setType(groupData.type || 'circle');
            }
            } catch (error) {
            console.error('Error fetching group:', error);
            Alert.alert('エラー', 'グループ情報の取得に失敗しました');
            } finally {
            setInitialLoading(false);
            }
        };
        
        fetchGroup();
        }
    }, [groupId, group]);

    const handleUpdateGroup = async () => {
        if (!name.trim()) {
        Alert.alert('エラー', 'グループ名を入力してください');
        return;
        }

        setLoading(true);
        try {
        const groupData = {
            name: name.trim(),
            description: description.trim(),
            type,
        };

        await groupService.updateGroup(groupId, groupData);
        Alert.alert('成功', 'グループ情報を更新しました', [
            { text: 'OK', onPress: () => navigation.goBack() }
        ]);
        } catch (error) {
        console.error('Error updating group:', error);
        Alert.alert('エラー', '更新に失敗しました。再度お試しください');
        } finally {
        setLoading(false);
        }
    };

    if (initialLoading) {
        return (
        <View style={styles.loadingContainer}>
            <Text>読み込み中...</Text>
        </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
        <View style={styles.formContainer}>
            <Text style={styles.label}>グループ名</Text>
            <TextInput
            mode="outlined"
            value={name}
            onChangeText={setName}
            placeholder="例: バドミントンサークル"
            style={styles.input}
            />

            <Text style={styles.label}>説明</Text>
            <TextInput
            mode="outlined"
            value={description}
            onChangeText={setDescription}
            placeholder="グループの説明を入力してください"
            multiline
            numberOfLines={4}
            style={styles.input}
            />

            <Text style={styles.label}>グループタイプ</Text>
            <View style={styles.radioContainer}>
            <RadioButton.Group onValueChange={(value) => setType(value as any)} value={type}>
                <RadioButton.Item label="サークル" value="circle" />
                <RadioButton.Item label="部活動" value="club" />
                <RadioButton.Item label="委員会" value="committee" />
                <RadioButton.Item label="その他" value="other" />
            </RadioButton.Group>
            </View>

            <Button
            mode="contained"
            onPress={handleUpdateGroup}
            style={styles.updateButton}
            loading={loading}
            disabled={loading}
            >
            更新する
            </Button>
        </View>
        </ScrollView>
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
    formContainer: {
        padding: 16,
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        marginTop: 16,
        color: '#666',
    },
    input: {
        backgroundColor: 'white',
        marginBottom: 8,
    },
    radioContainer: {
        backgroundColor: 'white',
        borderRadius: 8,
        marginBottom: 24,
    },
    updateButton: {
        marginTop: 16,
        backgroundColor: theme.colors.primary,
        paddingVertical: 8,
    },
});

export default EditGroupScreen;
