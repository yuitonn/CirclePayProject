// src/screens/home/HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Card, Button, FAB, Avatar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { eventService, Event } from '../../services/firebase/eventService';
import { paymentService, Payment } from '../../services/firebase/paymentService';
import { theme } from '../../styles/theme';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// ナビゲーションの型定義
type RootStackParamList = {
    Notifications: undefined;
    PaymentDetails: { paymentId: string };
    EventDetails: { eventId: string };
    CreateEvent: undefined;
    Payments: undefined;
    Events: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const HomeScreen = () => {
    const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
    const [upcomingPayments, setUpcomingPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    
    const { userData, user } = useAuth();
    const navigation = useNavigation<HomeScreenNavigationProp>();

    useEffect(() => {
        const fetchHomeData = async () => {
        if (userData) {
            setLoading(true);
            try {
            // 近日イベントを取得
            const groupIds = userData.groups || [];
            const events = await eventService.getUpcomingEvents(groupIds);
            setUpcomingEvents(events.slice(0, 2)); // 直近2件表示
            
            // 支払い予定を取得
            const payments = await paymentService.getUserPayments(groupIds);
            const activePayments = payments
                .filter(p => p.status === 'active')
                .sort((a, b) => a.dueDate.seconds - b.dueDate.seconds);
            setUpcomingPayments(activePayments.slice(0, 1)); // 直近1件表示
            } catch (error) {
            console.error('Error fetching home data:', error);
            } finally {
            setLoading(false);
            }
        }
        };
        
        fetchHomeData();
    }, [userData]);

    const handleCreateAction = () => {
        // アクション選択画面を表示または直接イベント作成へ
        navigation.navigate('CreateEvent');
    };

    const formatEventDate = (event: Event) => {
        const startDate = event.startDate.toDate();
        return format(startDate, 'M月d日(E) HH:mm', { locale: ja });
    };

    if (loading) {
        return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
        );
    }

    return (
        <View style={styles.container}>
        {/* ヘッダー部分 */}
        <View style={styles.header}>
            <Text style={styles.headerTitle}>ホーム</Text>
            <Avatar.Text 
            size={40}
            label={(userData?.name?.charAt(0) || "?").toUpperCase()}
            style={styles.avatar}
            />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* 支払いリマインダー */}
            {upcomingPayments.length > 0 && (
            <Card style={[styles.reminderCard, { marginBottom: 16 }]}>
                <View style={styles.reminderHeader}>
                <View style={styles.deadlineTag}>
                    <Text style={styles.deadlineText}>期限間近</Text>
                </View>
                </View>
                <Card.Content>
                <Text style={styles.reminderTitle}>{upcomingPayments[0].title}</Text>
                <Text style={styles.reminderDate}>
                    支払い期限: {format(upcomingPayments[0].dueDate.toDate(), 'M月d日', { locale: ja })}
                </Text>
                <View style={styles.reminderFooter}>
                    <Text style={styles.reminderAmount}>¥{upcomingPayments[0].perPersonAmount.toLocaleString()}</Text>
                    <Button 
                    mode="contained"
                    style={styles.payButton}
                    onPress={() => navigation.navigate('PaymentDetails', { paymentId: upcomingPayments[0].id })}
                    >
                    支払う
                    </Button>
                </View>
                </Card.Content>
            </Card>
            )}

            {/* 近日イベントセクション */}
            <Text style={styles.sectionTitle}>近日イベント</Text>
            
            {upcomingEvents.map((event) => (
            <Card 
                key={event.id} 
                style={styles.eventCard}
                onPress={() => navigation.navigate('EventDetails', { eventId: event.id })}
            >
                <View style={styles.eventBar}>
                {event.title.includes('バーベキュー') ? (
                    <View style={[styles.eventBarColor, { backgroundColor: theme.colors.primary }]} />
                ) : (
                    <View style={[styles.eventBarColor, { backgroundColor: '#3498DB' }]} />
                )}
                <Card.Content style={styles.eventContent}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventDate}>
                    {formatEventDate(event)}
                    </Text>
                    <View style={styles.eventFooter}>
                    <MaterialCommunityIcons name="map-marker" size={14} color="#666" />
                    <Text style={styles.eventLocation}>{event.location}</Text>
                    <Text style={styles.eventParticipants}>
                        参加者: {event.maxParticipants || 18}名
                    </Text>
                    </View>
                </Card.Content>
                </View>
            </Card>
            ))}
        </ScrollView>
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
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 15,
        backgroundColor: 'white',
        elevation: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    avatar: {
        backgroundColor: theme.colors.primary,
    },
    scrollContent: {
        padding: 16,
    },
    reminderCard: {
        marginBottom: 20,
        borderRadius: 15,
    },
    reminderHeader: {
        padding: 16,
        paddingBottom: 0,
    },
    deadlineTag: {
        alignSelf: 'flex-start',
        backgroundColor: '#FAE7E7',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 15,
    },
    deadlineText: {
        color: '#E74C3C',
        fontSize: 12,
        fontWeight: 'bold',
    },
    reminderTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 5,
    },
    reminderDate: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10,
    },
    reminderFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    reminderAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    payButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 12,
    },
    eventCard: {
        marginBottom: 12,
        borderRadius: 15,
        overflow: 'hidden',
    },
    eventBar: {
        flexDirection: 'row',
    },
    eventBarColor: {
        width: 5,
        height: '100%',
    },
    eventContent: {
        flex: 1,
        paddingVertical: 12,
    },
    eventTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    eventDate: {
        fontSize: 12,
        color: '#666',
        marginBottom: 8,
    },
    eventFooter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    eventLocation: {
        fontSize: 12,
        color: '#666',
        marginLeft: 2,
        marginRight: 15,
    },
    eventParticipants: {
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

export default HomeScreen;
