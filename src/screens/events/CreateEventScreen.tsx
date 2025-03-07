// src/screens/events/CreateEventScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText, Checkbox } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { eventService } from '../../services/firebase/eventService';
import { groupService } from '../../services/firebase/groupService';
import { Picker } from '@react-native-picker/picker';
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
    
    // UI状態
    const [loading, setLoading] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);
    const [showDropDown, setShowDropDown] = useState(false);
    const [groups, setGroups] = useState<{ label: string, value: string }[]>([]);
    
    // グループ情報の取得
    React.useEffect(() => {
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
        
        const eventId = await eventService.createEvent(eventData);
        
        // 自分自身を参加者として追加
        await eventService.addParticipant(eventId, {
            userId: user.uid,
            status: 'going'
        });
        
        // TODO: 支払い作成オプションが選択されている場合、支払いも作成
        
        Alert.alert('成功', 'イベントを作成しました', [
            { text: 'OK', onPress: () => navigation.navigate('EventDetails', { eventId }) }
        ]);
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
            style={styles.input}
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
            </View>
            
            {cost && parseInt(cost) > 0 && (
            <View style={styles.checkboxContainer}>
                <Checkbox.Item
                label="参加費の集金も作成する"
                status={createPayment ? 'checked' : 'unchecked'}
                onPress={() => setCreatePayment(!createPayment)}
                position="leading"
                style={styles.checkbox}
                />
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
    dateTimeContainer: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    dateButton: {
        flex: 3,
        marginRight: 8,
    },
    timeButton: {
        flex: 2,
    },
    checkboxContainer: {
        marginVertical: 8,
    },
    checkbox: {
        paddingLeft: 0,
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
    pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    backgroundColor: 'white',
    },
    picker: {
    height: 50,
    },
});

export default CreateEventScreen;
