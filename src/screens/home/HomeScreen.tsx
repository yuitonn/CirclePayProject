// src/screens/home/HomeScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';

const HomeScreen = () => {
    const { signOut } = useAuth();

    return (
        <View style={styles.container}>
        <Text style={styles.title}>ホーム画面</Text>
        <Text style={styles.subtitle}>開発中です</Text>
        <Button
            mode="contained"
            style={styles.button}
            onPress={signOut}
        >
            ログアウト
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

export default HomeScreen;
