import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../hooks/useAuth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { theme } from '../../styles/theme';

// 認証関連の画面の型定義
type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

// ナビゲーションの型を明示的に定義
type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [secureTextEntry, setSecureTextEntry] = useState(true);
    const [secureConfirmTextEntry, setSecureConfirmTextEntry] = useState(true);

    const { signUp } = useAuth();
    const navigation = useNavigation<RegisterScreenNavigationProp>();

    const handleRegister = async () => {
        // 入力バリデーション
        if (!name.trim()) {
        Alert.alert('入力エラー', '名前を入力してください');
        return;
        }
        
        if (!email.trim()) {
        Alert.alert('入力エラー', 'メールアドレスを入力してください');
        return;
        }
        
        if (!password) {
        Alert.alert('入力エラー', 'パスワードを入力してください');
        return;
        }
        
        if (password.length < 8) {
        Alert.alert('入力エラー', 'パスワードは8文字以上で入力してください');
        return;
        }
        
        if (password !== confirmPassword) {
        Alert.alert('入力エラー', 'パスワードと確認用パスワードが一致しません');
        return;
        }
        
        setLoading(true);
        
        try {
        // Firebase Authで新規ユーザー登録
        const userCredential = await signUp(email, password);
        const userId = userCredential.uid;
        
        // Firestoreにユーザー情報を保存
        await setDoc(doc(db, 'users', userId), {
            name: name.trim(),
            email: email.trim(),
            createdAt: new Date(),
            groups: []
        });
        
        // 登録完了後は自動的にAppNavigatorに切り替わる
        } catch (error: any) {
        console.error('Registration error:', error);
        
        // エラーメッセージの日本語化
        let errorMessage = '登録に失敗しました';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'このメールアドレスは既に使用されています';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = '有効なメールアドレスを入力してください';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'パスワードが短すぎます。8文字以上で設定してください';
        }
        
        Alert.alert('登録エラー', errorMessage);
        } finally {
        setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
        >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.header}>
            <Button
                icon="arrow-left"
                onPress={() => navigation.navigate('Login')}
                mode="text"
                style={styles.backButton}
                labelStyle={styles.backButtonLabel}
            >
                戻る
            </Button>
            <Text style={styles.headerTitle}>新規登録</Text>
            </View>
            
            <View style={styles.formContainer}>
            <TextInput
                label="名前"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                placeholder="例: 山田太郎"
                left={<TextInput.Icon icon="account" color={theme.colors.primary} />}
                outlineColor="#ddd"
                activeOutlineColor={theme.colors.primary}
            />
            
            <TextInput
                label="メールアドレス"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                placeholder="例: email@example.com"
                left={<TextInput.Icon icon="email" color={theme.colors.primary} />}
                outlineColor="#ddd"
                activeOutlineColor={theme.colors.primary}
            />
            
            <TextInput
                label="パスワード"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secureTextEntry}
                mode="outlined"
                style={styles.input}
                placeholder="8文字以上"
                left={<TextInput.Icon icon="lock" color={theme.colors.primary} />}
                right={<TextInput.Icon icon={secureTextEntry ? "eye" : "eye-off"} onPress={() => setSecureTextEntry(!secureTextEntry)} />}
                outlineColor="#ddd"
                activeOutlineColor={theme.colors.primary}
            />
            
            <TextInput
                label="確認用パスワード"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={secureConfirmTextEntry}
                mode="outlined"
                style={styles.input}
                placeholder="もう一度入力"
                left={<TextInput.Icon icon="lock-check" color={theme.colors.primary} />}
                right={<TextInput.Icon icon={secureConfirmTextEntry ? "eye" : "eye-off"} onPress={() => setSecureConfirmTextEntry(!secureConfirmTextEntry)} />}
                outlineColor="#ddd"
                activeOutlineColor={theme.colors.primary}
            />
            
            <Button
                mode="contained"
                onPress={handleRegister}
                style={styles.registerButton}
                labelStyle={styles.buttonLabel}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="white" size="small" /> : 'アカウント作成'}
            </Button>
            
            <View style={styles.loginContainer}>
                <Text style={styles.loginText}>既にアカウントをお持ちの方は</Text>
                <Button
                mode="text"
                onPress={() => navigation.navigate('Login')}
                style={styles.loginButton}
                labelStyle={styles.loginButtonLabel}
                >
                ログイン
                </Button>
            </View>
            </View>
        </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContainer: {
        flexGrow: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: '#fff',
    },
    backButton: {
        marginRight: 16,
    },
    backButtonLabel: {
        color: theme.colors.primary,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    formContainer: {
        paddingHorizontal: 32,
        paddingTop: 20,
    },
    input: {
        marginBottom: 16,
        backgroundColor: 'white',
    },
    registerButton: {
        marginTop: 8,
        paddingVertical: 8,
        backgroundColor: theme.colors.primary,
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    loginContainer: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
    },
    loginText: {
        color: '#666',
        marginRight: 4,
    },
    loginButton: {
        marginTop: 4,
    },
    loginButtonLabel: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
});

export default RegisterScreen;
