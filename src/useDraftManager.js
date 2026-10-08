import { useEffect, useRef, useCallback } from 'react';
import { api } from './api.js';

const AUTOSAVE_DELAY = 1000; // 1 second debounce

/**
 * Hook for managing message drafts with auto-save functionality
 * @param {string} conversationId - The current conversation ID
 * @param {string} draft - The current draft text
 * @param {function} setDraft - Function to update draft state
 * @param {object} replyTo - The message being replied to (if any)
 * @param {function} setReplyTo - Function to update replyTo state
 * @param {string} source - The source language
 * @param {function} setSource - Function to update source state
 * @param {function} onError - Error handler function
 */
export function useDraftManager(conversationId, draft, setDraft, replyTo, setReplyTo, source, setSource, onError) {
  const autosaveTimer = useRef(null);
  const lastSavedDraft = useRef('');
  const isRestoring = useRef(false);

  // Load draft when conversation changes
  useEffect(() => {
    if (!conversationId) return;
    
    isRestoring.current = true;
    let cancelled = false;

    api(`/conversations/${conversationId}/draft`)
      .then((savedDraft) => {
        if (cancelled || !savedDraft) return;
        
        // Only restore if there's actually content
        if (savedDraft.text && savedDraft.text.trim()) {
          setDraft(savedDraft.text);
          lastSavedDraft.current = savedDraft.text;
          
          if (savedDraft.source_language) {
            setSource(savedDraft.source_language);
          }
          
          // Note: reply_to_id restoration would require fetching the message
          // For now, we skip restoring reply context to avoid complexity
        }
      })
      .catch((error) => {
        // Silently handle draft load errors - drafts are non-critical
        console.warn('Failed to load draft:', error.message);
      })
      .finally(() => {
        isRestoring.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId, setDraft, setSource]);

  // Auto-save draft with debouncing
  const saveDraft = useCallback(
    async (text, replyId, sourceLang) => {
      if (!conversationId || isRestoring.current) return;
      
      // Don't save if nothing has changed
      if (text === lastSavedDraft.current) return;

      try {
        await api(`/conversations/${conversationId}/draft`, {
          method: 'PUT',
          body: {
            text: text || '',
            reply_to_id: replyId || null,
            source_language: sourceLang || 'auto',
          },
        });
        lastSavedDraft.current = text;
      } catch (error) {
        // Silently handle save errors - drafts are non-critical
        console.warn('Failed to save draft:', error.message);
      }
    },
    [conversationId]
  );

  // Debounced auto-save effect
  useEffect(() => {
    if (!conversationId || isRestoring.current) return;

    // Clear existing timer
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }

    // Set new timer
    autosaveTimer.current = setTimeout(() => {
      void saveDraft(draft, replyTo?.id, source);
    }, AUTOSAVE_DELAY);

    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, [draft, replyTo, source, conversationId, saveDraft]);

  // Clear draft after successful send
  const clearDraft = useCallback(async () => {
    if (!conversationId) return;
    
    lastSavedDraft.current = '';
    
    try {
      await api(`/conversations/${conversationId}/draft`, {
        method: 'DELETE',
      });
    } catch (error) {
      // Silently handle clear errors
      console.warn('Failed to clear draft:', error.message);
    }
  }, [conversationId]);

  return { clearDraft };
}
