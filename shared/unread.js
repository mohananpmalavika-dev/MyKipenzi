export const isNearLatest = box => box.scrollHeight - box.scrollTop - box.clientHeight < 120;
export const firstUnreadMessage = (messages, readSeq, userId) => messages.find(m => m.sender_id !== userId && !m.deleted_at && Number(m.seq) > Number(readSeq));
export const unreadMessageCount = (messages, readSeq, userId) => messages.filter(m => m.sender_id !== userId && !m.deleted_at && Number(m.seq) > Number(readSeq)).length;
