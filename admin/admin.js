// Firebase Config - SAME AS PUBLIC (get from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyCAkr9r_T0teKPx0EMEHeuggzNP5q95Lk4",
  authDomain: "fashioncloth-shop.firebaseapp.com",
  projectId: "fashioncloth-shop",
  storageBucket: "fashioncloth-shop.firebasestorage.app",
  messagingSenderId: "127690273139",
  appId: "1:127690273139:web:fbb58283b0f989e92cd506",
  measurementId: "G-DN05BBESGZ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// Admin State
let currentUser = null;
let products = [];
let orders = [];
let visitors = [];
let messages = [];

// Default Admin Credentials (CHANGE THESE!)
const ADMIN_CREDENTIALS = {
    email: 'admin@fashioncloth.ng',
    password: 'password001'
};

// Initialize Admin
document.addEventListener('DOMContentLoaded', function() {
    initAdmin();
});

// Main Initialization
async function initAdmin() {
    setupEventListeners();
    checkLoginStatus();
    loadDashboardStats();
}

// Event Listeners
function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchSection(item.dataset.section);
        });
    });
    
    // Forms
    document.getElementById('addProductForm').addEventListener('submit', handleAddProduct);
    document.getElementById('settingsForm').addEventListener('submit', handleSaveSettings);
    
    // Real-time listeners
    setupRealtimeListeners();
}

// Login Handler
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Simple admin check (for demo - use Firebase Auth in production)
    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
        currentUser = { email, role: 'admin' };
        showNotification('Login successful! 👋', 'success');
        document.getElementById('loginModal').classList.remove('active');
        loadAllData();
        return;
    }
    
    showNotification('Invalid credentials!', 'error');
}

// Navigation
function switchSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Remove active nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName).classList.remove('hidden');
    event.target.classList.add('active');
    
    // Load section data
    if (sectionName === 'products') loadProducts();
    if (sectionName === 'orders') loadOrders();
    if (sectionName === 'analytics') loadAnalytics();
    if (sectionName === 'contacts') loadMessages();
    if (sectionName === 'settings') loadSettings();
}

// Real-time Firebase Listeners
function setupRealtimeListeners() {
    // Products
    db.ref('products').on('value', (snapshot) => {
        products = Object.values(snapshot.val() || {});
        if (document.getElementById('productsTable')) {
            renderProductsTable(products);
        }
        updateDashboardStats();
    });
    
    // Orders
    db.ref('orders').on('value', (snapshot) => {
        orders = Object.values(snapshot.val() || {});
        if (document.querySelector('#ordersList')) {
            renderOrdersList(orders);
        }
        updateDashboardStats();
    });
    
    // Visitors
    db.ref('visitors').limitToLast(100).on('value', (snapshot) => {
        visitors = Object.values(snapshot.val() || {});
        updateDashboardStats();
    });
    
    // Messages
    db.ref('contacts').on('value', (snapshot) => {
        messages = Object.values(snapshot.val() || {});
        if (document.querySelector('#messagesList')) {
            renderMessagesList(messages);
        }
    });
}

// Load All Initial Data
async function loadAllData() {
    await Promise.all([
        loadProducts(),
        loadOrders(),
        loadMessages(),
        loadSettings()
    ]);
    updateDashboardStats();
}

// Dashboard Stats
async function loadDashboardStats() {
    const today = new Date().toDateString();
    
    const todayOrders = orders.filter(order => 
        new Date(order.timestamp).toDateString() === today
    ).length;
    
    const todayVisitors = visitors.filter(visitor => 
        new Date(visitor.timestamp).toDateString() === today
    ).length;
    
    document.getElementById('totalOrders').textContent = todayOrders;
    document.getElementById('totalVisitors').textContent = todayVisitors;
    document.getElementById('totalProducts').textContent = products.length;
}

// PRODUCTS MANAGEMENT
async function loadProducts() {
    // Loaded via realtime listener
}

