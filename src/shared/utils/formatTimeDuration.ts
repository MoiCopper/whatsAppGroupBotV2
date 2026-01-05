export function formatTimeDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    // Se for dias, mostra dias e horas restantes
    if (days > 0) {
        const remainingHours = hours % 24;
        if (remainingHours > 0) {
            return `${days} ${days === 1 ? 'dia' : 'dias'} e ${remainingHours} ${remainingHours === 1 ? 'hora' : 'horas'}`;
        }
        return `${days} ${days === 1 ? 'dia' : 'dias'}`;
    } 
    // Se for horas (mas não dias), mostra horas e minutos restantes
    else if (hours > 0) {
        const remainingMinutes = minutes % 60;
        if (remainingMinutes > 0) {
            return `${hours} ${hours === 1 ? 'hora' : 'horas'} e ${remainingMinutes} ${remainingMinutes === 1 ? 'minuto' : 'minutos'}`;
        }
        return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    } 
    // Se for menos de uma hora, mantém como estava
    else if (minutes > 0) {
        return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    } else {
        return `${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`;
    }
}