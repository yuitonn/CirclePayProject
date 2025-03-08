// src/services/firebase/paymentService.ts
import { db, auth } from '../../config/firebase';
import { 
    collection, doc, getDoc, setDoc, updateDoc, deleteDoc,
    query, where, getDocs, serverTimestamp, arrayUnion, arrayRemove,
    writeBatch, Timestamp, addDoc, increment
} from 'firebase/firestore';

export interface Payment {
    id: string;
    title: string;
    description?: string;
    amount: number;
    perPersonAmount: number;
    dueDate: Timestamp;
    createdBy: string;
    eventId?: string;
    groupId: string;
    status: 'active' | 'completed' | 'canceled';
    collectedAmount: number;
    paymentMethods: string[];
    bankInfo?: {
        bankName: string;
        branchName: string;
        accountType: string;
        accountNumber: string;
        accountHolder: string;
    };
    paypayId?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface Transaction {
    userId: string;
    amount: number;
    method: 'paypay' | 'bank' | 'cash';
    status: 'pending' | 'paid' | 'confirmed';
    paidAt?: Timestamp;
    confirmedAt?: Timestamp;
    confirmedBy?: string;
    comment?: string;
    }

    export const paymentService = {
    // 支払いの取得
    async getPayment(paymentId: string): Promise<Payment | null> {
        try {
        const paymentDoc = await getDoc(doc(db, 'payments', paymentId));
        if (!paymentDoc.exists()) return null;
        return { id: paymentDoc.id, ...paymentDoc.data() } as Payment;
        } catch (error) {
        console.error('Error getting payment:', error);
        throw error;
        }
    },

    // グループの支払い一覧を取得
    async getGroupPayments(groupId: string): Promise<Payment[]> {
        try {
        const paymentsQuery = query(
            collection(db, 'payments'),
            where('groupId', '==', groupId)
        );
        
        const paymentSnapshot = await getDocs(paymentsQuery);
        
        return paymentSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Payment[];
        } catch (error) {
        console.error('Error getting group payments:', error);
        throw error;
        }
    },

    // ユーザーに関連する支払い一覧を取得（支払う側）
    async getUserPayments(groupIds: string[]): Promise<Payment[]> {
        try {
        if (groupIds.length === 0) return [];
        
        if (!auth.currentUser) throw new Error('User not authenticated');
        const userId = auth.currentUser.uid;
        
        const allPayments: Payment[] = [];
        
        // グループごとに支払いを取得
        for (const groupId of groupIds) {
            const paymentsQuery = query(
            collection(db, 'payments'),
            where('groupId', '==', groupId)
            );
            
            const paymentSnapshot = await getDocs(paymentsQuery);
            
            const payments = paymentSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
            })) as Payment[];
            
            // 各支払いについて、自分のトランザクションを確認
            for (const payment of payments) {
            try {
                const transactionsQuery = query(
                collection(db, 'payments', payment.id, 'transactions'),
                where('userId', '==', userId)
                );
                
                const transactionSnapshot = await getDocs(transactionsQuery);
                
                // トランザクションがない場合は支払いリストに追加
                // または、トランザクションがあっても未払い/未確認の場合は追加
                if (transactionSnapshot.empty || 
                    transactionSnapshot.docs.some(doc => 
                    doc.data().status !== 'confirmed')) {
                allPayments.push(payment);
                }
            } catch (error) {
                console.error(`Error checking transactions for payment ${payment.id}:`, error);
            }
            }
        }
        
