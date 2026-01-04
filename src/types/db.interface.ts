export interface Group {
    id: string;
    name: string;
    description: string;
    members: { [key: string]: Member };
}

export interface Member {
    id: string;
    name: string;
    isAdmin: boolean;
    punishments: {
        timeout: number;
        mute: number;
        ban: number;
        kick: number;
        warn: number;
        note: string;
    };
    currentPunishment?: CurrentPunishment;
    menssagesIds: string[];
    numberOfMessages: number;
}

export interface CurrentPunishment {
    type: 'timeout' | 'mute' | 'ban' | 'kick' | 'warn';
    duration: number;
    reason: string;
    appliedAt: Date;
    expiresAt: Date | null;
}

export interface CreateAPunishmentParams {
    groupId: string;
    memberId: string;
    type: 'timeout' | 'mute' | 'ban' | 'kick' | 'warn';
    duration: number;
    reason: string;
    expiresAt: Date;
}

export interface DB {
    groups: { [key: string]: Group };
}
