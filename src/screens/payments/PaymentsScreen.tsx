// src/screens/payments/PaymentsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Card, FAB, Chip, Button, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { paymentService, Payment } from '../../services/firebase/paymentService';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../styles/theme';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

type PaymentsStackParamList = {
    Payments: undefined;
    PaymentDetails: { paymentId: string };
    CreatePayment: undefined;
};

type PaymentsScreenNavigationProp = StackNavigationProp<PaymentsStackParamList, 'Payments'>;

const PaymentsScreen = () => {
    const [mode, setMode] = useState<'pay' | 'collect'>('pay');
    const [payments, setPayments] = useState<Payment[]>([]);
    const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    const { userData } = useAuth();
    const navigation = useNavigation<PaymentsScreenNavigationProp>();

    useEffect(() => {
        const fetchPayments = async () => {
        setLoading(true);
        try {
            if (userData) {
            let fetchedPayments: Payment[] = [];
            
            if (mode === 'pay') {
                // 支払う側として表示するデータ
                const groupIds = userData.groups || [];
                fetchedPayments = await paymentService.getUserPayments(groupIds);
            } else {
                // 集める側として表示するデータ
                fetchedPayments = await paymentService.getCollectingPayments();
            }
            
            // 期限でソート
            fetchedPayments.sort((a, b) => {
                // アクティブな支払いを先に
                if (a.status === 'active' && b.status !== 'active') return -1;
                if (a.status !== 'active' && b.status === 'active') return 1;
                
                // アクティブな支払いの中では期限が早いものを先に
                if (a.status === 'active' && b.status === 'active') {
                return a.dueDate.seconds - b.dueDate.seconds;
                }
                
                // それ以外は作成日の新しいものを先に
                return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
            });
            
            setPayments(fetchedPayments);
            filterPayments(fetchedPayments, searchQuery);
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
        };

        fetchPayments();
    }, [userData, mode]);

    // 支払いのフィルタリング
    const filterPayments = (allPayments: Payment[], query: string) => {
        if (!query) {
        setFilteredPayments(allPayments);
        return;
        }
        
        const lowercaseQuery = query.toLowerCase();
        const filtered = allPayments.filter(payment => 
        payment.title.toLowerCase().includes(lowercaseQuery) ||
        (payment.description && payment.description.toLowerCase().includes(lowercaseQuery))
        );
        
        setFilteredPayments(filtered);
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        filterPayments(payments, query);
    };

    const handleCreatePayment = () => {
        navigation.navigate('CreatePayment');
    };

    const handleOpenPayment = (paymentId: string) => {
        navigation.navigate('PaymentDetails', { paymentId });
    };

    // 支払い期限のフォーマット
    const formatDueDate = (date: Date) => {
        return format(date, 'yyyy年M月d日(E)', { locale: ja });
    };

    // 期限切れかどうかを判定
    const isOverdue = (dueDate: Date) => {
        return dueDate < new Date();
    };

    // 残り日数の表示用文字列
    const getRemainingDaysText = (dueDate: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dueDay = new Date(dueDate);
        dueDay.setHours(0, 0, 0, 0);
        
        const diffTime = dueDay.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
        return `期限切れ（${Math.abs(diffDays)}日経過）`;
        } else if (diffDays === 0) {
        return '今日が期限';
        } else if (diffDays === 1) {
        return '明日が期限';
        } else {
        return `あと${diffDays}日`;
        }
    };

    const renderPaymentItem = ({ item }: { item: Payment }) => {
        const dueDate = item.dueDate.toDate();
        const overdue = isOverdue(dueDate) && item.status === 'active';
        const remainingDaysText = getRemainingDaysText(dueDate);
        
        return (
        <Card 
            style={[
            styles.paymentCard, 
            item.status === 'completed' && styles.completedPaymentCard,
            item.status === 'canceled' && styles.canceledPaymentCard
            ]} 
            onPress={() => handleOpenPayment(item.id)}
        >
            <Card.Content>
            <View style={styles.paymentHeader}>
                <Text style={styles.paymentTitle}>{item.title}</Text>
                {item.status === 'active' && (
                <Chip 
                    style={[
                    styles.statusChip, 
                    overdue && styles.overdueChip
                    ]}
                    textStyle={{ color: overdue ? 'white' : theme.colors.primary }}
                >
                    {remainingDaysText}
                </Chip>
                )}
                {item.status === 'completed' && (
                <Chip style={styles.completedChip}>
                    完了
                </Chip>
                )}
                {item.status === 'canceled' && (
                <Chip style={styles.canceledChip}>
                    キャンセル
                </Chip>
                )}
            </View>
            
            <View style={styles.paymentDetails}>
                <Text style={styles.dueDate}>
                支払期限: {formatDueDate(dueDate)}
                </Text>
                
                <View style={styles.amountContainer}>
                <Text style={styles.amount}>¥{item.perPersonAmount.toLocaleString()}</Text>
                {mode === 'collect' && (
                    <Text style={styles.collectedAmount}>
                    集金額: ¥{item.collectedAmount.toLocaleString()} / {item.amount.toLocaleString()}
                    </Text>
                )}
                </View>
            </View>
            </Card.Content>
        </Card>
        );
    };

    return (
        <View style={styles.container}>
        <View style={styles.tabContainer}>
            <TouchableOpacity
            style={[styles.tab, mode === 'pay' && styles.activeTab]}
            onPress={() => setMode('pay')}
            >
            <Text style={[styles.tabText, mode === 'pay' && styles.activeTabText]}>支払う</Text>
            </TouchableOpacity>
            <TouchableOpacity
            style={[styles.tab, mode === 'collect' && styles.activeTab]}
            onPress={() => setMode('collect')}
            >
            <Text style={[styles.tabText, mode === 'collect' && styles.activeTabText]}>集める</Text>
            </TouchableOpacity>
        </View>
        
        <View style={styles.searchContainer}>
            <Searchbar
            placeholder="支払いを検索"
            onChangeText={handleSearch}
            value={searchQuery}
            style={styles.searchBar}
            />
        </View>
        
        {loading ? (
            <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        ) : (
            <FlatList
            data={filteredPayments}
            renderItem={renderPaymentItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                    {searchQuery 
                    ? '検索条件に一致する支払いがありません' 
                    : mode === 'pay' 
                        ? '支払い予定がありません' 
                        : '集金中の支払いはありません'}
                </Text>
                </View>
            }
            />
        )}
        
        {mode === 'collect' && (
            <FAB
            style={styles.fab}
            icon="plus"
            onPress={handleCreatePayment}
            color="white"
            />
        )}
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
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'white',
        elevation: 2,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: theme.colors.primary,
    },
    tabText: {
        fontSize: 16,
        color: '#666',
    },
    activeTabText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    searchContainer: {
        padding: 16,
    },
    searchBar: {
        elevation: 2,
    },
    listContainer: {
        padding: 16,
        paddingTop: 0,
    },
    paymentCard: {
        marginBottom: 12,
        elevation: 2,
    },
    completedPaymentCard: {
        opacity: 0.7,
    },
    canceledPaymentCard: {
        opacity: 0.5,
        backgroundColor: '#f8f8f8',
    },
    paymentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    paymentTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
    },
    statusChip: {
        backgroundColor: 'rgba(155, 197, 61, 0.2)',
    },
    overdueChip: {
        backgroundColor: theme.colors.error,
    },
    completedChip: {
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
    },
    canceledChip: {
        backgroundColor: 'rgba(158, 158, 158, 0.2)',
    },
    paymentDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dueDate: {
        fontSize: 14,
        color: '#666',
    },
    amountContainer: {
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    collectedAmount: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
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
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        backgroundColor: theme.colors.primary,
    },
});

export default PaymentsScreen;
