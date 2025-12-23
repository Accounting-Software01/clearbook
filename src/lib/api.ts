const API_BASE_URL = 'https://hariindustries.net/api/clearbook';
                    

/**
 * A centralized API fetch function.
 * All frontend requests to the backend API should use this function.
 * It automatically includes credentials, sets the correct headers, 
 * and handles JSON parsing and error formatting.
 *
 * @param endpoint The API endpoint to call (e.g., '/login.php').
 * @param options The standard `fetch` options object.
 * @returns The parsed JSON response from the API.
 * @throws An error with a user-friendly message if the request fails.
 */
export async function api<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}/${endpoint}`;

    const defaultOptions: RequestInit = {
        // CRITICAL: Always include credentials (cookies) with every request.
        credentials: 'include',
        headers: {
            // Assume JSON content type unless specified otherwise.
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };

    // Merge default options with any provided options.
    const finalOptions = { ...defaultOptions, ...options };

    try {
        const response = await fetch(url, finalOptions);

        // Try to parse the body for both successful and failed responses.
        const data = await response.json();

        if (!response.ok) {
            // Use the error message from the backend, or a default one.
            throw new Error(data.message || data.error || `HTTP Error: ${response.status}`);
        }

        return data;

    } catch (error: any) {
        // Re-throw the error to be caught by the calling function's try/catch block.
        // This allows components to handle specific errors if needed.
        throw new Error(error.message || 'An unexpected network error occurred.');
    }
}
