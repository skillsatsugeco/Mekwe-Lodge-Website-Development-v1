const admin = {
    init: function () {
        if (this.isLoggedIn()) {
            // If already logged in, maybe show dashboard?
            // checking if we are on login page?
        }
    },

    isLoggedIn: function () {
        return !!sessionStorage.getItem('mekwe_admin_token');
    },

    async handleLogin(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        const result = await api.post('login', data);
        if (result && result.status === 'success') {
            sessionStorage.setItem('mekwe_admin_token', result.token);
            e.target.reset();
            app.showPage('admin-dashboard');
            this.showTab('bookings'); // Default to bookings
        } else {
            console.error('Login Failed:', result);
            alert('Login Failed: ' + (result.message || 'Unknown Error'));
        }
    },

    logout() {
        sessionStorage.removeItem('mekwe_admin_token');
        app.showPage('home');
    },

    showTab(tabId) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

        // Show selected
        const content = document.getElementById(`admin-${tabId}`);
        if (content) content.classList.remove('hidden');

        // Highlight button using event target if available (simplistic approach)
        if (event && event.target && event.target.classList.contains('tab-btn')) {
            event.target.classList.add('active');
        } else {
            // Fallback: try to find button by text or index? 
            // For now, let's just highlight based on simple query if not triggered by event
            const btn = document.querySelector(`button[onclick="admin.showTab('${tabId}')"]`);
            if (btn) btn.classList.add('active');
        }

        if (tabId === 'bookings') this.loadBookings();
        if (tabId === 'settings') this.loadSettings();
    },

    async loadSettings() {
        const data = await api.get('getSettings');
        if (data && !data.error) {
            const form = document.querySelector('#admin-settings form');
            if (form && data.hero_image) {
                const input = form.querySelector('[name="hero_image"]');
                if (input) input.value = data.hero_image;
            }
        }
    },

    async saveSettings(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        const result = await api.post('saveSettings', data);
        if (result && result.status === 'success') {
            alert('Settings Saved! Refresh the home page to see changes.');
        } else {
            console.error('Save Settings Failed:', result);
            alert('Error saving settings: ' + (result.message || result.error || 'Unknown Error'));
        }
    },

    async loadBookings() {
        const list = document.getElementById('bookings-list');
        list.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';

        const data = await api.get('getBookings');

        if (Array.isArray(data)) {
            list.innerHTML = data.map(b => `
                <tr>
                    <td>${new Date(b.Timestamp).toLocaleDateString()}</td>
                    <td>${b.CustomerName}<br><small>${b.Phone}</small></td>
                    <td>${b.RoomType}<br><small>${new Date(b.CheckIn).toLocaleDateString()} - ${new Date(b.CheckOut).toLocaleDateString()}</small></td>
                    <td><strong>${b.TransactionID}</strong></td>
                    <td><span class="status-badge ${b.Status === 'Confirmed' ? 'status-confirmed' : 'status-pending'}">${b.Status}</span></td>
                    <td>
                        ${b.Status !== 'Confirmed' ?
                    `<button class="btn-primary" onclick="admin.confirmBooking(${b.rowIndex})">Confirm</button>` :
                    '<i class="fas fa-check"></i>'}
                    </td>
                </tr>
            `).join('');
        } else {
            list.innerHTML = '<tr><td colspan="6">Error loading bookings</td></tr>';
        }
    },

    async confirmBooking(rowIndex) {
        if (!confirm('Confirm this transaction?')) return;

        const result = await api.post('updateBookingStatus', {
            rowIndex: rowIndex,
            status: 'Confirmed'
        });

        if (result && result.status === 'success') {
            alert('Booking Confirmed');
            this.loadBookings();
        } else {
            alert('Error: ' + (result.message || 'Update failed'));
        }
    }
};
