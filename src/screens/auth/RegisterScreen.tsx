// src/screens/auth/RegisterScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// 認証関連の画面の型定義
type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

// ナビゲーションの型を明示的に定義
type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen = () => {
    // 型を指定してuseNavigationを使用
    const navigation = useNavigation<RegisterScreenNavigationProp>();

    return (
        <View style={styles.container}>
        <Text style={styles.title}>新規登録画面</Text>
        <Text style={styles.subtitle}>開発中です</Text>
        <Button
            mode="contained"
            style={styles.button}
            onPress={() => navigation.navigate('Login')}
        >
            ログイン画面へ戻る
        </Button>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 30,
    },
    button: {
        marginTop: 20,
        width: '100%',
    },
});

export default RegisterScreen;
