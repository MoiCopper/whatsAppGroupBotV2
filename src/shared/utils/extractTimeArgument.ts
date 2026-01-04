export function extractTimeArgument(messageBody: string): string {
    const parts = messageBody.split(' ').filter(part => part.trim() !== '');
    
    // Find the time argument (should be after the command and mention)
    // It should match pattern like "10m", "5h", "30s"
    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        // Check if it matches time format (number + unit)
        if (/^\d+[smhd]$/i.test(part)) {
            return part;
        }
    }
    
    return '';
}