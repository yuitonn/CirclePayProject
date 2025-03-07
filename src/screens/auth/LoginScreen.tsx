import React, { useState } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../styles/theme';

// 認証関連の画面の型定義
type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

// ナビゲーションの型を明示的に定義
type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [secureTextEntry, setSecureTextEntry] = useState(true);
    
    const { signIn } = useAuth();
    const navigation = useNavigation<LoginScreenNavigationProp>();

    const handleLogin = async () => {
        if (!email.trim()) {
        Alert.alert('入力エラー', 'メールアドレスを入力してください');
        return;
        }
        
        if (!password) {
        Alert.alert('入力エラー', 'パスワードを入力してください');
        return;
        }
        
        setLoading(true);
        
        try {
        await signIn(email, password);
        // ログイン成功時は自動的にAppNavigatorに切り替わる
        } catch (error: any) {
        console.error('Login error:', error);
        
        // エラーメッセージの日本語化
        let errorMessage = 'ログインに失敗しました';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'メールアドレスまたはパスワードが正しくありません';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = '有効なメールアドレスを入力してください';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'ログイン試行回数が多すぎます。しばらく経ってからお試しください';
        }
        
        Alert.alert('ログインエラー', errorMessage);
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
            <View style={styles.decorationBackground} />
            
            <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
                <Text style={styles.logoSymbol}>¥</Text>
            </View>
            <Text style={styles.appName}>CirclePay</Text>
            <Text style={styles.appTagline}>サークル会計をスマートに</Text>
            </View>
            
            <View style={styles.formContainer}>
            <TextInput
                label="メールアドレス"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
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
                left={<TextInput.Icon icon="lock" color={theme.colors.primary} />}
                right={<TextInput.Icon icon={secureTextEntry ? "eye" : "eye-off"} onPress={() => setSecureTextEntry(!secureTextEntry)} />}
                outlineColor="#ddd"
                activeOutlineColor={theme.colors.primary}
            />
            
            <Button
                mode="contained"
                onPress={handleLogin}
                style={styles.loginButton}
                labelStyle={styles.buttonLabel}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="white" size="small" /> : 'ログイン'}
            </Button>
            
            <View style={styles.registerContainer}>
                <Text style={styles.registerText}>アカウントをお持ちでない方は</Text>
                <Button
                mode="text"
                onPress={() => navigation.navigate('Register')}
                style={styles.registerButton}
                labelStyle={styles.registerButtonLabel}
                disabled={loading}
                >
                新規登録
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
        justifyContent: 'center',
    },
    decorationBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 220,
        backgroundColor: theme.colors.primary,
        opacity: 0.9,
        borderBottomLeftRadius: 50,
        borderBottomRightRadius: 50,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 40,
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    logoSymbol: {
        fontSize: 40,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    appName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    appTagline: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
    },
    formContainer: {
        paddingHorizontal: 32,
    },
    input: {
        marginBottom: 16,
        backgroundColor: 'white',
    },
    loginButton: {
        marginTop: 8,
        paddingVertical: 8,
        backgroundColor: theme.colors.primary,
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    registerContainer: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
    },
    registerText: {
        color: '#666',
        marginRight: 4,
    },
    registerButton: {
        marginTop: 4,
    },
    registerButtonLabel: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
});

export default LoginScreen;

