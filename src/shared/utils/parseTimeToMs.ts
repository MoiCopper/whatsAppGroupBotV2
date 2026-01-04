export function parseTimeToMs(timeStr: string): number {
    // Default to 10 minutes if no time is provided
    if (!timeStr || timeStr.trim() === '') {
        return 10 * 60 * 1000; // 10 minutes in milliseconds
    }

    const trimmed = timeStr.trim().toLowerCase();
    const match = trimmed.match(/^(\d+)([smhd])$/);
    
    if (!match) {
        // If format is invalid, default to 10 minutes
        return 10 * 60 * 1000;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
        case 's':
            return value * 1000; // seconds
        case 'm':
            return value * 60 * 1000; // minutes
        case 'h':
            return value * 60 * 60 * 1000; // hours
        case 'd':
            return value * 24 * 60 * 60 * 1000; // days
        default:
            return 10 * 60 * 1000; // default to 10 minutes
    }
}