// src/screens/payments/PaymentDetailsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, TouchableOpacity, Share } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Button, Card, Chip, Divider, FAB, Menu, List } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { paymentService, Payment, Transaction } from '../../services/firebase/paymentService';
import { groupService } from '../../services/firebase/groupService';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../styles/theme';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

type PaymentsStackParamList = {
    Payments: undefined;
    PaymentDetails: { paymentId: string };
    EditPayment: { paymentId: string; payment: Payment };
    CreatePayment: undefined;
};

type PaymentDetailsScreenRouteProp = RouteProp<PaymentsStackParamList, 'PaymentDetails'>;
type PaymentDetailsScreenNavigationProp = StackNavigationProp<PaymentsStackParamList, 'PaymentDetails'>;

const PaymentDetailsScreen = () => {
    const [payment, setPayment] = useState<Payment | null>(null);
    const [group, setGroup] = useState<any | null>(null);
    const [transactions, setTransactions] = useState<(Transaction & { id: string; name?: string })[]>([]);
    const [userTransaction, setUserTransaction] = useState<(Transaction & { id: string }) | null>(null);
    const [loading, setLoading] = useState(true);
    const [menuVisible, setMenuVisible] = useState(false);
    const [expandedPaymentMethod, setExpandedPaymentMethod] = useState<string | null>(null);
    
    const route = useRoute<PaymentDetailsScreenRouteProp>();
    const navigation = useNavigation<PaymentDetailsScreenNavigationProp>();
    const { user, userData } = useAuth();
    const { paymentId } = route.params;
    
    // 支払い作成者かどうか
    const isCreator = user && payment?.createdBy === user.uid;
    
    useEffect(() => {
        const fetchPaymentDetails = async () => {
        try {
            // 支払い情報取得
            const paymentData = await paymentService.getPayment(paymentId);
            setPayment(paymentData);
            
            if (paymentData) {
            // グループ情報取得
            const groupData = await groupService.getGroup(paymentData.groupId);
            setGroup(groupData);
            
            // トランザクション一覧取得
            const transactionsData = await paymentService.getTransactions(paymentId);
            setTransactions(transactionsData);
            
            // ユーザー自身のトランザクション取得
            if (user) {
                const userTransactionData = await paymentService.getUserTransaction(paymentId, user.uid);
                setUserTransaction(userTransactionData);
            }
            }
        } catch (error) {
            console.error('Error fetching payment details:', error);
            Alert.alert('エラー', '支払い情報の取得に失敗しました');
        } finally {
            setLoading(false);
        }
        };
        
        fetchPaymentDetails();
    }, [paymentId, user]);

    const handleEditPayment = () => {
        if (payment) {
        navigation.navigate('EditPayment', { paymentId, payment });
        }
    };
    
    const handleDeletePayment = () => {
        Alert.alert(
        '確認',
        'この支払いを削除しますか？この操作は元に戻せません。',
        [
            { text: 'キャンセル', style: 'cancel' },
            {
            text: '削除する',
            style: 'destructive',
            onPress: async () => {
                try {
                await paymentService.deletePayment(paymentId);
                navigation.goBack();
                } catch (error) {
                console.error('Error deleting payment:', error);
                Alert.alert('エラー', '削除に失敗しました');
                }
            }
            }
        ]
        );
    };
    
    const handleMarkAsPaid = async (method: 'paypay' | 'bank' | 'cash') => {
        if (!user) return;
        
        try {
        if (userTransaction) {
            // 既存のトランザクションがある場合は更新
            await paymentService.updateTransaction(paymentId, userTransaction.id, {
            status: 'paid',
            method,
            paidAt: Timestamp.now()
            });
        } else {
            // 新規トランザクション作成
            await paymentService.createTransaction(paymentId, {
            userId: user.uid,
            amount: payment?.perPersonAmount || 0,
            method,
            status: 'paid',
            paidAt: Timestamp.now()
            });
        }
        
        // 画面を更新
        const updatedUserTransaction = await paymentService.getUserTransaction(paymentId, user.uid);
        setUserTransaction(updatedUserTransaction);
        } catch (error) {
        console.error('Error marking as paid:', error);
        Alert.alert('エラー', '支払い完了の登録に失敗しました');
        }
    };
    
    const handleConfirmPayment = async (transactionId: string, userId: string) => {
        if (!user) return;
        
        try {
        // トランザクションを確認済みに更新
        await paymentService.updateTransaction(paymentId, transactionId, {
            status: 'confirmed',
            confirmedAt: Timestamp.now(),
            confirmedBy: user.uid
        });
        
        // トランザクション一覧を更新
        const updatedTransactions = await paymentService.getTransactions(paymentId);
        setTransactions(updatedTransactions);
        
        // すべて集金済みかチェック
        const totalMembers = payment?.amount ? Math.floor(payment.amount / payment.perPersonAmount) : 0;
        const confirmedCount = updatedTransactions.filter(t => t.status === 'confirmed').length;
        
        if (totalMembers > 0 && confirmedCount >= totalMembers) {
            // すべて集金済みの場合、支払いのステータスを完了に
            await paymentService.completePayment(paymentId);
            const updatedPayment = await paymentService.getPayment(paymentId);
            setPayment(updatedPayment);
        }
        } catch (error) {
        console.error('Error confirming payment:', error);
        Alert.alert('エラー', '支払い確認の登録に失敗しました');
        }
    };
    
    const handleCancelPayment = async () => {
        try {
        await paymentService.cancelPayment(paymentId);
        const updatedPayment = await paymentService.getPayment(paymentId);
        setPayment(updatedPayment);
        } catch (error) {
        console.error('Error canceling payment:', error);
        Alert.alert('エラー', '支払いのキャンセルに失敗しました');
        }
    };
    
    const handleCompletePayment = async () => {
        try {
        await paymentService.completePayment(paymentId);
        const updatedPayment = await paymentService.getPayment(paymentId);
        setPayment(updatedPayment);
        } catch (error) {
        console.error('Error completing payment:', error);
        Alert.alert('エラー', '支払いの完了に失敗しました');
        }
    };
    
    const handleSharePayment = async () => {
        if (!payment) return;
        
        const message = `【CirclePay】支払い依頼: ${payment.title}\n` +
        `金額: ¥${payment.perPersonAmount.toLocaleString()}\n` +
        `期限: ${format(payment.dueDate.toDate(), 'yyyy年M月d日(E)', { locale: ja })}\n\n` +
        `■支払い方法\n`;
        
        try {
        await Share.share({
            message
        });
        } catch (error) {
        console.error('Error sharing payment:', error);
        }
    };
    
    // 支払い期限のフォーマット
    const formatDueDate = (date: Date) => {
        return format(date, 'yyyy年M月d日(E)', { locale: ja });
    };
    
    // 期限切れかどうかを判定
    const isOverdue = (dueDate: Date) => {
        return dueDate < new Date();
    };
    
    const getUserTransactionStatus = () => {
        if (!userTransaction) return null;
        
        switch (userTransaction.status) {
        case 'pending':
            return '未払い';
        case 'paid':
            return '支払い済み（確認待ち）';
        case 'confirmed':
            return '確認済み';
        default:
            return null;
        }
    };
    
    // 支払い方法の表示
    const renderPaymentMethod = (method: string) => {
        const isExpanded = expandedPaymentMethod === method;
        
        let icon = '';
        let title = '';
        let description = '';
        
        switch (method) {
        case 'paypay':
            icon = 'cellphone';
            title = 'PayPay';
            description = '送金アプリで支払う';
            break;
        case 'bank':
            icon = 'bank';
            title = '銀行振込';
            description = '指定口座に振り込む';
            break;
        case 'cash':
            icon = 'cash';
            title = '現金';
            description = '担当者に直接手渡す';
            break;
        default:
            return null;
        }
        
        return (
        <List.Accordion
            title={title}
            description={description}
            left={props => <List.Icon {...props} icon={icon} />}
            expanded={isExpanded}
            onPress={() => setExpandedPaymentMethod(isExpanded ? null : method)}
            style={styles.paymentMethodAccordion}
        >
            <View style={styles.paymentMethodContent}>
            {method === 'bank' && payment?.bankInfo && (
                <>
                <Text style={styles.bankInfoText}>銀行名: {payment.bankInfo.bankName}</Text>
                <Text style={styles.bankInfoText}>支店名: {payment.bankInfo.branchName}</Text>
                <Text style={styles.bankInfoText}>口座種別: {payment.bankInfo.accountType}</Text>
                <Text style={styles.bankInfoText}>口座番号: {payment.bankInfo.accountNumber}</Text>
                <Text style={styles.bankInfoText}>口座名義: {payment.bankInfo.accountHolder}</Text>
                </>
            )}
            
            {method === 'paypay' && payment?.paypayId && (
                <Text style={styles.paymentMethodText}>PayPay ID: {payment.paypayId}</Text>
            )}
            
            {method === 'cash' && (
                <Text style={styles.paymentMethodText}>
                集金担当者に直接お支払いください。
                </Text>
            )}
            
            {!userTransaction || userTransaction.status === 'pending' ? (
                <Button
                mode="contained"
                onPress={() => handleMarkAsPaid(method as 'paypay' | 'bank' | 'cash')}
                style={styles.payButton}
                disabled={payment?.status !== 'active'}
                >
                この方法で支払う
                </Button>
            ) : (
                <Chip
                style={styles.paidChip}
                icon={userTransaction.method === method ? "check" : undefined}
                >
                {userTransaction.method === method ? '支払済み' : ''}
                </Chip>
            )}
            </View>
        </List.Accordion>
        );
    };
    
    if (loading) {
        return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
        );
    }
    
    if (!payment) {
        return (
        <View style={styles.loadingContainer}>
            <Text>支払いが見つかりません</Text>
        </View>
        );
    }
    
    const dueDate = payment.dueDate.toDate();
    const overdueStatus = isOverdue(dueDate) && payment.status === 'active';
    
    return (
        <View style={styles.container}>
        <ScrollView>
            {/* ステータスバー */}
            {payment.status === 'active' && (
            <View style={[styles.statusBar, overdueStatus && styles.overdueStatusBar]}>
                <Text style={styles.statusText}>
                {overdueStatus 
                    ? '支払い期限が過ぎています' 
                    : '支払い受付中'
                }
                </Text>
            </View>
            )}
            
            {payment.status === 'completed' && (
            <View style={styles.completedStatusBar}>
                <Text style={styles.statusText}>
                完了済み
                </Text>
            </View>
            )}
            
            {payment.status === 'canceled' && (
            <View style={styles.canceledStatusBar}>
                <Text style={styles.statusText}>
                キャンセル済み
                </Text>
            </View>
            )}
            
            {/* 支払い詳細 */}
            <View style={styles.header}>
            <Text style={styles.title}>{payment.title}</Text>
            {group && (
                <Chip
                style={styles.groupChip}
                icon="account-group"
                onPress={() => {}}
                >
                {group.name}
                </Chip>
            )}
            </View>
            
            <Card style={styles.infoCard}>
            <Card.Content>
                <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar" size={20} color="#666" style={styles.infoIcon} />
                <Text style={styles.infoText}>支払期限: {formatDueDate(dueDate)}</Text>
                </View>
                
                <View style={styles.infoRow}>
                <MaterialCommunityIcons name="cash" size={20} color="#666" style={styles.infoIcon} />
                <Text style={styles.infoText}>支払金額: ¥{payment.perPersonAmount.toLocaleString()}</Text>
                </View>
                
                {isCreator && (
                <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="cash-multiple" size={20} color="#666" style={styles.infoIcon} />
                    <Text style={styles.infoText}>
                    集金状況: ¥{payment.collectedAmount.toLocaleString()} / {payment.amount.toLocaleString()}
                    </Text>
                </View>
                )}
                
                {userTransaction && (
                <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={20} color="#666" style={styles.infoIcon} />
                    <Text style={styles.infoText}>
                    ステータス: {getUserTransactionStatus()}
                    </Text>
                </View>
                )}
            </Card.Content>
            </Card>
            
            {payment.description && (
            <Card style={styles.descriptionCard}>
                <Card.Content>
                <Text style={styles.descriptionTitle}>支払い詳細</Text>
                <Text style={styles.descriptionText}>{payment.description}</Text>
                </Card.Content>
            </Card>
            )}
            
            {/* 支払い方法 */}
            <Card style={styles.paymentMethodsCard}>
            <Card.Content>
                <Text style={styles.paymentMethodsTitle}>支払い方法</Text>
                
                {payment.paymentMethods.map(method => renderPaymentMethod(method))}
            </Card.Content>
            </Card>
            
            {/* 集金者用トランザクション一覧 */}
            {isCreator && (
            <Card style={styles.transactionsCard}>
                <Card.Content>
                <Text style={styles.transactionsTitle}>支払い状況</Text>
                
                {transactions.length > 0 ? (
                    <View style={styles.transactionsList}>
                    {transactions.map(transaction => (
                        <View key={transaction.id} style={styles.transactionItem}>
                        <View style={styles.transactionInfo}>
                            <Text style={styles.transactionUser}>{transaction.userId}</Text>
                            <Text style={styles.transactionAmount}>¥{transaction.amount.toLocaleString()}</Text>
                            <Chip
                                style={[
                                    styles.transactionStatusChip,
                                    transaction.status === 'paid' && styles.paidStatusChip,
                                    transaction.status === 'confirmed' && styles.confirmedStatusChip
                                ]}
                                >
                                {transaction.status === 'pending' ? '未払い' : 
                                transaction.status === 'paid' ? '支払済' : '確認済'}
                                </Chip>
                        </View>
                        
                        {transaction.status === 'paid' && (
                            <Button
                            mode="outlined"
                            onPress={() => handleConfirmPayment(transaction.id, transaction.userId)}
                            style={styles.confirmButton}
                            >
                            確認する
                            </Button>
                        )}
                        </View>
                    ))}
                    </View>
                ) : (
                    <Text style={styles.noTransactionsText}>まだ支払いはありません</Text>
                )}
                </Card.Content>
            </Card>
            )}
            
            {/* アクションボタン */}
            <View style={styles.actionButtonsContainer}>
            {payment.status === 'active' && !isCreator && (!userTransaction || userTransaction.status === 'pending') && (
                <Button
                mode="contained"
                onPress={() => setExpandedPaymentMethod(payment.paymentMethods[0] || null)}
                style={styles.actionButton}
                icon="cash"
                >
                支払う
                </Button>
            )}
            
            {payment.status === 'active' && isCreator && (
                <Button
                mode="contained"
                onPress={handleSharePayment}
                style={[styles.actionButton, styles.shareButton]}
                icon="share-variant"
                >
                支払い情報を共有
                </Button>
            )}
            
            {payment.status === 'active' && isCreator && (
                <Button
                mode="outlined"
                onPress={handleCompletePayment}
                style={styles.actionButton}
                icon="check"
                >
                集金完了にする
                </Button>
            )}
            </View>
        </ScrollView>
        
        {isCreator && payment.status === 'active' && (
            <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
                <FAB
                style={styles.fab}
                icon="dots-vertical"
                onPress={() => setMenuVisible(true)}
                color="white"
                />
            }
            >
            <Menu.Item onPress={handleEditPayment} title="支払いを編集" />
            <Menu.Item onPress={handleCancelPayment} title="支払いをキャンセル" />
            <Menu.Item onPress={handleDeletePayment} title="支払いを削除" />
            </Menu>
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
    statusBar: {
        backgroundColor: theme.colors.primary,
        padding: 8,
        alignItems: 'center',
    },
    overdueStatusBar: {
        backgroundColor: theme.colors.error,
    },
    completedStatusBar: {
        backgroundColor: '#4CAF50',
    },
    canceledStatusBar: {
        backgroundColor: '#9E9E9E',
    },
    statusText: {
        color: 'white',
        fontWeight: 'bold',
    },
    header: {
        padding: 16,
        backgroundColor: 'white',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    groupChip: {
        alignSelf: 'flex-start',
    },
    infoCard: {
        margin: 16,
        marginTop: 8,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    infoIcon: {
        marginRight: 8,
    },
    infoText: {
        fontSize: 16,
        flex: 1,
    },
    descriptionCard: {
        margin: 16,
        marginTop: 0,
    },
    descriptionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 14,
        lineHeight: 20,
    },
    paymentMethodsCard: {
        margin: 16,
        marginTop: 0,
    },
    paymentMethodsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    paymentMethodAccordion: {
        backgroundColor: 'white',
    },
    paymentMethodContent: {
        padding: 16,
        paddingTop: 0,
    },
    bankInfoText: {
        fontSize: 14,
        marginBottom: 4,
    },
    paymentMethodText: {
        fontSize: 14,
        marginBottom: 12,
    },
    payButton: {
        marginTop: 12,
        backgroundColor: theme.colors.primary,
    },
    paidChip: {
        marginTop: 12,
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
    },
    transactionsCard: {
        margin: 16,
        marginTop: 0,
        marginBottom: 80,
    },
    transactionsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    transactionsList: {
    },
    transactionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    transactionInfo: {
        flex: 1,
    },
    transactionUser: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    transactionAmount: {
        fontSize: 14,
        color: '#666',
    },
    transactionStatusChip: {
        alignSelf: 'flex-start',
        marginTop: 4,
        backgroundColor: '#eee',
    },
    paidStatusChip: {
        backgroundColor: 'rgba(33, 150, 243, 0.2)',
    },
    confirmedStatusChip: {
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
    },
    confirmButton: {
        marginLeft: 8,
    },
    noTransactionsText: {
        textAlign: 'center',
        color: '#666',
        fontStyle: 'italic',
        marginTop: 8,
    },
    actionButtonsContainer: {
        padding: 16,
        marginBottom: 16,
    },
    actionButton: {
        marginBottom: 8,
        backgroundColor: theme.colors.primary,
    },
    shareButton: {
        backgroundColor: '#3498db',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        backgroundColor: theme.colors.primary,
    },
});

export default PaymentDetailsScreen;
