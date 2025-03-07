// src/services/firebase/groupService.ts
import { db, auth } from '../../config/firebase';
import { 
    collection, doc, getDoc, setDoc, updateDoc, deleteDoc,
    query, where, getDocs, serverTimestamp, arrayUnion, arrayRemove,
    writeBatch
} from 'firebase/firestore';

export interface Group {
    id: string;
    name: string;
    description?: string;
    type: 'circle' | 'club' | 'committee' | 'other';
    createdBy: string;
    adminUsers: string[];
    treasurerUsers?: string[];
    memberCount: number;
    logoUrl?: string;
    createdAt?: any; // Firestore Timestamp
    updatedAt?: any; // Firestore Timestamp
}

export interface GroupMember {
    userId: string;
    role: 'admin' | 'treasurer' | 'member';
    joinedAt?: any; // Firestore Timestamp
    status: 'active' | 'inactive';
    displayName?: string;
    invitedBy?: string;
}

export const groupService = {
    // グループの取得
    async getGroup(groupId: string): Promise<Group | null> {
        try {
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (!groupDoc.exists()) return null;
        return { id: groupDoc.id, ...groupDoc.data() } as Group;
        } catch (error) {
        console.error('Error getting group:', error);
        throw error;
        }
    },

    // ユーザーが所属するグループの取得
    async getUserGroups(userId: string): Promise<Group[]> {
        try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) return [];
        
        const userData = userDoc.data();
        const groupIds = userData.groups || [];
        
        if (groupIds.length === 0) return [];
        
        const groupsData: Group[] = [];
        for (const groupId of groupIds) {
            const groupData = await this.getGroup(groupId);
            if (groupData) groupsData.push(groupData);
        }
        
        return groupsData;
        } catch (error) {
        console.error('Error getting user groups:', error);
        throw error;
        }
    },

    // グループの作成
    async createGroup(groupData: Omit<Group, 'id' | 'createdAt' | 'updatedAt' | 'memberCount'>): Promise<string> {
        try {
        if (!auth.currentUser) throw new Error('User not authenticated');
        
        const currentUserId = auth.currentUser.uid;
        const groupRef = doc(collection(db, 'groups'));
        const groupId = groupRef.id;
        
        const timestamp = serverTimestamp();
        const newGroup: Omit<Group, 'id'> = {
            ...groupData,
            memberCount: 1, // 作成者自身
            createdBy: currentUserId,
            adminUsers: [currentUserId, ...(groupData.adminUsers || [])],
            createdAt: timestamp,
            updatedAt: timestamp
        };
        
        // トランザクションを使用して、グループの作成とメンバー追加を同時に行う
        const batch = writeBatch(db);
        
        // グループドキュメントを作成
        batch.set(groupRef, newGroup);
        
        // メンバーサブコレクションに作成者を追加
        const memberRef = doc(db, 'groups', groupId, 'members', currentUserId);
        const memberData: GroupMember = {
            userId: currentUserId,
            role: 'admin',
            joinedAt: timestamp,
            status: 'active'
        };
        batch.set(memberRef, memberData);
        
        // ユーザードキュメントのgroupsフィールドを更新
        const userRef = doc(db, 'users', currentUserId);
        batch.update(userRef, {
            groups: arrayUnion(groupId)
        });
        
        await batch.commit();
        return groupId;
        } catch (error) {
        console.error('Error creating group:', error);
        throw error;
        }
    },

    // グループの更新
    async updateGroup(groupId: string, groupData: Partial<Group>): Promise<void> {
        try {
        const groupRef = doc(db, 'groups', groupId);
        const updatedData = {
            ...groupData,
            updatedAt: serverTimestamp()
        };
        await updateDoc(groupRef, updatedData);
        } catch (error) {
        console.error('Error updating group:', error);
        throw error;
        }
    },

    // グループメンバーの取得
    async getGroupMembers(groupId: string): Promise<(GroupMember & { id: string })[]> {
        try {
        const membersCollection = collection(db, 'groups', groupId, 'members');
        const membersSnapshot = await getDocs(membersCollection);
        
        return membersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as (GroupMember & { id: string })[];
        } catch (error) {
        console.error('Error getting group members:', error);
        throw error;
        }
    },

    // メンバーの追加
    async addMember(groupId: string, memberData: GroupMember): Promise<void> {
        try {
        if (!auth.currentUser) throw new Error('User not authenticated');
        
        const batch = writeBatch(db);
        
        // メンバーをグループに追加
        const memberRef = doc(db, 'groups', groupId, 'members', memberData.userId);
        const timestamp = serverTimestamp();
        batch.set(memberRef, {
            ...memberData,
            joinedAt: timestamp,
            invitedBy: auth.currentUser.uid
        });
        
        // グループのメンバー数を更新
        const groupRef = doc(db, 'groups', groupId);
        batch.update(groupRef, {
            memberCount: increment(1),
            updatedAt: timestamp
        });
        
        // ユーザーのgroupsフィールドを更新
        const userRef = doc(db, 'users', memberData.userId);
        batch.update(userRef, {
            groups: arrayUnion(groupId)
        });
        
        await batch.commit();
        } catch (error) {
        console.error('Error adding member:', error);
        throw error;
        }
    },

    // メンバーの更新
    async updateMember(groupId: string, userId: string, memberData: Partial<GroupMember>): Promise<void> {
        try {
        const memberRef = doc(db, 'groups', groupId, 'members', userId);
        await updateDoc(memberRef, memberData);
        } catch (error) {
        console.error('Error updating member:', error);
        throw error;
        }
    },

    // メンバーの削除（グループ脱退）
    async removeMember(groupId: string, userId: string): Promise<void> {
        try {
        const batch = writeBatch(db);
        
        // メンバーをグループから削除
        const memberRef = doc(db, 'groups', groupId, 'members', userId);
        batch.delete(memberRef);
        
        // グループのメンバー数を更新
        const groupRef = doc(db, 'groups', groupId);
        batch.update(groupRef, {
            memberCount: increment(-1),
            updatedAt: serverTimestamp(),
            adminUsers: arrayRemove(userId),
            treasurerUsers: arrayRemove(userId)
        });
        
        // ユーザーのgroupsフィールドを更新
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, {
            groups: arrayRemove(groupId)
        });
        
        await batch.commit();
        } catch (error) {
        console.error('Error removing member:', error);
        throw error;
        }
    }
};

// ヘルパー関数
function increment(amount: number) {
    return {
        // Firestoreのインクリメント関数をインポートして使用
        __type__: 'increment',
        amount
    };
}
