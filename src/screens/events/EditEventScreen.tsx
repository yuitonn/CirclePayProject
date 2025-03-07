// src/screens/events/EditEventScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Timestamp } from 'firebase/firestore';
import { eventService, Event } from '../../services/firebase/eventService';
import { theme } from '../../styles/theme';

type EventsStackParamList = {
    Events: undefined;
    EventDetails: { eventId: string };
    EditEvent: { eventId: string; event: Event };
    CreateEvent: undefined;
};

type EditEventScreenRouteProp = RouteProp<EventsStackParamList, 'EditEvent'>;
type EditEventScreenNavigationProp = StackNavigationProp<EventsStackParamList, 'EditEvent'>;

const EditEventScreen = () => {
    const route = useRoute<EditEventScreenRouteProp>();
    const navigation = useNavigation<EditEventScreenNavigationProp>();
    const { eventId, event: eventData } = route.params;
    
    // フォーム状態
    const [title, setTitle] = useState(eventData.title || '');
    const [description, setDescription] = useState(eventData.description || '');
    const [location, setLocation] = useState(eventData.location || '');
    const [startDate, setStartDate] = useState(eventData.startDate.toDate());
    const [endDate, setEndDate] = useState(eventData.endDate.toDate());
    const [maxParticipants, setMaxParticipants] = useState(
        eventData.maxParticipants ? eventData.maxParticipants.toString() : ''
    );
    const [cost, setCost] = useState(
        eventData.cost ? eventData.cost.toString() : ''
    );
    
    // UI状態
    const [loading, setLoading] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);
    
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
    
    // イベント更新処理
    const handleUpdateEvent = async () => {
        // バリデーション
        if (!title.trim()) {
        Alert.alert('入力エラー', 'イベント名を入力してください');
        return;
        }
        
        if (!location.trim()) {
        Alert.alert('入力エラー', '場所を入力してください');
        return;
        }
        
        setLoading(true);
        
        try {
        const eventUpdateData = {
            title: title.trim(),
            description: description.trim(),
            location: location.trim(),
            startDate: Timestamp.fromDate(startDate),
            endDate: Timestamp.fromDate(endDate),
            maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
            cost: cost ? parseInt(cost) : undefined
        };
        
        await eventService.updateEvent(eventId, eventUpdateData);
        
        Alert.alert('成功', 'イベントを更新しました', [
            { text: 'OK', onPress: () => navigation.navigate('EventDetails', { eventId }) }
        ]);
        } catch (error) {
        console.error('Error updating event:', error);
        Alert.alert('エラー', 'イベント更新に失敗しました。再度お試しください');
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
            
            <Button
            mode="contained"
            onPress={handleUpdateEvent}
            style={styles.updateButton}
            loading={loading}
            disabled={loading}
            >
            イベントを更新
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
    updateButton: {
        marginTop: 24,
        marginBottom: 32,
        paddingVertical: 8,
        backgroundColor: theme.colors.primary,
    },
});

export default EditEventScreen;
