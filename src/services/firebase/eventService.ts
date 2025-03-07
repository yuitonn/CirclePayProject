// src/services/firebase/eventService.ts
import { db, auth } from '../../config/firebase';
import { 
    collection, doc, getDoc, setDoc, updateDoc, deleteDoc,
    query, where, getDocs, serverTimestamp, arrayUnion, arrayRemove,
    writeBatch, Timestamp, addDoc
} from 'firebase/firestore';

export interface Event {
    id: string;
    title: string;
    description?: string;
    startDate: Timestamp;
    endDate: Timestamp;
    location: string;
    createdBy: string;
    groupId: string;
    maxParticipants?: number;
    cost?: number;
    paymentId?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface EventParticipant {
    userId: string;
    status: 'going' | 'maybe' | 'notGoing';
    joinedAt?: Timestamp;
    comment?: string;
}

export const eventService = {
    // イベントの取得
    async getEvent(eventId: string): Promise<Event | null> {
        try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (!eventDoc.exists()) return null;
        return { id: eventDoc.id, ...eventDoc.data() } as Event;
        } catch (error) {
        console.error('Error getting event:', error);
        throw error;
        }
    },

    // グループのイベント一覧を取得
    async getGroupEvents(groupId: string): Promise<Event[]> {
        try {
        const eventsQuery = query(
            collection(db, 'events'),
            where('groupId', '==', groupId)
        );
        
        const eventSnapshot = await getDocs(eventsQuery);
        return eventSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Event[];
        } catch (error) {
        console.error('Error getting group events:', error);
        throw error;
        }
    },

    // 近日開催のイベント取得
    async getUpcomingEvents(groupIds: string[]): Promise<Event[]> {
        try {
        if (groupIds.length === 0) return [];
        
        const now = Timestamp.now();
        const eventsQuery = query(
            collection(db, 'events'),
            where('groupId', 'in', groupIds),
            where('startDate', '>=', now)
        );
        
        const eventSnapshot = await getDocs(eventsQuery);
        const events = eventSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Event[];
        
        // 日付順に並び替え
        return events.sort((a, b) => a.startDate.seconds - b.startDate.seconds);
        } catch (error) {
        console.error('Error getting upcoming events:', error);
        throw error;
        }
    },

    // イベント作成
    async createEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        try {
        if (!auth.currentUser) throw new Error('User not authenticated');
        
        const timestamp = serverTimestamp();
        const newEvent = {
            ...eventData,
            createdAt: timestamp,
            updatedAt: timestamp
        };
        
        const eventRef = await addDoc(collection(db, 'events'), newEvent);
        return eventRef.id;
        } catch (error) {
        console.error('Error creating event:', error);
        throw error;
        }
    },

    // イベント更新
    async updateEvent(eventId: string, eventData: Partial<Event>): Promise<void> {
        try {
        const eventRef = doc(db, 'events', eventId);
        const updatedData = {
            ...eventData,
            updatedAt: serverTimestamp()
        };
        await updateDoc(eventRef, updatedData);
        } catch (error) {
        console.error('Error updating event:', error);
        throw error;
        }
    },

    // イベント削除
    async deleteEvent(eventId: string): Promise<void> {
        try {
        await deleteDoc(doc(db, 'events', eventId));
        } catch (error) {
        console.error('Error deleting event:', error);
        throw error;
        }
    },

    // イベント参加者取得
    async getEventParticipants(eventId: string): Promise<(EventParticipant & { id: string })[]> {
        try {
        const participantsCollection = collection(db, 'events', eventId, 'participants');
        const participantsSnapshot = await getDocs(participantsCollection);
        
        return participantsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as (EventParticipant & { id: string })[];
        } catch (error) {
        console.error('Error getting event participants:', error);
        throw error;
        }
    },

    // 参加者追加
    async addParticipant(eventId: string, participantData: EventParticipant): Promise<void> {
        try {
        const participantRef = doc(db, 'events', eventId, 'participants', participantData.userId);
        const timestamp = serverTimestamp();
        await setDoc(participantRef, {
            ...participantData,
            joinedAt: timestamp
        });
        } catch (error) {
        console.error('Error adding participant:', error);
        throw error;
        }
    },

    // 参加者更新
    async updateParticipant(eventId: string, userId: string, participantData: Partial<EventParticipant>): Promise<void> {
        try {
        const participantRef = doc(db, 'events', eventId, 'participants', userId);
        await updateDoc(participantRef, participantData);
        } catch (error) {
        console.error('Error updating participant:', error);
        throw error;
        }
    },

    // 参加者削除
    async removeParticipant(eventId: string, userId: string): Promise<void> {
        try {
        const participantRef = doc(db, 'events', eventId, 'participants', userId);
        await deleteDoc(participantRef);
        } catch (error) {
        console.error('Error removing participant:', error);
        throw error;
        }
    }
};
