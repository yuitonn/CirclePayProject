// src/screens/events/EventsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Card, FAB, Chip, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { eventService, Event } from '../../services/firebase/eventService';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../styles/theme';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

type EventsStackParamList = {
    Events: undefined;
    EventDetails: { eventId: string };
    CreateEvent: undefined;
};

type EventsScreenNavigationProp = StackNavigationProp<EventsStackParamList, 'Events'>;

const EventsScreen = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
    
    const { userData } = useAuth();
    const navigation = useNavigation<EventsScreenNavigationProp>();

    useEffect(() => {
        const fetchEvents = async () => {
        if (userData) {
            setLoading(true);
            try {
            const groupIds = userData.groups || [];
            let allEvents: Event[] = [];
            
            // 各グループのイベントを取得
            for (const groupId of groupIds) {
                const groupEvents = await eventService.getGroupEvents(groupId);
                allEvents = [...allEvents, ...groupEvents];
            }
            
            // 重複を排除
            const uniqueEvents = Array.from(new Map(allEvents.map(event => [event.id, event])).values());
            
            // 日付順にソート
            uniqueEvents.sort((a, b) => a.startDate.seconds - b.startDate.seconds);
            
            setEvents(uniqueEvents);
            filterEvents(uniqueEvents, filter, searchQuery);
            } catch (error) {
            console.error('Error fetching events:', error);
            } finally {
            setLoading(false);
            }
        }
        };

        fetchEvents();
    }, [userData]);

    // イベントのフィルタリング
    const filterEvents = (allEvents: Event[], filterType: string, query: string) => {
        const now = new Date();
        
        let filtered = allEvents;
        
        // フィルタータイプによるフィルタリング
        if (filterType === 'upcoming') {
        filtered = allEvents.filter(event => 
            event.startDate.toDate() >= now
        );
        } else if (filterType === 'past') {
        filtered = allEvents.filter(event => 
            event.startDate.toDate() < now
        );
        }
        
        // 検索クエリによるフィルタリング
        if (query) {
        const lowercaseQuery = query.toLowerCase();
        filtered = filtered.filter(event => 
            event.title.toLowerCase().includes(lowercaseQuery) ||
            (event.description && event.description.toLowerCase().includes(lowercaseQuery)) ||
            event.location.toLowerCase().includes(lowercaseQuery)
        );
        }
        
        setFilteredEvents(filtered);
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        filterEvents(events, filter, query);
    };

    const handleFilter = (newFilter: 'all' | 'upcoming' | 'past') => {
        setFilter(newFilter);
        filterEvents(events, newFilter, searchQuery);
    };

    const handleCreateEvent = () => {
        navigation.navigate('CreateEvent');
    };

    const handleOpenEvent = (eventId: string) => {
        navigation.navigate('EventDetails', { eventId });
    };

    // イベントの日時をフォーマット
    const formatEventDate = (event: Event) => {
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

    const renderEventItem = ({ item }: { item: Event }) => {
        const isPast = item.startDate.toDate() < new Date();
        
        return (
        <Card 
            style={[styles.eventCard, isPast && styles.pastEventCard]} 
            onPress={() => handleOpenEvent(item.id)}
        >
            <View style={styles.eventCardContent}>
            <View style={styles.eventMainInfo}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <Text style={styles.eventDate}>{formatEventDate(item)}</Text>
                <Text style={styles.eventLocation}>
                <MaterialCommunityIcons name="map-marker" size={14} color="#666" />
                {' '}{item.location}
                </Text>
            </View>
            
            {item.cost && (
                <View style={styles.eventCost}>
                <Text style={styles.costAmount}>¥{item.cost.toLocaleString()}</Text>
                </View>
            )}
            </View>
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

    return (
        <View style={styles.container}>
        <View style={styles.searchContainer}>
            <Searchbar
            placeholder="イベントを検索"
            onChangeText={handleSearch}
            value={searchQuery}
            style={styles.searchBar}
            />
        </View>
        
        <View style={styles.filterContainer}>
            <Chip
            selected={filter === 'all'}
            onPress={() => handleFilter('all')}
            style={styles.filterChip}
            selectedColor={theme.colors.primary}
            >
            すべて
            </Chip>
            <Chip
            selected={filter === 'upcoming'}
            onPress={() => handleFilter('upcoming')}
            style={styles.filterChip}
            selectedColor={theme.colors.primary}
            >
            今後
            </Chip>
            <Chip
            selected={filter === 'past'}
            onPress={() => handleFilter('past')}
            style={styles.filterChip}
            selectedColor={theme.colors.primary}
            >
            過去
            </Chip>
        </View>
        
        <FlatList
            data={filteredEvents}
            renderItem={renderEventItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                {searchQuery 
                    ? '検索条件に一致するイベントがありません' 
                    : filter === 'upcoming' 
                    ? '今後のイベントはありません' 
                    : filter === 'past' 
                        ? '過去のイベントはありません' 
                        : 'イベントがありません'}
                </Text>
            </View>
            }
        />
        
        <FAB
            style={styles.fab}
            icon="plus"
            onPress={handleCreateEvent}
            color="white"
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
    searchContainer: {
        padding: 16,
        paddingBottom: 10,
    },
    searchBar: {
        elevation: 2,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    filterChip: {
        marginRight: 8,
    },
    listContainer: {
        padding: 16,
        paddingTop: 0,
    },
    eventCard: {
        marginBottom: 12,
        elevation: 2,
    },
    pastEventCard: {
        opacity: 0.7,
    },
    eventCardContent: {
        padding: 16,
        flexDirection: 'row',
    },
    eventMainInfo: {
        flex: 1,
    },
    eventTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    eventDate: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    eventLocation: {
        fontSize: 13,
        color: '#666',
    },
    eventCost: {
        justifyContent: 'center',
        alignItems: 'flex-end',
        marginLeft: 12,
    },
    costAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.primary,
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

export default EventsScreen;
