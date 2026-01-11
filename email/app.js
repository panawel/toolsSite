/**
 * TempMail - Glassmorphic Email Generator
 * Logic replication from Python script
 */

const API_BASE = "https://api.mail.tm";
const POLLING_INTERVAL = 10000; // 10 seconds

const state = {
    currentEmail: null,
    currentPassword: null,
    currentToken: null,
    messages: [],
    savedEmails: JSON.parse(localStorage.getItem('saved_emails') || '[]'),
    isDark: true
};

// --- DOM Elements ---
const elements = {
    emailInput: document.getElementById('currentEmail'),
    generateBtn: document.getElementById('generateBtn'),
    saveBtn: document.getElementById('saveBtn'),
    copyBtn: document.getElementById('copyBtn'),
    themeToggle: document.getElementById('themeToggle'),
    savedList: document.getElementById('savedList'),
    searchInput: document.getElementById('searchSaved'),
    inboxBody: document.getElementById('inboxBody'),
    messageViewport: document.getElementById('messageViewport'),
    notificationContainer: document.getElementById('notificationContainer')
};

// --- API Methods ---

const api = {
    async getDomain() {
        try {
            const resp = await fetch(`${API_BASE}/domains`);
            const data = await resp.json();
            return data['hydra:member'][0].domain;
        } catch (err) {
            console.error("Domain fetch failed", err);
            return null;
        }
    },

    async createAccount() {
        const domain = await this.getDomain();
        if (!domain) return null;

        const username = generateUsername();
        const password = btoa(Math.random().toString()).substring(0, 12);
        const address = `${username}@${domain}`;

        try {
            const resp = await fetch(`${API_BASE}/accounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, password })
            });

            if (!resp.ok) throw new Error("Account creation failed");

            const token = await this.getToken(address, password);
            return { address, password, token };
        } catch (err) {
            console.error(err);
            return null;
        }
    },

    async getToken(address, password) {
        try {
            const resp = await fetch(`${API_BASE}/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, password })
            });
            const data = await resp.json();
            return data.token;
        } catch (err) {
            return null;
        }
    },

    async getMessages(token) {
        try {
            const resp = await fetch(`${API_BASE}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await resp.json();
            return data['hydra:member'];
        } catch (err) {
            return [];
        }
    },

    async getMessageContent(token, id) {
        try {
            const resp = await fetch(`${API_BASE}/messages/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return await resp.json();
        } catch (err) {
            return null;
        }
    },

    async markAsSeen(token, id) {
        try {
            await fetch(`${API_BASE}/messages/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json'
                },
                body: JSON.stringify({ seen: true })
            });
        } catch (err) { }
    }
};

// --- Helpers ---

function generateUsername() {
    const adjs = ["happy", "clever", "brave", "calm", "swift", "bright", "lucky", "epic"];
    const nouns = ["panda", "tiger", "lion", "eagle", "wolf", "bear", "fox", "shark"];
    const a = adjs[Math.floor(Math.random() * adjs.length)];
    const n = nouns[Math.floor(Math.random() * nouns.length)];
    const i = Math.floor(Math.random() * 899) + 100;
    return `${a}-${n}-${i}`;
}

function notify(message, type = 'info') {
    const el = document.createElement('div');
    el.className = `notification ${type}`;
    el.textContent = message;
    elements.notificationContainer.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

// --- UI Logic ---

function renderSavedList() {
    const filter = elements.searchInput.value.toLowerCase();
    const filtered = state.savedEmails.filter(e =>
        e.address.toLowerCase().includes(filter) ||
        (e.name || '').toLowerCase().includes(filter) ||
        (e.stage_id || '').toLowerCase().includes(filter)
    );

    if (filtered.length === 0) {
        elements.savedList.innerHTML = '<div class="empty-state">No addresses found</div>';
        return;
    }

    elements.savedList.innerHTML = filtered.map(item => `
        <div class="saved-item ${state.currentEmail === item.address ? 'active' : ''}" 
             onclick="handleSavedItemClick(event, '${item.address}')">
            <span class="address">${item.address}</span>
            <div class="meta-grid">
                <span class="tag">S: ${item.stage_id || '-'}</span>
                <span class="tag">P: ${item.prod_id || '-'}</span>
                <span class="tag">N: ${item.name || 'Set Name'}</span>
            </div>
            <div class="actions" style="margin-top: 10px; display: flex; gap: 5px; justify-content: flex-end;">
                <button onclick="deleteSaved(event, '${item.address}')" class="icon-btn" style="padding: 2px 5px; font-size: 10px; opacity: 0.6;">Delete</button>
            </div>
        </div>
    `).join('');
}

let clickTimer = null;
let clickCount = 0;

function handleSavedItemClick(event, address) {
    clickCount++;

    if (clickTimer) clearTimeout(clickTimer);

    clickTimer = setTimeout(() => {
        if (clickCount === 1) {
            // SINGLE CLICK: Select (just highlight the UI)
            selectItem(address);
        } else if (clickCount === 2) {
            // DOUBLE CLICK: Edit Metadata
            editMetadata(event, address);
        } else if (clickCount >= 3) {
            // TRIPLE CLICK: Login
            loginToSaved(address);
        }
        clickCount = 0;
        clickTimer = null;
    }, 400); // 400ms window for multi-clicks
}

function selectItem(address) {
    state.selectedAddress = address;
    const items = document.querySelectorAll('.saved-item');
    items.forEach(el => {
        const addrSpan = el.querySelector('.address');
        if (addrSpan && addrSpan.textContent === address) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });
    // Note: We don't login here, just visually select
}

async function loginToSaved(address) {
    const creds = state.savedEmails.find(e => e.address === address);
    if (!creds) return;

    elements.emailInput.value = `Logging in...`;
    const token = await api.getToken(creds.address, creds.password);

    if (token) {
        state.currentEmail = creds.address;
        state.currentPassword = creds.password;
        state.currentToken = token;
        elements.emailInput.value = creds.address;
        renderSavedList();
        notify(`Switched to ${creds.address}`);
        refreshInbox(true);
    } else {
        notify("Login failed. Account may have expired.", "error");
        elements.emailInput.value = "Error Logging In";
    }
}

function saveCurrent() {
    if (!state.currentEmail) return;

    if (state.savedEmails.some(e => e.address === state.currentEmail)) {
        notify("Already saved", "info");
        return;
    }

    state.savedEmails.push({
        address: state.currentEmail,
        password: state.currentPassword,
        stage_id: '',
        prod_id: '',
        name: ''
    });

    localStorage.setItem('saved_emails', JSON.stringify(state.savedEmails));
    renderSavedList();
    notify("Address saved locally", "success");
}

function deleteSaved(event, address) {
    event.stopPropagation();
    state.savedEmails = state.savedEmails.filter(e => e.address !== address);
    localStorage.setItem('saved_emails', JSON.stringify(state.savedEmails));
    renderSavedList();
    notify("Removed from saved list");
}

function editMetadata(event, address) {
    event.stopPropagation();
    const item = state.savedEmails.find(e => e.address === address);
    if (!item) return;

    const name = prompt("Enter Name:", item.name || "");
    const stage = prompt("Enter Stage ID:", item.stage_id || "");
    const prod = prompt("Enter Prod ID:", item.prod_id || "");

    if (name !== null) item.name = name;
    if (stage !== null) item.stage_id = stage;
    if (prod !== null) item.prod_id = prod;

    localStorage.setItem('saved_emails', JSON.stringify(state.savedEmails));
    renderSavedList();
}

async function handleGenerate() {
    elements.emailInput.value = "Generating...";
    const account = await api.createAccount();
    if (account) {
        state.currentEmail = account.address;
        state.currentPassword = account.password;
        state.currentToken = account.token;
        elements.emailInput.value = account.address;
        notify("New email generated!", "success");
        refreshInbox(true);
        renderSavedList(); // update active highlight
    } else {
        notify("Failed to generate", "error");
    }
}

async function refreshInbox(force = false) {
    if (!state.currentToken) return;

    const messages = await api.getMessages(state.currentToken);

    // Simple check to avoid flashing
    const oldIds = (state.messages || []).map(m => m.id).join(',');
    const newIds = messages.map(m => m.id).join(',');

    if (oldIds === newIds && !force) return;

    state.messages = messages;
    renderInbox();
}

function renderInbox() {
    if (state.messages.length === 0) {
        elements.inboxBody.innerHTML = '<tr class="empty-row"><td colspan="3">Inbox is empty</td></tr>';
        return;
    }

    elements.inboxBody.innerHTML = state.messages.map(msg => {
        const date = new Date(msg.createdAt).toLocaleString();
        return `
            <tr onclick="viewMessage('${msg.id}')" class="${msg.seen ? '' : 'unread'}">
                <td>${msg.from.name || msg.from.address}</td>
                <td>${msg.subject}</td>
                <td>${date}</td>
            </tr>
        `;
    }).join('');
}

async function viewMessage(id) {
    const msg = state.messages.find(m => m.id === id);
    if (!msg) return;

    // Mark as seen locally immediately
    msg.seen = true;
    renderInbox();

    elements.messageViewport.innerHTML = '<div class="empty-state">Loading content...</div>';

    const content = await api.getMessageContent(state.currentToken, id);
    if (content) {
        elements.messageViewport.innerHTML = `
            <div class="message-header">
                <div class="field"><label>From:</label> <span>${content.from.name || ''} &lt;${content.from.address}&gt;</span></div>
                <div class="field"><label>Subject:</label> <span>${content.subject}</span></div>
                <div class="field"><label>Date:</label> <span>${new Date(content.createdAt).toLocaleString()}</span></div>
            </div>
            <div class="message-body">
                ${content.text ? `<pre style="white-space: pre-wrap; font-family: inherit;">${content.text}</pre>` : content.html}
            </div>
        `;
        api.markAsSeen(state.currentToken, id);
    } else {
        elements.messageViewport.innerHTML = '<div class="empty-state">Failed to load content</div>';
    }
}

// --- Event Listeners ---

elements.generateBtn.addEventListener('click', handleGenerate);
elements.saveBtn.addEventListener('click', saveCurrent);
elements.searchInput.addEventListener('input', renderSavedList);

elements.copyBtn.addEventListener('click', () => {
    if (!state.currentEmail) return;
    navigator.clipboard.writeText(state.currentEmail);
    const originalIcon = elements.copyBtn.innerHTML;
    elements.copyBtn.innerHTML = '<span>✔</span>';
    setTimeout(() => elements.copyBtn.innerHTML = originalIcon, 1500);
});

elements.themeToggle.addEventListener('click', () => {
    state.isDark = !state.isDark;
    document.body.className = state.isDark ? 'dark-theme' : 'light-theme';
    elements.themeIcon.innerHTML = state.isDark ?
        '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>' :
        '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
});

// --- Initial ---
renderSavedList();
setInterval(() => refreshInbox(), POLLING_INTERVAL);
