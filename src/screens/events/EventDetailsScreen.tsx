// src/screens/events/EventDetailsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Button, FAB, Menu, Card, Avatar, Chip, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { eventService, Event, EventParticipant } from '../../services/firebase/eventService';
import { groupService } from '../../services/firebase/groupService';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../styles/theme';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

type EventsStackParamList = {
    Events: undefined;
    EventDetails: { eventId: string };
    EditEvent: { eventId: string; event: Event };
    CreateEvent: undefined;
};

type EventDetailsScreenRouteProp = RouteProp<EventsStackParamList, 'EventDetails'>;
type EventDetailsScreenNavigationProp = StackNavigationProp<EventsStackParamList, 'EventDetails'>;

const EventDetailsScreen = () => {
    const [event, setEvent] = useState<Event | null>(null);
    const [group, setGroup] = useState<any | null>(null);
    const [participants, setParticipants] = useState<(EventParticipant & { id: string; name?: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [menuVisible, setMenuVisible] = useState(false);
    const [myStatus, setMyStatus] = useState<'going' | 'maybe' | 'notGoing' | null>(null);
    const [participantsExpanded, setParticipantsExpanded] = useState(false);
    
    const route = useRoute<EventDetailsScreenRouteProp>();
    const navigation = useNavigation<EventDetailsScreenNavigationProp>();
    const { user, userData } = useAuth();
    const { eventId } = route.params;
    
    // イベント作成者かどうか
    const isCreator = user && event?.createdBy === user.uid;
    
    useEffect(() => {
        const fetchEventDetails = async () => {
        try {
            const eventData = await eventService.getEvent(eventId);
            setEvent(eventData);
            
            if (eventData) {
            // グループ情報取得
            const groupData = await groupService.getGroup(eventData.groupId);
            setGroup(groupData);
            
            // 参加者情報取得
            const participantsData = await eventService.getEventParticipants(eventId);
            
            // 参加者の名前を取得
            const participantsWithNames = await Promise.all(
                participantsData.map(async (participant) => {
                try {
                    const userDoc = await getDoc(doc(db, 'users', participant.userId));
                    const userData = userDoc.exists() ? userDoc.data() : null;
                    return {
                    ...participant,
                    name: userData?.name || '名前なし'
                    };
                } catch (error) {
                    return {
                    ...participant,
                    name: '名前なし'
                    };
                }
                })
            );
            
            setParticipants(participantsWithNames);
            
            // 自分の参加ステータスを設定
            if (user) {
                const myParticipantData = participantsData.find(p => p.userId === user.uid);
                if (myParticipantData) {
                setMyStatus(myParticipantData.status);
                }
            }
            }
        } catch (error) {
            console.error('Error fetching event details:', error);
            Alert.alert('エラー', 'イベント情報の取得に失敗しました');
        } finally {
            setLoading(false);
        }
        };
        
        fetchEventDetails();
    }, [eventId, user]);
    
    const handleEditEvent = () => {
        if (event) {
        navigation.navigate('EditEvent', { eventId, event });
        }
    };
    
    const handleDeleteEvent = () => {
        Alert.alert(
        '確認',
        'このイベントを削除しますか？この操作は元に戻せません。',
        [
            { text: 'キャンセル', style: 'cancel' },
            {
            text: '削除する',
            style: 'destructive',
            onPress: async () => {
                try {
                await eventService.deleteEvent(eventId);
                navigation.goBack();
                } catch (error) {
                console.error('Error deleting event:', error);
                Alert.alert('エラー', '削除に失敗しました');
                }
            }
            }
        ]
        );
    };
    
    const handleUpdateStatus = async (status: 'going' | 'maybe' | 'notGoing') => {
        if (!user) return;
        
        try {
        if (myStatus === null) {
            // 初めての参加
            await eventService.addParticipant(eventId, {
            userId: user.uid,
            status
            });
        } else {
            // 参加ステータス更新
            await eventService.updateParticipant(eventId, user.uid, {
            status
            });
        }
        
        setMyStatus(status);
        
        // 参加者リストを更新
        const updatedParticipants = [...participants];
        const myIndex = updatedParticipants.findIndex(p => p.userId === user.uid);
        
        if (myIndex >= 0) {
            updatedParticipants[myIndex] = {
            ...updatedParticipants[myIndex],
            status
            };
        } else {
            updatedParticipants.push({
            id: user.uid,
            userId: user.uid,
            status,
            name: userData?.name || '名前なし'
            });
        }
        
        setParticipants(updatedParticipants);
        } catch (error) {
        console.error('Error updating participant status:', error);
        Alert.alert('エラー', '参加ステータスの更新に失敗しました');
        }
    };
    
    // 日時のフォーマット
    const formatEventDateTime = () => {
        if (!event) return '';
        
        const startDate = event.startDate.toDate();
        const endDate = event.endDate.toDate();
        
        const isSameDay = 
        startDate.getDate() === endDate.getDate() &&
        startDate.getMonth() === endDate.getMonth() &&
        startDate.getFullYear() === endDate.getFullYear();
        
        if (isSameDay) {
        return `${format(startDate, 'yyyy年M月d日(E)', { locale: ja })} ${format(startDate, 'HH:mm')}〜${format(endDate, 'HH:mm')}`;
        } else {
        return `${format(startDate, 'yyyy年M月d日(E) HH:mm', { locale: ja })}〜${format(endDate, 'M月d日(E) HH:mm', { locale: ja })}`;
        }
    };
    
    const getParticipantsSummary = () => {
        const going = participants.filter(p => p.status === 'going').length;
        const maybe = participants.filter(p => p.status === 'maybe').length;
        const notGoing = participants.filter(p => p.status === 'notGoing').length;
        
        return `参加: ${going}人 / 未定: ${maybe}人 / 不参加: ${notGoing}人`;
    };
    
    const renderParticipantItem = (participant: EventParticipant & { id: string; name?: string }) => {
        const statusColors = {
        going: theme.colors.primary,
        maybe: theme.colors.warning,
        notGoing: theme.colors.error
        };
        
        const statusLabels = {
        going: '参加',
        maybe: '未定',
        notGoing: '不参加'
        };
        
        return (
        <Card style={styles.participantCard} key={participant.id}>
            <Card.Content style={styles.participantCardContent}>
            <Avatar.Text
                size={30}
                label={(participant.name || '?').substring(0, 1)}
                color="white"
                style={{ backgroundColor: statusColors[participant.status] }}
            />
            <Text style={styles.participantName}>{participant.name || participant.userId}</Text>
            <Chip
                style={[styles.statusChip, { backgroundColor: statusColors[participant.status] + '20' }]}
                textStyle={{ color: statusColors[participant.status] }}
            >
                {statusLabels[participant.status]}
            </Chip>
            </Card.Content>
        </Card>
        );
    };
    
    if (loading) {
        return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
        );
    }
    
    if (!event) {
        return (
        <View style={styles.loadingContainer}>
            <Text>イベントが見つかりません</Text>
        </View>
        );
    }
    
    return (
        <View style={styles.container}>
        <ScrollView>
            <View style={styles.header}>
            <Text style={styles.title}>{event.title}</Text>
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
                <MaterialCommunityIcons name="clock-outline" size={20} color="#666" style={styles.infoIcon} />
                <Text style={styles.infoText}>{formatEventDateTime()}</Text>
                </View>
                
                <View style={styles.infoRow}>
                <MaterialCommunityIcons name="map-marker" size={20} color="#666" style={styles.infoIcon} />
                <Text style={styles.infoText}>{event.location}</Text>
                </View>
                
                {event.maxParticipants && (
                <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="account-multiple" size={20} color="#666" style={styles.infoIcon} />
                    <Text style={styles.infoText}>定員: {event.maxParticipants}人</Text>
                </View>
                )}
                
                {event.cost && (
                <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="cash" size={20} color="#666" style={styles.infoIcon} />
                    <Text style={styles.infoText}>参加費: ¥{event.cost.toLocaleString()}</Text>
                </View>
                )}
            </Card.Content>
            </Card>
            
            {event.description && (
            <Card style={styles.descriptionCard}>
                <Card.Content>
                <Text style={styles.descriptionTitle}>イベント詳細</Text>
                <Text style={styles.descriptionText}>{event.description}</Text>
                </Card.Content>
            </Card>
            )}
            
            <Card style={styles.participantsCard}>
            <Card.Content>
                <TouchableOpacity
                style={styles.participantsHeader}
                onPress={() => setParticipantsExpanded(!participantsExpanded)}
                >
                <Text style={styles.participantsTitle}>参加者</Text>
                <Text style={styles.participantsSummary}>{getParticipantsSummary()}</Text>
                <MaterialCommunityIcons
                    name={participantsExpanded ? "chevron-up" : "chevron-down"}
                    size={24}
                    color="#666"
                />
                </TouchableOpacity>
                
                {participantsExpanded && (
                <View style={styles.participantsList}>
                    {participants.length > 0 ? (
                    participants.map(renderParticipantItem)
                    ) : (
                    <Text style={styles.noParticipantsText}>まだ参加者がいません</Text>
                    )}
                </View>
                )}
            </Card.Content>
            </Card>
            
            <View style={styles.actionButtonsContainer}>
            <Button
                mode="contained"
                onPress={() => handleUpdateStatus('going')}
                style={[styles.actionButton, myStatus === 'going' && styles.selectedButton]}
                labelStyle={myStatus === 'going' ? styles.selectedButtonLabel : {}}
                icon="check"
            >
                参加する
            </Button>
            
            <Button
                mode="contained"
                onPress={() => handleUpdateStatus('maybe')}
                style={[styles.actionButton, styles.maybeButton, myStatus === 'maybe' && styles.selectedMaybeButton]}
                labelStyle={myStatus === 'maybe' ? styles.selectedButtonLabel : {}}
                icon="help"
            >
                未定
            </Button>
            
            <Button
                mode="contained"
                onPress={() => handleUpdateStatus('notGoing')}
                style={[styles.actionButton, styles.notGoingButton, myStatus === 'notGoing' && styles.selectedNotGoingButton]}
                labelStyle={myStatus === 'notGoing' ? styles.selectedButtonLabel : {}}
                icon="close"
            >
                不参加
            </Button>
            </View>
        </ScrollView>
        
        {isCreator && (
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
            <Menu.Item onPress={handleEditEvent} title="イベントを編集" />
            <Menu.Item onPress={handleDeleteEvent} title="イベントを削除" />
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
    participantsCard: {
        margin: 16,
        marginTop: 0,
        marginBottom: 24,
    },
    participantsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    participantsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    participantsSummary: {
        fontSize: 12,
        color: '#666',
        flex: 1,
        marginLeft: 8,
    },
    participantsList: {
        marginTop: 16,
    },
    participantCard: {
        marginBottom: 8,
    },
    participantCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    participantName: {
        flex: 1,
        marginLeft: 12,
        fontSize: 14,
        fontWeight: '500',
    },
    statusChip: {
        height: 24,
    },
    noParticipantsText: {
        textAlign: 'center',
        color: '#666',
        fontStyle: 'italic',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        padding: 16,
    },
    actionButton: {
        flex: 1,
        marginHorizontal: 4,
        backgroundColor: theme.colors.primary,
    },
    selectedButton: {
        backgroundColor: theme.colors.primary,
        borderWidth: 2,
        borderColor: '#fff',
    },
    maybeButton: {
        backgroundColor: theme.colors.warning,
    },
    selectedMaybeButton: {
        backgroundColor: theme.colors.warning,
        borderWidth: 2,
        borderColor: '#fff',
    },
    notGoingButton: {
        backgroundColor: theme.colors.error,
    },
    selectedNotGoingButton: {
        backgroundColor: theme.colors.error,
        borderWidth: 2,
        borderColor: '#fff',
    },
    selectedButtonLabel: {
        color: '#fff',
        fontWeight: 'bold',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        backgroundColor: theme.colors.primary,
    },
});

export default EventDetailsScreen;

