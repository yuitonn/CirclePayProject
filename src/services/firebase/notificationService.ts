// src/services/firebase/notificationService.ts
import { db, auth } from '../../config/firebase';
import { 
    collection, doc, getDoc, setDoc, updateDoc, deleteDoc,
    query, where, getDocs, serverTimestamp, Timestamp, addDoc, orderBy, limit,
    writeBatch
} from 'firebase/firestore';
import { eventService } from './eventService';
import { paymentService } from './paymentService';

export interface Notification {
    id: string;
    userId: string;
    type: 'payment' | 'event' | 'system';
    title: string;
    message: string;
    relatedId?: string; // paymentId or eventId
    isRead: boolean;
    createdAt: Timestamp;
}

export const notificationService = {
    // ユーザーの通知取得
    async getUserNotifications(limitCount: number = 20): Promise<Notification[]> {
        try {
        if (!auth.currentUser) throw new Error('User not authenticated');
        
        const userId = auth.currentUser.uid;
        const notificationsQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );
        
        const notificationSnapshot = await getDocs(notificationsQuery);
        
        return notificationSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Notification[];
        } catch (error) {
        console.error('Error getting user notifications:', error);
        throw error;
        }
    },

    // 通知の作成
    async createNotification(notificationData: Omit<Notification, 'id' | 'createdAt'>): Promise<string> {
        try {
        const timestamp = serverTimestamp();
        const newNotification = {
            ...notificationData,
            createdAt: timestamp
        };
        
        const notificationRef = await addDoc(collection(db, 'notifications'), newNotification);
        return notificationRef.id;
        } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
        }
    },

    // 通知を既読に
    async markAsRead(notificationId: string): Promise<void> {
        try {
        const notificationRef = doc(db, 'notifications', notificationId);
        await updateDoc(notificationRef, {
            isRead: true
        });
        } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
        }
    },

    // すべての通知を既読に
    async markAllAsRead(): Promise<void> {
        try {
        if (!auth.currentUser) throw new Error('User not authenticated');
        
        const userId = auth.currentUser.uid;
        const notificationsQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            where('isRead', '==', false)
        );
        
        const notificationSnapshot = await getDocs(notificationsQuery);
        
        const batch = writeBatch(db);
        notificationSnapshot.docs.forEach(docSnapshot => {
            batch.update(docSnapshot.ref, { isRead: true });
        });
        
        await batch.commit();
        } catch (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
        }
    },

    // 通知の削除
    async deleteNotification(notificationId: string): Promise<void> {
        try {
        await deleteDoc(doc(db, 'notifications', notificationId));
        } catch (error) {
        console.error('Error deleting notification:', error);
        throw error;
        }
    },

    // ユーザーの未読通知数を取得
    async getUnreadCount(): Promise<number> {
        try {
        if (!auth.currentUser) return 0;
        
        const userId = auth.currentUser.uid;
        const notificationsQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            where('isRead', '==', false)
        );
        
        const notificationSnapshot = await getDocs(notificationsQuery);
        return notificationSnapshot.size;
        } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
        }
    },

    // 支払い期限通知の自動チェック
    async checkPaymentDueNotifications(): Promise<void> {
        try {
        if (!auth.currentUser) return;
        
        const userId = auth.currentUser.uid;
        const userData = await getDoc(doc(db, 'users', userId));
        
        if (!userData.exists()) return;
        
        const userGroups = userData.data().groups || [];
        
        // 支払い取得
        const userPayments = await paymentService.getUserPayments(userGroups);
        
        // 期限が近い支払いをフィルタリング（3日以内）
        const now = new Date();
        const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        
        const duePayments = userPayments.filter(payment => {
            if (payment.status !== 'active') return false;
            
            const dueDate = payment.dueDate.toDate();
            return dueDate > now && dueDate <= threeDaysLater;
        });
        
        // 通知が未作成の支払いに通知を作成
        for (const payment of duePayments) {
            // 既に通知があるか確認
            const existingNotificationQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            where('type', '==', 'payment'),
            where('relatedId', '==', payment.id)
            );
            
            const existingNotification = await getDocs(existingNotificationQuery);
            
            if (existingNotification.empty) {
            // 通知を作成
            const daysLeft = Math.ceil((payment.dueDate.toDate().getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            
            await this.createNotification({
                userId,
                type: 'payment',
                title: '支払い期限が近づいています',
                message: `「${payment.title}」の支払い期限まであと${daysLeft}日です。`,
                relatedId: payment.id,
                isRead: false
            });
            }
        }
        } catch (error) {
        console.error('Error checking payment due notifications:', error);
        }
    },

    // 近日イベント通知の自動チェック
    async checkUpcomingEventNotifications(): Promise<void> {
        try {
        if (!auth.currentUser) return;
        
        const userId = auth.currentUser.uid;
        const userData = await getDoc(doc(db, 'users', userId));
        
        if (!userData.exists()) return;
        
        const userGroups = userData.data().groups || [];
        
        // 近日イベント取得（3日以内）
        const upcomingEvents = await eventService.getUpcomingEvents(userGroups);
        
        const now = new Date();
        const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        
        const nearEvents = upcomingEvents.filter(event => {
            const startDate = event.startDate.toDate();
            return startDate > now && startDate <= threeDaysLater;
        });
        
        // 通知が未作成のイベントに通知を作成
        for (const event of nearEvents) {
            // 既に通知があるか確認
            const existingNotificationQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            where('type', '==', 'event'),
            where('relatedId', '==', event.id)
            );
            
            const existingNotification = await getDocs(existingNotificationQuery);
            
            if (existingNotification.empty) {
            // 通知を作成
            const daysLeft = Math.ceil((event.startDate.toDate().getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            
            await this.createNotification({
                userId,
                type: 'event',
                title: '近日開催のイベント',
                message: `「${event.title}」はあと${daysLeft}日後に開催されます。`,
                relatedId: event.id,
                isRead: false
            });
            }
        }
        } catch (error) {
        console.error('Error checking upcoming event notifications:', error);
        }
    }
};
