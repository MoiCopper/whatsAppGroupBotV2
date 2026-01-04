export function formatTimeDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days} ${days === 1 ? 'dia' : 'dias'}`;
    } else if (hours > 0) {
        return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    } else if (minutes > 0) {
        return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    } else {
        return `${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`;
    }
}