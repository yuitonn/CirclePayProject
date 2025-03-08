// src/screens/payments/CreatePaymentScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText, Checkbox, List } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Timestamp } from 'firebase/firestore';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../hooks/useAuth';
import { paymentService } from '../../services/firebase/paymentService';
import { groupService } from '../../services/firebase/groupService';
import { eventService } from '../../services/firebase/eventService';
import { theme } from '../../styles/theme';

type PaymentsStackParamList = {
    Payments: undefined;
    PaymentDetails: { paymentId: string };
    CreatePayment: undefined;
};

type CreatePaymentScreenNavigationProp = StackNavigationProp<PaymentsStackParamList, 'CreatePayment'>;

const CreatePaymentScreen = () => {
    const { userData, user } = useAuth();
    const navigation = useNavigation<CreatePaymentScreenNavigationProp>();
    
    // フォーム状態
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [perPersonAmount, setPerPersonAmount] = useState('');
    const [dueDate, setDueDate] = useState(new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)); // 1週間後
    const [groupId, setGroupId] = useState('');
    const [eventId, setEventId] = useState('');
    const [paymentMethods, setPaymentMethods] = useState<string[]>(['cash']);
    
    // Bank info
    const [bankName, setBankName] = useState('');
    const [branchName, setBranchName] = useState('');
    const [accountType, setAccountType] = useState('普通');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountHolder, setAccountHolder] = useState('');
    
    // PayPay info
    const [paypayId, setPaypayId] = useState('');
    
    // UI状態
    const [loading, setLoading] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [groups, setGroups] = useState<{ label: string, value: string }[]>([]);
    const [events, setEvents] = useState<{ label: string, value: string }[]>([]);
    const [isLinkedToEvent, setIsLinkedToEvent] = useState(false);
    
    // グループ情報の取得
    useEffect(() => {
        const fetchGroups = async () => {
        if (userData && userData.groups && userData.groups.length > 0) {
            const groupList: { label: string, value: string }[] = [];
            
            for (const groupId of userData.groups) {
            try {
                const group = await groupService.getGroup(groupId);
                if (group) {
                groupList.push({
                    label: group.name,
                    value: group.id
                });
                }
            } catch (error) {
                console.error('Error fetching group:', error);
            }
            }
            
            setGroups(groupList);
            
            // 最初のグループを選択
            if (groupList.length > 0 && !groupId) {
            setGroupId(groupList[0].value);
            }
        }
        };
        
        fetchGroups();
    }, [userData]);
    
    // グループに関連するイベントの取得
    useEffect(() => {
        const fetchEvents = async () => {
        if (groupId) {
            try {
            const groupEvents = await eventService.getGroupEvents(groupId);
            
            // 未来のイベントのみフィルタリング
            const now = new Date();
            const futureEvents = groupEvents.filter(event => 
                event.startDate.toDate() > now
            );
            
            const eventList = futureEvents.map(event => ({
                label: event.title,
                value: event.id
            }));
            
            setEvents(eventList);
            } catch (error) {
            console.error('Error fetching events:', error);
            }
        }
        };
        
        fetchEvents();
    }, [groupId]);
    
    // 支払い方法の選択/解除
    const togglePaymentMethod = (method: string) => {
        setPaymentMethods(current => 
        current.includes(method) 
            ? current.filter(m => m !== method) 
            : [...current, method]
        );
    };
    
    // 日付選択ハンドラー
    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
        setDueDate(selectedDate);
        }
    };
    
    // 人数変更時の一人当たり金額計算
    const calculatePerPersonAmount = (totalAmount: string, numPeople: string) => {
        const total = parseInt(totalAmount || '0');
        const people = parseInt(numPeople || '0');
        
        if (total > 0 && people > 0) {
        const perPerson = Math.ceil(total / people);
        setPerPersonAmount(perPerson.toString());
        } else {
        setPerPersonAmount('');
        }
    };
    
    // 一人当たり金額変更時の総額計算
    const calculateTotalAmount = (perPerson: string, numPeople: string) => {
        const perPersonValue = parseInt(perPerson || '0');
        const people = parseInt(numPeople || '0');
        
        if (perPersonValue > 0 && people > 0) {
        const total = perPersonValue * people;
        setAmount(total.toString());
        } else {
        setAmount('');
        }
    };
    
    // 支払い作成処理
    const handleCreatePayment = async () => {
        // バリデーション
        if (!title.trim()) {
        Alert.alert('入力エラー', '支払い名を入力してください');
        return;
        }
        
        if (!amount || parseInt(amount) <= 0) {
        Alert.alert('入力エラー', '総額を入力してください');
        return;
        }
        
        if (!perPersonAmount || parseInt(perPersonAmount) <= 0) {
        Alert.alert('入力エラー', '一人当たり金額を入力してください');
        return;
        }
        
        if (!groupId) {
        Alert.alert('選択エラー', 'グループを選択してください');
        return;
        }
        
        if (paymentMethods.length === 0) {
        Alert.alert('選択エラー', '少なくとも1つの支払い方法を選択してください');
        return;
        }
        
        if (paymentMethods.includes('bank') && (!bankName || !accountNumber || !accountHolder)) {
        Alert.alert('入力エラー', '銀行情報を入力してください');
        return;
        }
        
        if (paymentMethods.includes('paypay') && !paypayId) {
        Alert.alert('入力エラー', 'PayPay IDを入力してください');
        return;
        }
        
        if (!user) {
        Alert.alert('エラー', 'ログインが必要です');
        return;
        }
        
        setLoading(true);
        
        try {
        // 銀行振込情報
        const bankInfo = paymentMethods.includes('bank') ? {
            bankName,
            branchName,
            accountType,
            accountNumber,
            accountHolder
        } : undefined;
        
        const paymentData = {
            title: title.trim(),
            description: description.trim(),
            amount: parseInt(amount),
            perPersonAmount: parseInt(perPersonAmount),
            dueDate: Timestamp.fromDate(dueDate),
            createdBy: user.uid,
            groupId,
            eventId: isLinkedToEvent && eventId ? eventId : undefined,
            status: 'active' as const,
            paymentMethods,
            bankInfo,
            paypayId: paymentMethods.includes('paypay') ? paypayId : undefined
        };
        
        const paymentId = await paymentService.createPayment(paymentData);
        
        Alert.alert('成功', '支払いを作成しました', [
            { text: 'OK', onPress: () => navigation.navigate('PaymentDetails', { paymentId }) }
        ]);
        } catch (error) {
        console.error('Error creating payment:', error);
        Alert.alert('エラー', '支払い作成に失敗しました。再度お試しください');
        } finally {
        setLoading(false);
        }
    };
    
    // 日付をフォーマット
    const formatDate = (date: Date) => {
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    };
    
    return (
        <ScrollView style={styles.container}>
        <View style={styles.formContainer}>
            <TextInput
            label="支払い名"
            value={title}
            onChangeText={setTitle}
            mode="outlined"
            style={styles.input}
            placeholder="例: 合宿費"
            />
            
            <TextInput
            label="説明（任意）"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={styles.input}
            placeholder="支払いの詳細を入力してください"
            />
            
            <View style={styles.amountContainer}>
            <View style={styles.amountInputContainer}>
                <TextInput
                label="総額"
                value={amount}
                onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9]/g, '');
                    setAmount(numericText);
                    if (numericText) {
                    // 必要なら人数から一人当たり金額を計算
                    const totalPeople = Math.floor(parseInt(numericText) / parseInt(perPersonAmount || '1'));
                    if (totalPeople > 0) {
                        // この部分は必要に応じて調整
                    } else {
                        // デフォルトでは一人当たり金額も同じに
                        setPerPersonAmount(numericText);
                    }
                    }
                }}
                mode="outlined"
                keyboardType="number-pad"
                style={styles.amountInput}
                right={<TextInput.Affix text="円" />}
                />
            </View>
            
            <View style={styles.amountInputContainer}>
                <TextInput
                label="一人当たり金額"
                value={perPersonAmount}
                onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9]/g, '');
                    setPerPersonAmount(numericText);
                    if (numericText && amount) {
                    // 総額は変更しない（複数人の集金を前提）
                    } else if (numericText) {
                    // 1人分として総額にも反映
                    setAmount(numericText);
                    }
                }}
                mode="outlined"
                keyboardType="number-pad"
                style={styles.amountInput}
                right={<TextInput.Affix text="円" />}
                />
            </View>
            </View>
            
            <Text style={styles.label}>支払期限</Text>
            <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
            >
            {formatDate(dueDate)}
            </Button>
            
            {showDatePicker && (
            <DateTimePicker
                value={dueDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                minimumDate={new Date()}
            />
            )}
            
            <Text style={styles.label}>グループ</Text>
            {groups.length > 0 ? (
            <View style={styles.pickerWrapper}>
                <Picker
                selectedValue={groupId}
                onValueChange={(itemValue) => setGroupId(itemValue)}
                style={styles.picker}
                >
                {groups.map((group) => (
                    <Picker.Item key={group.value} label={group.label} value={group.value} />
                ))}
                </Picker>
            </View>
            ) : (
            <HelperText type="error">
                所属グループがありません。先にグループを作成してください。
            </HelperText>
            )}
            
            <Checkbox.Item
            label="イベントに関連付ける"
            status={isLinkedToEvent ? 'checked' : 'unchecked'}
            onPress={() => setIsLinkedToEvent(!isLinkedToEvent)}
            position="leading"
            style={styles.checkbox}
            />
            
            {isLinkedToEvent && (
            <>
                <Text style={styles.label}>イベント</Text>
                {events.length > 0 ? (
                <View style={styles.pickerWrapper}>
                    <Picker
                    selectedValue={eventId}
                    onValueChange={(itemValue) => setEventId(itemValue)}
                    style={styles.picker}
                    >
                    <Picker.Item label="選択してください" value="" />
                    {events.map((event) => (
                        <Picker.Item key={event.value} label={event.label} value={event.value} />
                    ))}
                    </Picker>
                </View>
                ) : (
                <HelperText type="info">
                    このグループには今後のイベントがありません。
                </HelperText>
                )}
            </>
            )}
            
            <Text style={styles.label}>支払い方法（1つ以上選択）</Text>
            
            <Checkbox.Item
            label="PayPay"
            status={paymentMethods.includes('paypay') ? 'checked' : 'unchecked'}
            onPress={() => togglePaymentMethod('paypay')}
            position="leading"
            style={styles.checkbox}
            />
            
            {paymentMethods.includes('paypay') && (
            <TextInput
                label="PayPay ID"
                value={paypayId}
                onChangeText={setPaypayId}
                mode="outlined"
                style={styles.nestedInput}
                placeholder="あなたのPayPay IDを入力"
            />
            )}
            
            <Checkbox.Item
            label="銀行振込"
            status={paymentMethods.includes('bank') ? 'checked' : 'unchecked'}
            onPress={() => togglePaymentMethod('bank')}
            position="leading"
            style={styles.checkbox}
            />
            
            {paymentMethods.includes('bank') && (
            <View style={styles.bankInfoContainer}>
                <TextInput
                label="銀行名"
                value={bankName}
                onChangeText={setBankName}
                mode="outlined"
                style={styles.nestedInput}
                placeholder="例: 〇〇銀行"
                />
                
                <TextInput
                label="支店名"
                value={branchName}
                onChangeText={setBranchName}
                mode="outlined"
                style={styles.nestedInput}
                placeholder="例: 〇〇支店"
                />
                
                <View style={styles.accountTypeContainer}>
                <Text style={styles.label}>口座種別</Text>
                <View style={styles.pickerWrapper}>
                    <Picker
                    selectedValue={accountType}
                    onValueChange={(itemValue) => setAccountType(itemValue)}
                    style={styles.picker}
                    >
                    <Picker.Item label="普通" value="普通" />
                    <Picker.Item label="当座" value="当座" />
                    <Picker.Item label="貯蓄" value="貯蓄" />
                    </Picker>
                </View>
                </View>
                
                <TextInput
                label="口座番号"
                value={accountNumber}
                onChangeText={setAccountNumber}
                mode="outlined"
                style={styles.nestedInput}
                placeholder="例: 1234567"
                keyboardType="number-pad"
                />
                
                <TextInput
                label="口座名義"
                value={accountHolder}
                onChangeText={setAccountHolder}
                mode="outlined"
                style={styles.nestedInput}
                placeholder="例: ヤマダタロウ"
                />
            </View>
            )}
            
            <Checkbox.Item
            label="現金"
            status={paymentMethods.includes('cash') ? 'checked' : 'unchecked'}
            onPress={() => togglePaymentMethod('cash')}
            position="leading"
            style={styles.checkbox}
            />
            
            <Button
            mode="contained"
            onPress={handleCreatePayment}
            style={styles.createButton}
            loading={loading}
            disabled={loading || groups.length === 0}
            >
            支払いを作成
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
    formContainer: {
        padding: 16,
    },
    input: {
        marginBottom: 16,
        backgroundColor: 'white',
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        marginTop: 8,
        color: '#666',
    },
    amountContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    amountInputContainer: {
        flex: 1,
        marginRight: 8,
    },
    amountInput: {
        backgroundColor: 'white',
    },
    dateButton: {
        marginBottom: 16,
    },
    pickerContainer: {
        marginBottom: 16,
    },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
        backgroundColor: 'white',
        marginBottom: 16,
    },
    picker: {
        height: 50,
    },
    checkbox: {
        paddingLeft: 0,
    },
    nestedInput: {
        marginLeft: 32,
        marginRight: 8,
        marginBottom: 12,
        backgroundColor: 'white',
    },
    bankInfoContainer: {
        marginBottom: 8,
    },
    accountTypeContainer: {
        marginLeft: 32,
        marginRight: 8,
        marginBottom: 12,
    },
    createButton: {
        marginTop: 24,
        marginBottom: 32,
        paddingVertical: 8,
        backgroundColor: theme.colors.primary,
    },
});

export default CreatePaymentScreen;
