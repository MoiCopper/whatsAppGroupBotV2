/**
 * Extrai o argumento de limite numérico do corpo da mensagem
 * @param messageBody - Corpo da mensagem do comando
 * @returns O número limite extraído ou null se não encontrado
 */
export function extractLimitArgument(messageBody: string): number | null {
    const parts = messageBody.split(' ').filter(part => part.trim() !== '');
    
    // Procura por um número após o comando
    // Exemplo: "/deleteMessages 100" ou "/deleteMessages @user 100"
    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        // Verifica se é um número válido
        const number = parseInt(part, 10);
        if (!isNaN(number) && number > 0) {
            return number;
        }
    }
    
    return null;
}