function renderProductsTable(products) {
    const tbody = document.getElementById('productsTable');
    tbody.innerHTML = products.map(product => `
        <tr>
            <td><img src="${product.image}" alt="${product.name}" class="product-image"></td>
            <td>${product.name}</td>
            <td>₦${formatPrice(product.price)}</td>
            <td>${product.stock}</td>
            <td>
                <button class="action-btn btn-edit" onclick="editProduct('${product.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn btn-delete" onclick="deleteProduct('${product.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function showAddProductModal() {
    document.getElementById('addProductModal').classList.add('active');
}

function closeAddProductModal() {
    document.getElementById('addProductModal').classList.remove('active');
    document.getElementById('addProductForm').reset();
}

async function handleAddProduct(e) {
    e.preventDefault();
    
    const productData = {
        id: Date.now().toString(),
        name: document.getElementById('productName').value,
        price: parseInt(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        description: document.getElementById('productDesc').value,
        image: document.getElementById('productImage').value,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    try {
        await db.ref('products/' + productData.id).set(productData);
        showNotification('Product added successfully! ✅', 'success');
        closeAddProductModal();
    } catch (error) {
        showNotification('Error adding product!', 'error');
    }
}

async function deleteProduct(productId) {
    if (confirm('Delete this product?')) {
        try {
            await db.ref('products/' + productId).remove();
            showNotification('Product deleted!', 'success');
        } catch (error) {
            showNotification('Error deleting product!', 'error');
        }
    }
}

async function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // Populate form for editing (simplified)
    document.getElementById('productName').value = product.name;
    document.getElementById('productPrice').value = product.price;
    // ... populate other fields
    
    showNotification('Edit mode - update and save!', 'info');
}

// ORDERS MANAGEMENT
function loadOrders() {
    // Loaded via realtime listener
}

function renderOrdersList(ordersList) {
    const container = document.getElementById('ordersList');
    container.innerHTML = ordersList.map(order => {
        const statusClass = `status-${order.status || 'pending'}`;
        const total = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        return `
            <div class="order-card">
                <div class="order-header">
                    <h3>Order #${order.id?.substring(0,8) || 'N/A'}</h3>
                    <span class="order-status ${statusClass}">${order.status?.toUpperCase() || 'PENDING'}</span>
                </div>
                <p><strong>Total:</strong> ₦${formatPrice(total)}</p>
                <p><strong>Method:</strong> ${order.method}</p>
                <div style="margin-top: 1rem;">
                    ${order.items.map(item => 
                        `<div style="display: flex; gap: 1rem; margin-bottom: 0.5rem;">
                            <strong>${item.name}</strong> x${item.quantity} - ₦${formatPrice(item.price * item.quantity)}
                        </div>`
                    ).join('')}
                </div>
                <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
                    <button class="action-btn btn-confirm" onclick="updateOrderStatus('${order.id}', 'confirmed')">
                        Confirm
                    </button>
                    <button class="action-btn btn-confirm" onclick="updateOrderStatus('${order.id}', 'delivered')">
                        Mark Delivered
                    </button>
                    <button class="action-btn btn-delete" onclick="deleteOrder('${order.id}')">
                        Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function filterOrders() {
    const filter = document.getElementById('ordersFilter').value;
    const filteredOrders = filter === 'all' ? orders : 
        orders.filter(order => order.status === filter);
    renderOrdersList(filteredOrders);
}

async function updateOrderStatus(orderId, status) {
    if (confirm(`Mark order as ${status}?`)) {
        try {
            await db.ref('orders/' + orderId).update({ status });
            showNotification(`Order updated to ${status}!`, 'success');
        } catch (error) {
            showNotification('Error updating order!', 'error');
        }
    }
}

async function deleteOrder(orderId) {
    if (confirm('Delete this order?')) {
        try {
            await db.ref('orders/' + orderId).remove();
            showNotification('Order deleted!', 'success');
        } catch (error) {
            showNotification('Error deleting order!', 'error');
        }
    }
}

// MESSAGES
function loadMessages() {
    // Loaded via realtime listener
}

function renderMessagesList(messagesList) {
    const container = document.getElementById('messagesList');
    container.innerHTML = messagesList.map(msg => `
        <div class="message-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <strong>${msg.name || 'N/A'}</strong>
                <small>${new Date(msg.timestamp).toLocaleString()}</small>
            </div>
            <p><strong>Phone:</strong> ${msg.phone}</p>
            <p><strong>Email:</strong> ${msg.email || 'N/A'}</p>
            <p>${msg.message}</p>
            <button class="action-btn btn-delete" onclick="deleteMessage('${msg.id}')" style="margin-top: 1rem;">
                Delete
            </button>
        </div>
    `).join('');
}

async function deleteMessage(msgId) {
    if (confirm('Delete this message?')) {
        try {
            await db.ref('contacts/' + msgId).remove();
            showNotification('Message deleted!', 'success');
        } catch (error) {
            showNotification('Error deleting message!', 'error');
        }
    }
}

// SETTINGS
async function loadSettings() {
    try {
        const snapshot = await db.ref('settings').once('value');
        const settings = snapshot.val() || {};
        document.getElementById('whatsappNumber').value = settings.contact?.whatsapp || '';
        document.getElementById('paystackKey').value = settings.payment?.paystack || '';
    } catch (error) {
        console.log('No settings found');
    }
}

async function handleSaveSettings(e) {
    e.preventDefault();
    const settings = {
        contact: {
            whatsapp: document.getElementById('whatsappNumber').value
        },
        payment: {
            paystack: document.getElementById('paystackKey').value
        },
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    try {
        await db.ref('settings').set(settings);
        showNotification('Settings saved!', 'success');
    } catch (error) {
        showNotification('Error saving settings!', 'error');
    }
}

// ANALYTICS
async function loadAnalytics() {
    // Simple charts with Chart.js
    renderVisitorsChart();
    renderOrdersChart();
}

function renderVisitorsChart() {
    const ctx = document.getElementById('visitorsChart')?.getContext('2d');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
            datasets: [{
                label: 'Visitors',
                data: [65, 59, 80, 81, 56],
                borderColor: 'rgb(255, 107, 107)',
                backgroundColor: 'rgba(255, 107, 107, 0.2)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function renderOrdersChart() {
    const ctx = document.getElementById('ordersChart')?.getContext('2d');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Confirmed', 'Delivered'],
            datasets: [{
                data: [12, 19, 8],
                backgroundColor: ['#ffc107', '#28a745', '#6c757d']
            }]
        },
        options: {
            responsive: true
        }
    });
}

// UTILITY FUNCTIONS
function formatPrice(price) {
    return new Intl.NumberFormat('en-NG').format(price);
}

function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function checkLoginStatus() {
    if (currentUser) {
        document.getElementById('loginModal').classList.remove('active');
    }
}

function logout() {
    currentUser = null;
    document.getElementById('loginModal').classList.add('active');
    switchSection('dashboard');
    showNotification('Logged out', 'info');
}

function updateDashboardStats() {
    loadDashboardStats();
}

// SAMPLE DATA - Run once to populate (remove after first use)
async function addSampleData() {
    // Add 5 sample products
    const sampleProducts = [
        { id: '1', name: 'Ankara Dress', price: 25000, stock: 15, image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400', description: 'Beautiful Ankara gown' },
        { id: '2', name: 'Agbada Set', price: 45000, stock: 8, image: 'https://images.unsplash.com/photo-1574194050860-b6f4441f63bb?w=400', description: 'Premium Agbada' }
    ];
    
    for (let product of sampleProducts) {
        await db.ref('products/' + product.id).set(product);
    }
    
    showNotification('Sample data added!', 'success');
}

// Initialize
console.log('🚀 FashionCloth NG Admin Panel Loaded!');
console.log('Login: admin@fashioncloth.ng / passwor001');
console.log('Call addSampleData() in console for demo products');