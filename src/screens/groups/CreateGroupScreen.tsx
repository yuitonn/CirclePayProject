// src/screens/groups/CreateGroupScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { TextInput, Button, Text, RadioButton } from 'react-native-paper';
import { groupService } from '../../services/firebase/groupService';
import { theme } from '../../styles/theme';
import { useAuth } from '../../hooks/useAuth';

// ナビゲーションの型定義
type GroupStackParamList = {
    Groups: undefined;
    GroupDetails: { groupId: string };
    CreateGroup: undefined;
    };

type CreateGroupScreenNavigationProp = StackNavigationProp<GroupStackParamList, 'CreateGroup'>;

const CreateGroupScreen = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'circle' | 'club' | 'committee' | 'other'>('circle');
    const [loading, setLoading] = useState(false);
    
    const navigation = useNavigation<CreateGroupScreenNavigationProp>();
    const { user } = useAuth();

    const handleCreateGroup = async () => {
        if (!name.trim()) {
        Alert.alert('エラー', 'グループ名を入力してください');
        return;
        }

        if (!user) {
        Alert.alert('エラー', 'ログインが必要です');
        return;
        }

        setLoading(true);
        try {
        const groupData = {
            name: name.trim(),
            description: description.trim(),
            type,
            adminUsers: [],
            createdBy: user.uid 
        };

        const groupId = await groupService.createGroup(groupData);
        Alert.alert('成功', 'グループを作成しました', [
            { 
            text: 'OK', 
            onPress: () => navigation.navigate('GroupDetails', { groupId }) 
            }
        ]);
        } catch (error) {
        console.error('Error creating group:', error);
        Alert.alert('エラー', '作成に失敗しました。再度お試しください');
        } finally {
        setLoading(false);
        }
    };

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
            style={[styles.input, { paddingBottom: 70, paddingTop: 10 }]}
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
            onPress={handleCreateGroup}
            style={styles.createButton}
            loading={loading}
            disabled={loading}
            >
            グループを作成
            </Button>
        </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
  // スタイルは変更なし
    container: {
        flex: 1,
        backgroundColor: '#f0f3f4',
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
    createButton: {
        marginTop: 16,
        backgroundColor: theme.colors.primary,
        paddingVertical: 8,
    },
});

export default CreateGroupScreen;
