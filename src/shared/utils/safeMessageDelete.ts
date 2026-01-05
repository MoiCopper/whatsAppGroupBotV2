import { Message } from "whatsapp-web.js";

/**
 * Deleta uma mensagem de forma segura e robusta
 * Verifica se a mensagem existe, trata erros e aguarda confirmação
 * 
 * @param message - Mensagem a ser deletada
 * @param everyone - Se true, deleta para todos (revoga)
 * @param maxRetries - Número máximo de tentativas
 * @returns true se deletou com sucesso, false caso contrário
 */
export async function safeDeleteMessage(
    message: Message, 
    everyone: boolean = true,
    maxRetries: number = 3
): Promise<boolean> {
    if (!message.client || !message.client.pupPage) {
        console.error('[safeDeleteMessage] Client ou pupPage não disponível');
        return false;
    }

    const messageId = message.id._serialized;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[safeDeleteMessage] Tentativa ${attempt}/${maxRetries} de deletar mensagem: ${messageId}`);
            
            // Verifica se a mensagem existe antes de tentar deletar
            const messageExists = await message.client.pupPage.evaluate(async (msgId) => {
                try {
                    const msg = window.Store.Msg.get(msgId) || 
                               (await window.Store.Msg.getMessagesById([msgId]))?.messages?.[0];
                    
                    if (!msg) {
                        console.log(`[safeDeleteMessage] Mensagem ${msgId} não encontrada no Store`);
                        return false;
                    }
                    
                    return true;
                } catch (error) {
                    console.error('[safeDeleteMessage] Erro ao verificar mensagem:', error);
                    return false;
                }
            }, messageId);

            if (!messageExists) {
                console.log(`[safeDeleteMessage] Mensagem ${messageId} não existe mais. Considerando como deletada.`);
                return true; // Se não existe, consideramos como sucesso
            }

            // Tenta deletar a mensagem
            const deleteResult = await message.client.pupPage.evaluate(async (msgId, everyone, clearMedia) => {
                try {
                    const msg = window.Store.Msg.get(msgId) || 
                               (await window.Store.Msg.getMessagesById([msgId]))?.messages?.[0];
                    
                    if (!msg) {
                        return { success: false, error: 'Mensagem não encontrada' };
                    }

                    const chat = window.Store.Chat.get(msg.id.remote) || 
                                (await window.Store.Chat.find(msg.id.remote));
                    
                    if (!chat) {
                        return { success: false, error: 'Chat não encontrado' };
                    }

                    const canRevoke = window.Store.MsgActionChecks.canSenderRevokeMsg(msg) || 
                                     window.Store.MsgActionChecks.canAdminRevokeMsg(msg);

                    let result;
                    if (everyone && canRevoke) {
                        result = window.compareWwebVersions(window.Debug.VERSION, '>=', '2.3000.0')
                            ? await window.Store.Cmd.sendRevokeMsgs(chat, { list: [msg], type: 'message' }, { clearMedia: clearMedia })
                            : await window.Store.Cmd.sendRevokeMsgs(chat, [msg], { clearMedia: true, type: msg.id.fromMe ? 'Sender' : 'Admin' });
                    } else {
                        result = window.compareWwebVersions(window.Debug.VERSION, '>=', '2.3000.0')
                            ? await window.Store.Cmd.sendDeleteMsgs(chat, { list: [msg], type: 'message' }, clearMedia)
                            : await window.Store.Cmd.sendDeleteMsgs(chat, [msg], clearMedia);
                    }

                    return { success: true, result };
                } catch (error: any) {
                    return { success: false, error: error?.message || String(error) };
                }
            }, messageId, everyone, true);

            if (!deleteResult.success) {
                console.error(deleteResult.error || 'Falha ao deletar mensagem');
                return false;
            }

            // Aguarda um tempo para garantir que o WhatsApp processou a deleção
            await new Promise(resolve => setTimeout(resolve, 400));

            // Verifica se a mensagem foi realmente deletada
            const stillExists = await message.client.pupPage.evaluate(async (msgId) => {
                try {
                    const msg = window.Store.Msg.get(msgId) || 
                               (await window.Store.Msg.getMessagesById([msgId]))?.messages?.[0];
                    return !!msg;
                } catch {
                    return false;
                }
            }, messageId);

            if (!stillExists) {
                console.log(`[safeDeleteMessage] ✅ Mensagem ${messageId} deletada com sucesso na tentativa ${attempt}`);
                return true;
            } else {
                console.log(`[safeDeleteMessage] ⚠️ Mensagem ${messageId} ainda existe após deleção. Tentando novamente...`);
                
                if (attempt < maxRetries) {
                    // Aguarda um tempo antes de tentar novamente
                    await new Promise(resolve => setTimeout(resolve, 500 * attempt));
                }
            }
        } catch (error: any) {
            console.error(`[safeDeleteMessage] ❌ Erro na tentativa ${attempt}:`, error);
            
            if (attempt < maxRetries) {
                // Delay exponencial antes de tentar novamente
                const retryDelay = 500 * attempt;
                console.log(`[safeDeleteMessage] ⏳ Aguardando ${retryDelay}ms antes de tentar novamente...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
                console.error(`[safeDeleteMessage] 💀 Falha ao deletar mensagem ${messageId} após ${maxRetries} tentativas`);
                return false;
            }
        }
    }

    return false;
}

