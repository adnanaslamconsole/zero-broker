import { toast } from 'sonner';

export interface PropertyDraft {
  id: string;
  data: unknown;
  lastUpdated: string;
  userId?: string; // Optional: can be tied to a specific user after login
}

const STORAGE_KEY = 'zero_broker_property_draft';

export const offlineStorage = {
  saveDraft: (data: unknown, userId?: string) => {
    try {
      const draft: PropertyDraft = {
        id: crypto.randomUUID(),
        data,
        lastUpdated: new Date().toISOString(),
        userId,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      return true;
    } catch (error) {
      console.error('Error saving draft offline:', error);
      return false;
    }
  },

  getDraft: (): PropertyDraft | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;
      return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading draft:', error);
      return null;
    }
  },

  clearDraft: () => {
    localStorage.removeItem(STORAGE_KEY);
  },

  hasDraft: () => {
    return !!localStorage.getItem(STORAGE_KEY);
  },

  // Sync logic for when a user logs in
  syncDraftWithUser: (userId: string) => {
    const draft = offlineStorage.getDraft();
    if (draft && (!draft.userId || draft.userId !== userId)) {
      // If there's a draft and it's not already tied to this user, update it
      const updatedDraft = { ...draft, userId };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDraft));
      toast.info('Your offline property draft has been linked to your account.', {
        description: 'You can continue posting from where you left off.',
        duration: 5000,
      });
      return updatedDraft;
    }
    return draft;
  }
};
