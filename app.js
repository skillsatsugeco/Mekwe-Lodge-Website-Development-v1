const app = {
    init: function () {
        this.checkConfig();
        this.setupEventListeners();
        admin.init(); // Initialize admin module checks
    },

    checkConfig: function () {
        if (!api.isConfigured()) {
            console.warn('API URL not configured. App functionality will be limited.');
        } else {
            // Pre-load data if we have config
            this.loadRooms();
            this.loadSettings();
        }
    },

    saveConfig: function () {
        const url = document.getElementById('api-url-input').value.trim();
        if (url) {
            api.setBaseUrl(url);
            document.getElementById('config-modal').style.display = 'none';
            this.loadRooms(); // Load data now
            this.loadSettings();
            alert('Setup saved!');
        }
    },

    resetConfig: function () {
        if (confirm('This will disconnect the current Google Sheet. Continue?')) {
            localStorage.removeItem('mekwe_api_url');
            location.reload();
        }
    },

    async loadSettings() {
        const settings = await api.get('getSettings');
        if (settings && settings.hero_image) {
            document.querySelector('.hero').style.backgroundImage = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('${settings.hero_image}')`;
        }
    },

    setupEventListeners: function () {
        // Hamburger menu
        document.querySelector('.hamburger').addEventListener('click', () => {
            const links = document.querySelector('.nav-links');
            links.style.display = links.style.display === 'flex' ? 'none' : 'flex';
        });
    },

    showPage: function (pageId) {
        document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
        document.getElementById(pageId).classList.remove('hidden');

        // Dynamic Load triggers
        if (pageId === 'services') {
            this.loadRooms();
            this.loadServices();
        }
    },

    async loadRooms() {
        const roomGrid = document.getElementById('rooms-grid');
        // Simple cache check or loading state?
        if (roomGrid.children.length > 1) return; // Already loaded?

        const data = await api.get('getRooms');
        if (Array.isArray(data)) {
            roomGrid.innerHTML = data.map(room => `
                <div class="room-card">
                    <img src="${room.ImageURL || 'https://via.placeholder.com/300x200?text=Room'}" class="room-image" alt="${room.Type}">
                    <h3>${room.Type}</h3>
                    <p class="price-tag">${room.Price || 'Contact for Price'}</p>
                    <p>${room.Description || 'Comfortable and standard room.'}</p>
                    <button class="btn-primary full-width" onclick="app.prefillBooking('${room.Type}')">Book Now</button>
                </div>
            `).join('');
            this.populateRoomSelect(data);
        } else {
            roomGrid.innerHTML = '<p>Unable to load rooms. Please check connection.</p>';
        }
    },

    async loadServices() {
        const serviceGrid = document.getElementById('services-grid');
        const data = await api.get('getServices');
        if (Array.isArray(data)) {
            serviceGrid.innerHTML = data.map(s => `
                <div class="service-card">
                    <h3>${s.Name}</h3>
                    <p>${s.Description}</p>
                    <small>${s.Price || ''}</small>
                </div>
            `).join('');
        }
    },

    populateRoomSelect(rooms) {
        const select = document.getElementById('booking-room-select');
        select.innerHTML = '<option value="">Select a Room</option>' +
            rooms.map(r => `<option value="${r.Type}">${r.Type} - ${r.Price}</option>`).join('');
    },

    prefillBooking(roomType) {
        this.showPage('booking');
        const select = document.getElementById('booking-room-select');
        // Requires timeout sometimes if select not populated yet, but loadRooms calls populateRoomSelect
        setTimeout(() => {
            select.value = roomType;
        }, 100);
    },

    async handleBookingSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.innerText = 'Processing...';
        btn.disabled = true;

        const result = await api.post('bookRoom', data);

        btn.innerText = originalText;
        btn.disabled = false;

        if (result && result.status === 'success') {
            alert('Booking Submitted! Reference: ' + result.bookingId + '. \nWe will confirm shortly.');
            e.target.reset();
            this.showPage('home');
        } else {
            alert('Error: ' + (result.message || 'Submission failed'));
        }
    },

    // Pass-through to admin module
    handleAdminLogin: (e) => admin.handleLogin(e),
    logout: () => admin.logout()
};

// Initialize
document.addEventListener('DOMContentLoaded', () => app.init());
