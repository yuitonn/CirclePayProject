// src/screens/events/CreateEventScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText, Checkbox, Divider, Menu, Provider, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { eventService } from '../../services/firebase/eventService';
import { groupService } from '../../services/firebase/groupService';
import { paymentService } from '../../services/firebase/paymentService';
import { theme } from '../../styles/theme';

type EventsStackParamList = {
    Events: undefined;
    EventDetails: { eventId: string };
    CreateEvent: undefined;
};

type CreateEventScreenNavigationProp = StackNavigationProp<EventsStackParamList, 'CreateEvent'>;

const CreateEventScreen = () => {
    const { userData, user } = useAuth();
    const navigation = useNavigation<CreateEventScreenNavigationProp>();
    
    // フォーム状態
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date(new Date().getTime() + 2 * 60 * 60 * 1000)); // 2時間後
    const [maxParticipants, setMaxParticipants] = useState('');
    const [cost, setCost] = useState('');
    const [groupId, setGroupId] = useState('');
    const [createPayment, setCreatePayment] = useState(false);
    const [paymentDueDate, setPaymentDueDate] = useState(new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)); // 1週間後
    
    // UI状態
    const [loading, setLoading] = useState(false);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);
    const [showDueDatePicker, setShowDueDatePicker] = useState(false);
    const [groups, setGroups] = useState<{ label: string, value: string }[]>([]);
    const [groupMenuVisible, setGroupMenuVisible] = useState(false);
    const [selectedGroupName, setSelectedGroupName] = useState('グループを選択');
    
    // グループ情報の取得
    useEffect(() => {
        const fetchGroups = async () => {
            setLoadingGroups(true);
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
                    setSelectedGroupName(groupList[0].label);
                }
            }
            setLoadingGroups(false);
        };
        
        fetchGroups();
    }, [userData]);
    
    // グループ選択ハンドラー
    const handleSelectGroup = (id: string, name: string) => {
        setGroupId(id);
        setSelectedGroupName(name);
        setGroupMenuVisible(false);
    };
    
    // 日付選択ハンドラー
    const onStartDateChange = (event: any, selectedDate?: Date) => {
        setShowStartDatePicker(false);
        if (selectedDate) {
            const currentStartDate = new Date(startDate);
            currentStartDate.setFullYear(selectedDate.getFullYear());
            currentStartDate.setMonth(selectedDate.getMonth());
            currentStartDate.setDate(selectedDate.getDate());
            setStartDate(currentStartDate);
            
            // 終了日が開始日より前の場合、終了日を開始日と同じに
            if (endDate < currentStartDate) {
                const newEndDate = new Date(currentStartDate);
                newEndDate.setHours(currentStartDate.getHours() + 2); // デフォルト2時間
                setEndDate(newEndDate);
            }
        }
    };
    
    const onStartTimeChange = (event: any, selectedTime?: Date) => {
        setShowStartTimePicker(false);
        if (selectedTime) {
            const currentStartDate = new Date(startDate);
            currentStartDate.setHours(selectedTime.getHours());
            currentStartDate.setMinutes(selectedTime.getMinutes());
            setStartDate(currentStartDate);
            
            // 終了時間が開始時間より前の場合、終了時間を開始時間+2時間に
            const currentEndDate = new Date(endDate);
            if (
                currentEndDate.getFullYear() === currentStartDate.getFullYear() &&
                currentEndDate.getMonth() === currentStartDate.getMonth() &&
                currentEndDate.getDate() === currentStartDate.getDate() &&
                (currentEndDate.getHours() < currentStartDate.getHours() ||
                (currentEndDate.getHours() === currentStartDate.getHours() &&
                    currentEndDate.getMinutes() < currentStartDate.getMinutes()))
            ) {
                const newEndDate = new Date(currentStartDate);
                newEndDate.setHours(currentStartDate.getHours() + 2);
                setEndDate(newEndDate);
            }
        }
    };
    
    const onEndDateChange = (event: any, selectedDate?: Date) => {
        setShowEndDatePicker(false);
        if (selectedDate) {
            const currentEndDate = new Date(endDate);
            currentEndDate.setFullYear(selectedDate.getFullYear());
            currentEndDate.setMonth(selectedDate.getMonth());
            currentEndDate.setDate(selectedDate.getDate());
            
            // 終了日が開始日より前の場合はエラー
            if (currentEndDate < startDate) {
                Alert.alert('エラー', '終了日は開始日以降に設定してください');
                return;
            }
            
            setEndDate(currentEndDate);
        }
    };
    
    const onEndTimeChange = (event: any, selectedTime?: Date) => {
        setShowEndTimePicker(false);
        if (selectedTime) {
            const currentEndDate = new Date(endDate);
            currentEndDate.setHours(selectedTime.getHours());
            currentEndDate.setMinutes(selectedTime.getMinutes());
            
            // 同じ日で、終了時間が開始時間より前の場合はエラー
            if (
                currentEndDate.getFullYear() === startDate.getFullYear() &&
                currentEndDate.getMonth() === startDate.getMonth() &&
                currentEndDate.getDate() === startDate.getDate() &&
                currentEndDate < startDate
            ) {
                Alert.alert('エラー', '終了時間は開始時間以降に設定してください');
                return;
            }
            
            setEndDate(currentEndDate);
        }
    };
    
    const onDueDateChange = (event: any, selectedDate?: Date) => {
        setShowDueDatePicker(false);
        if (selectedDate) {
            setPaymentDueDate(selectedDate);
        }
    };
    
    // イベント作成処理
    const handleCreateEvent = async () => {
        // バリデーション
        if (!title.trim()) {
            Alert.alert('入力エラー', 'イベント名を入力してください');
            return;
        }
        
        if (!location.trim()) {
            Alert.alert('入力エラー', '場所を入力してください');
            return;
        }
        
        if (!groupId) {
            Alert.alert('選択エラー', 'グループを選択してください');
            return;
        }
        
        if (!user) {
            Alert.alert('エラー', 'ログインが必要です');
            return;
        }
        
        setLoading(true);
        
        try {
            // イベントデータ準備
            const eventData = {
                title: title.trim(),
                description: description.trim(),
                location: location.trim(),
                startDate: Timestamp.fromDate(startDate),
                endDate: Timestamp.fromDate(endDate),
                createdBy: user.uid,
                groupId: groupId,
                maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
                cost: cost ? parseInt(cost) : undefined
            };
            
            // イベント作成
            const eventId = await eventService.createEvent(eventData);
            
            // 自分自身を参加者として追加
            await eventService.addParticipant(eventId, {
                userId: user.uid,
                status: 'going'
            });
            
            // 支払い作成オプションが選択されており、コストが設定されている場合
            if (createPayment && cost && parseInt(cost) > 0) {
                // 支払いデータの準備
                const paymentData = {
                    title: `${title.trim()} 参加費`,
                    description: `${title.trim()}の参加費用です`,
                    amount: parseInt(cost) * (maxParticipants ? parseInt(maxParticipants) : 1), // 総額（概算）
                    perPersonAmount: parseInt(cost),
                    dueDate: Timestamp.fromDate(paymentDueDate),
                    createdBy: user.uid,
                    eventId: eventId,
                    groupId: groupId,
                    status: 'active' as 'active', // 型を明示的に指定
                    paymentMethods: ['paypay', 'bank', 'cash'] // デフォルトの支払い方法
                };
                
                // 支払い作成
                const paymentId = await paymentService.createPayment(paymentData);
                
                // イベントに支払いIDを関連付け
                await eventService.updateEvent(eventId, { paymentId });
                
                Alert.alert('成功', 'イベントと参加費集金を作成しました', [
                    { text: 'OK', onPress: () => navigation.navigate('Events') }
                ]);
            } else {
                Alert.alert('成功', 'イベントを作成しました', [
                    { text: 'OK', onPress: () => navigation.navigate('EventDetails', { eventId }) }
                ]);
            }
        } catch (error) {
            console.error('Error creating event:', error);
            Alert.alert('エラー', 'イベント作成に失敗しました。再度お試しください');
        } finally {
            setLoading(false);
        }
    };
    
    // 日付をフォーマット
    const formatDate = (date: Date) => {
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    };
    
    const formatTime = (date: Date) => {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };
    
    return (
        <Provider>
            <ScrollView style={styles.container}>
                <View style={styles.formContainer}>
                    <TextInput
                        label="イベント名"
                        value={title}
                        onChangeText={setTitle}
                        mode="outlined"
                        style={styles.input}
                        placeholder="例: バーベキュー大会"
                    />
                    
                    <TextInput
                        label="説明"
                        value={description}
                        onChangeText={setDescription}
                        mode="outlined"
                        multiline
                        numberOfLines={4}
                        style={styles.input}
                        placeholder="イベントの詳細を入力してください"
                    />
                    
                    <TextInput
                        label="場所"
                        value={location}
                        onChangeText={setLocation}
                        mode="outlined"
                        style={styles.input}
                        placeholder="例: 多摩川河川敷"
                    />
                    
                    <Text style={styles.label}>開始日時</Text>
                    <View style={styles.dateTimeContainer}>
                        <Button
                            mode="outlined"
                            onPress={() => setShowStartDatePicker(true)}
                            style={styles.dateButton}
                        >
                            {formatDate(startDate)}
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={() => setShowStartTimePicker(true)}
                            style={styles.timeButton}
                        >
                            {formatTime(startDate)}
                        </Button>
                    </View>
                    
                    {showStartDatePicker && (
                        <DateTimePicker
                            value={startDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onStartDateChange}
                        />
                    )}
                    
                    {showStartTimePicker && (
                        <DateTimePicker
                            value={startDate}
                            mode="time"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onStartTimeChange}
                        />
                    )}
                    
                    <Text style={styles.label}>終了日時</Text>
                    <View style={styles.dateTimeContainer}>
                        <Button
                            mode="outlined"
                            onPress={() => setShowEndDatePicker(true)}
                            style={styles.dateButton}
                        >
                            {formatDate(endDate)}
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={() => setShowEndTimePicker(true)}
                            style={styles.timeButton}
                        >
                            {formatTime(endDate)}
                        </Button>
                    </View>
                    
                    {showEndDatePicker && (
                        <DateTimePicker
                            value={endDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onEndDateChange}
                            minimumDate={startDate}
                        />
                    )}
                    
                    {showEndTimePicker && (
                        <DateTimePicker
                            value={endDate}
                            mode="time"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onEndTimeChange}
                        />
                    )}
                    
                    <TextInput
                        label="最大参加人数（任意）"
                        value={maxParticipants}
                        onChangeText={(text) => setMaxParticipants(text.replace(/[^0-9]/g, ''))}
                        mode="outlined"
                        style={[styles.input, styles.participantsInput]}
                        keyboardType="number-pad"
                        placeholder="無制限の場合は空欄"
                    />
                    
                    <TextInput
                        label="参加費（任意）"
                        value={cost}
                        onChangeText={(text) => setCost(text.replace(/[^0-9]/g, ''))}
                        mode="outlined"
                        style={styles.input}
                        keyboardType="number-pad"
                        placeholder="例: 1500"
                        right={<TextInput.Affix text="円" />}
                    />
                    
                    <View style={styles.pickerContainer}>
                        <Text style={styles.label}>グループ</Text>
                        {loadingGroups ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                                <Text style={styles.loadingText}>グループ情報を読み込み中...</Text>
                            </View>
                        ) : groups.length > 0 ? (
                            <View>
                                <Button
                                    mode="outlined"
                                    onPress={() => setGroupMenuVisible(true)}
                                    style={styles.dropdownButton}
                                    icon="chevron-down"
                                >
                                    {selectedGroupName}
                                </Button>
                                <Menu
                                    visible={groupMenuVisible}
                                    onDismiss={() => setGroupMenuVisible(false)}
                                    anchor={<View />}
                                    style={styles.menu}
                                >
                                    {groups.map((group) => (
                                        <Menu.Item
                                            key={group.value}
                                            onPress={() => handleSelectGroup(group.value, group.label)}
                                            title={group.label}
                                            titleStyle={groupId === group.value ? styles.selectedItem : undefined}
                                        />
                                    ))}
                                </Menu>
                            </View>
                        ) : (
                            <HelperText type="error">
                                所属グループがありません。先にグループを作成してください。
                            </HelperText>
                        )}
                    </View>
                    
                    {cost && parseInt(cost) > 0 && (
                        <View style={styles.paymentSection}>
                            <Divider style={styles.divider} />
                            <Text style={styles.sectionTitle}>参加費の集金設定</Text>
                            
                            <View style={styles.checkboxContainer}>
                                    <View style={styles.customCheckbox}>
                                        <Checkbox
                                            status={createPayment ? 'checked' : 'unchecked'}
                                            onPress={() => setCreatePayment(!createPayment)}
                                            color={theme.colors.primary}
                                        />
                                    </View>
                                    <Text 
                                        style={styles.checkboxLabel} 
                                        onPress={() => setCreatePayment(!createPayment)}
                                    >
                                        このイベントの参加費を集金する
                                    </Text>
                            </View>
                            
                            {createPayment && (
                                <View style={styles.paymentDetailsContainer}>
                                    <Text style={styles.infoText}>
                                        参加費: {cost}円 × {maxParticipants || '参加者数'} = {parseInt(cost) * (maxParticipants ? parseInt(maxParticipants) : 1)}円（概算）
                                    </Text>
                                    
                                    <Text style={styles.label}>支払い期限</Text>
                                    <Button
                                        mode="outlined"
                                        onPress={() => setShowDueDatePicker(true)}
                                        style={styles.dueDateButton}
                                    >
                                        {formatDate(paymentDueDate)}
                                    </Button>
                                    
                                    {showDueDatePicker && (
                                        <DateTimePicker
                                            value={paymentDueDate}
                                            mode="date"
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                            onChange={onDueDateChange}
                                            minimumDate={new Date()}
                                        />
                                    )}
                                </View>
                            )}
                        </View>
                    )}
                    
                    <Button
                        mode="contained"
                        onPress={handleCreateEvent}
                        style={styles.createButton}
                        loading={loading}
                        disabled={loading || groups.length === 0}
                    >
                        イベントを作成
                    </Button>
                </View>
            </ScrollView>
        </Provider>
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
    participantsInput: {
        marginTop: 14, 
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        marginTop: 8,
        color: '#666',
    },
    dateTimeContainer: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    dateButton: {
        flex: 3,
        marginRight: 8,
        backgroundColor: 'white',
    },
    timeButton: {
        flex: 2,
        backgroundColor: 'white',
    },
    dueDateButton: {
        marginBottom: 16,
    },
    checkboxContainer: {
        marginVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        paddingLeft: 0,
    },
    checkboxLabel: {
        fontSize: 16,
        paddingLeft: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 8,
        marginBottom: 16,
        color: '#333',
    },
    customCheckbox: {
        borderWidth: 1,
        borderColor: '#666',
        backgroundColor: 'white',
    },
    infoText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 6,
    },
    divider: {
        marginVertical: 16,
    },
    paymentSection: {
        marginBottom: 16,
    },
    paymentDetailsContainer: {
        marginTop: 8,
        backgroundColor: '#f9f9f9',
        padding: 12,
        borderRadius: 8,
    },
    createButton: {
        marginTop: 24,
        marginBottom: 32,
        paddingVertical: 8,
        backgroundColor: theme.colors.primary,
    },
    pickerContainer: {
        marginBottom: 16,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    loadingText: {
        marginLeft: 10,
        color: '#666',
        fontSize: 14,
    },
    selectedItem: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    dropdownButton: {
        backgroundColor: 'white',
        justifyContent: 'flex-start',
    },
    menu: {
        marginTop: 45, // メニューの表示位置調整
    }
});

export default CreateEventScreen;
