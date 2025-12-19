const API_BASE_URL = 'https://hariindustries.net/clearbook';

// Function to create a journal entry
export const createJournalEntry = async (entryData: any) => {
    try {
        const response = await fetch(`${API_BASE_URL}/journal_entry.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(entryData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create journal entry');
        }

        const result = await response.json();
        return result.entryNumber;
    } catch (error) {
        console.error("Error creating journal entry: ", error);
        throw error;
    }
};

// Function to get a list of journal entries
export const getJournalEntries = async (companyId: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/get_journal_entries.php?company_id=${companyId}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch journal entries');
        }

        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.error("Error getting journal entries: ", error);
        throw error;
    }
};

// Function to get entry overview
export const getEntryOverview = async (companyId: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/get_entry_overview.php?company_id=${companyId}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch entry overview');
        }
        const result = await response.json();
        return result || { pending_count: 0, is_locked: false };
    } catch (error) {
        console.error("Error getting entry overview: ", error);
        throw error;
    }
};

// Function to update entry status
export const updateEntryStatus = async (entryId: string, data: { status?: string; isLocked?: boolean }) => {
    try {
        const response = await fetch(`${API_BASE_URL}/entry_actions.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: entryId, ...data }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update entry status');
        }

        return await response.json();
    } catch (error) {
        console.error("Error updating entry status: ", error);
        throw error;
    }
};