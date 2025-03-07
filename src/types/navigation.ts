// src/types/navigation.ts
import { Group } from '../services/firebase/groupService';

export type GroupStackParamList = {
    Groups: undefined;
    GroupDetails: { groupId: string };
    CreateGroup: undefined;
    EditGroup: { groupId: string; group: Group | null };
    AddMember: { groupId: string };
};
