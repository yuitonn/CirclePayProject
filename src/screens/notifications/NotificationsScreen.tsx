// src/screens/notifications/NotificationsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Card, Button, IconButton, Divider, Badge } from 'react-native-paper';
import { notificationService, Notification } from '../../services/firebase/notificationService';
import { theme } from '../../styles/theme';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// ナビゲーションの型定義
type RootStackParamList = {
    Notifications: undefined;
    PaymentDetails: { paymentId: string };
    EventDetails: { eventId: string };
};

type NotificationsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Notifications'>;

const NotificationsScreen = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const navigation = useNavigation<NotificationsScreenNavigationProp>();

    useEffect(() => {
        fetchNotifications();
        
        // 自動通知チェックを実行
        checkAutomaticNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
        setLoading(true);
        const notificationsList = await notificationService.getUserNotifications();
        setNotifications(notificationsList);
        } catch (error) {
        console.error('Error fetching notifications:', error);
        } finally {
        setLoading(false);
        setRefreshing(false);
        }
    };

    const checkAutomaticNotifications = async () => {
        try {
        // 支払い期限通知のチェック
        await notificationService.checkPaymentDueNotifications();
        
        // 近日イベント通知のチェック
        await notificationService.checkUpcomingEventNotifications();
        
        // 通知を再取得
        fetchNotifications();
        } catch (error) {
        console.error('Error checking automatic notifications:', error);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const handleMarkAsRead = async (notification: Notification) => {
        try {
        if (!notification.isRead) {
            await notificationService.markAsRead(notification.id);
            
            // 通知リストを更新
            setNotifications(notifications.map(item => 
            item.id === notification.id ? { ...item, isRead: true } : item
            ));
        }
        
        // 通知タイプに応じた画面に遷移
        navigateToRelatedScreen(notification);
        } catch (error) {
        console.error('Error marking notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
        await notificationService.markAllAsRead();
        
        // 通知リストを更新
        setNotifications(notifications.map(item => ({ ...item, isRead: true })));
        } catch (error) {
        console.error('Error marking all as read:', error);
        }
    };

    const navigateToRelatedScreen = (notification: Notification) => {
        if (!notification.relatedId) return;
        
        switch (notification.type) {
        case 'payment':
            // @ts-ignore - 型エラーを一時的に無視
            navigation.navigate('PaymentDetails', { paymentId: notification.relatedId });
            break;
        case 'event':
            // @ts-ignore - 型エラーを一時的に無視
            navigation.navigate('EventDetails', { eventId: notification.relatedId });
            break;
        default:
            break;
        }
    };

    const formatNotificationDate = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMinutes < 60) {
        return `${diffMinutes}分前`;
        } else if (diffHours < 24) {
        return `${diffHours}時間前`;
        } else if (diffDays < 7) {
        return `${diffDays}日前`;
        } else {
        return format(date, 'M月d日', { locale: ja });
        }
    };

    const renderNotificationItem = ({ item }: { item: Notification }) => {
        const notificationDate = item.createdAt.toDate();
        
        let iconName = 'bell';
        let iconColor = theme.colors.primary;
        
        switch (item.type) {
        case 'payment':
            iconName = 'cash';
            iconColor = theme.colors.accent;
            break;
        case 'event':
            iconName = 'calendar';
            iconColor = '#3498db';
            break;
        case 'system':
            iconName = 'information';
            iconColor = '#9b59b6';
            break;
        }
        
        return (
        <Card 
            style={[styles.notificationCard, item.isRead && styles.readCard]} 
            onPress={() => handleMarkAsRead(item)}
        >
            <Card.Content style={styles.cardContent}>
            {!item.isRead && (
                <Badge style={styles.unreadBadge} />
            )}
            
            {/* アイコンボタンの修正 */}
            <View style={styles.iconContainer}>
                <IconButton
                icon={iconName}
                style={styles.notificationIcon}
                />
            </View>
            
            <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>{item.title}</Text>
                <Text style={styles.notificationMessage}>{item.message}</Text>
                <Text style={styles.notificationDate}>{formatNotificationDate(notificationDate)}</Text>
            </View>
            </Card.Content>
        </Card>
        );
    };

    if (loading && !refreshing) {
        return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
        );
    }

    return (
        <View style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.headerTitle}>通知</Text>
            {notifications.some(n => !n.isRead) && (
            <Button 
                mode="text" 
                onPress={handleMarkAllAsRead}
                style={styles.markAllButton}
            >
                すべて既読にする
            </Button>
            )}
        </View>
        
        <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>通知はありません</Text>
            </View>
            }
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        elevation: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    markAllButton: {
        marginLeft: 8,
    },
    listContainer: {
        padding: 16,
        paddingTop: 8,
    },
    notificationCard: {
        marginBottom: 12,
        elevation: 2,
    },
    readCard: {
        opacity: 0.7,
        backgroundColor: '#fafafa',
    },
    cardContent: {
        flexDirection: 'row',
        position: 'relative',
    },
    unreadBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: theme.colors.primary,
    },
    iconContainer: {
        // アイコンのためのコンテナ
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationIcon: {
        margin: 0,
    },
    notificationContent: {
        flex: 1,
        marginLeft: 8,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    notificationMessage: {
        fontSize: 14,
        marginBottom: 4,
        color: '#666',
    },
    notificationDate: {
        fontSize: 12,
        color: '#999',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
        color: '#666',
    },
});

export default NotificationsScreen;

