class Api {
    constructor() {
        this.baseUrl = localStorage.getItem('mekwe_api_url') || '';
    }

    setBaseUrl(url) {
        this.baseUrl = url;
        localStorage.setItem('mekwe_api_url', url);
    }

    isConfigured() {
        return this.baseUrl && this.baseUrl.startsWith('http');
    }

    async get(action) {
        if (!this.isConfigured()) throw new Error('API URL not configured');
        try {
            const response = await fetch(`${this.baseUrl}?action=${action}`);
            return await response.json();
        } catch (error) {
            console.error(`API Get Error (${action}):`, error);
            return { error: error.message };
        }
    }

    async post(action, data) {
        if (!this.isConfigured()) throw new Error('API URL not configured');
        // Apps Script Web Apps require 'no-cors' for POSTs usually, or specialized handling.
        // However, standard fetch with text/plain body often works best to avoid complex CORS preflight issues 
        // if the backend uses ContentService.createTextOutput.

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                body: JSON.stringify({ action: action, data: data })
            });
            // Note: with no-cors or opaque responses, we might not get JSON back directly if not handled perfectly.
            // But if we use standard fetch without mode: 'no-cors', it expects CORS headers.
            // Google Apps Script `Code.gs` returns JSON, so we hope for CORS headers (which GAS provides automatically for Web Apps).
            return await response.json();
        } catch (error) {
            console.error(`API Post Error (${action}):`, error);
            // Fallback for simple "fire and forget" if CORS blocks read (though unlikely with GAS current version)
            return { error: error.message };
        }
    }
}

const api = new Api();