        return allPayments;
        } catch (error) {
        console.error('Error getting user payments:', error);
        throw error;
        }
    },
    
    // 集金中の支払い一覧を取得（集める側）
    async getCollectingPayments(): Promise<Payment[]> {
        try {
        if (!auth.currentUser) throw new Error('User not authenticated');
        const userId = auth.currentUser.uid;
        
        const paymentsQuery = query(
            collection(db, 'payments'),
            where('createdBy', '==', userId),
            where('status', '==', 'active')
        );
        
        const paymentSnapshot = await getDocs(paymentsQuery);
        
        return paymentSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Payment[];
        } catch (error) {
        console.error('Error getting collecting payments:', error);
        throw error;
        }
    },

    // 支払い作成
    async createPayment(paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'collectedAmount'>): Promise<string> {
        try {
        if (!auth.currentUser) throw new Error('User not authenticated');
        
        const timestamp = serverTimestamp();
        const newPayment = {
            ...paymentData,
            collectedAmount: 0,
            createdAt: timestamp,
            updatedAt: timestamp
        };
        
        const paymentRef = await addDoc(collection(db, 'payments'), newPayment);
        return paymentRef.id;
        } catch (error) {
        console.error('Error creating payment:', error);
        throw error;
        }
    },

    // 支払い更新
    async updatePayment(paymentId: string, paymentData: Partial<Payment>): Promise<void> {
        try {
        const paymentRef = doc(db, 'payments', paymentId);
        const updatedData = {
            ...paymentData,
            updatedAt: serverTimestamp()
        };
        await updateDoc(paymentRef, updatedData);
        } catch (error) {
        console.error('Error updating payment:', error);
        throw error;
        }
    },

    // 支払い削除
    async deletePayment(paymentId: string): Promise<void> {
        try {
        await deleteDoc(doc(db, 'payments', paymentId));
        } catch (error) {
        console.error('Error deleting payment:', error);
        throw error;
        }
    },

    // トランザクション（支払い記録）の取得
    async getTransactions(paymentId: string): Promise<(Transaction & { id: string })[]> {
        try {
        const transactionsCollection = collection(db, 'payments', paymentId, 'transactions');
        const transactionsSnapshot = await getDocs(transactionsCollection);
        
        return transactionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as (Transaction & { id: string })[];
        } catch (error) {
        console.error('Error getting transactions:', error);
        throw error;
        }
    },

    // ユーザーのトランザクション取得
    async getUserTransaction(paymentId: string, userId: string): Promise<(Transaction & { id: string }) | null> {
        try {
        const transactionsQuery = query(
            collection(db, 'payments', paymentId, 'transactions'),
            where('userId', '==', userId)
        );
        
        const transactionSnapshot = await getDocs(transactionsQuery);
        
        if (transactionSnapshot.empty) return null;
        
        const doc = transactionSnapshot.docs[0];
        return {
            id: doc.id,
            ...doc.data()
        } as (Transaction & { id: string });
        } catch (error) {
        console.error('Error getting user transaction:', error);
        throw error;
        }
    },

    // トランザクション作成（支払い記録）
    async createTransaction(paymentId: string, transaction: Omit<Transaction, 'id'>): Promise<string> {
        try {
        const transactionRef = await addDoc(
            collection(db, 'payments', paymentId, 'transactions'),
            transaction
        );
        
        // 支払いのステータスが「paid」以上の場合、collectedAmountを更新
        if (transaction.status === 'paid' || transaction.status === 'confirmed') {
            const paymentRef = doc(db, 'payments', paymentId);
            await updateDoc(paymentRef, {
            collectedAmount: increment(transaction.amount),
            updatedAt: serverTimestamp()
            });
        }
        
        return transactionRef.id;
        } catch (error) {
        console.error('Error creating transaction:', error);
        throw error;
        }
    },

    // トランザクション更新
    async updateTransaction(paymentId: string, transactionId: string, transaction: Partial<Transaction>): Promise<void> {
        try {
        const transactionRef = doc(db, 'payments', paymentId, 'transactions', transactionId);
        const oldTransactionDoc = await getDoc(transactionRef);
        
        if (!oldTransactionDoc.exists()) {
            throw new Error('Transaction not found');
        }
        
        const oldTransaction = oldTransactionDoc.data() as Transaction;
        
        // トランザクションを更新
        await updateDoc(transactionRef, transaction);
        
        // 支払い状態が変更された場合、collectedAmountを更新
        if (transaction.status && transaction.status !== oldTransaction.status) {
            const paymentRef = doc(db, 'payments', paymentId);
            
            // 古い状態が「paid」または「confirmed」で、新しい状態が「pending」の場合、金額を減らす
            if ((oldTransaction.status === 'paid' || oldTransaction.status === 'confirmed') && 
                transaction.status === 'pending') {
            await updateDoc(paymentRef, {
                collectedAmount: increment(-oldTransaction.amount),
                updatedAt: serverTimestamp()
            });
            }
            // 古い状態が「pending」で、新しい状態が「paid」または「confirmed」の場合、金額を増やす
            else if (oldTransaction.status === 'pending' && 
                    (transaction.status === 'paid' || transaction.status === 'confirmed')) {
            await updateDoc(paymentRef, {
                collectedAmount: increment(oldTransaction.amount),
                updatedAt: serverTimestamp()
            });
            }
        }
        } catch (error) {
        console.error('Error updating transaction:', error);
        throw error;
        }
    },
    
    // 支払い完了処理
    async completePayment(paymentId: string): Promise<void> {
        try {
        const paymentRef = doc(db, 'payments', paymentId);
        await updateDoc(paymentRef, {
            status: 'completed',
            updatedAt: serverTimestamp()
        });
        } catch (error) {
        console.error('Error completing payment:', error);
        throw error;
        }
    },
    
    // 支払いキャンセル処理
    async cancelPayment(paymentId: string): Promise<void> {
        try {
        const paymentRef = doc(db, 'payments', paymentId);
        await updateDoc(paymentRef, {
            status: 'canceled',
            updatedAt: serverTimestamp()
        });
        } catch (error) {
        console.error('Error canceling payment:', error);
        throw error;
        }
    }
};
