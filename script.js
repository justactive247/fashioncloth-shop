// Firebase Config - REPLACE WITH YOUR ACTUAL CONFIG FROM FIREBASE CONSOLE
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);



// Global State
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let products = [];
let currentFilter = 'all';
let visitorCount = 0;
let isLoading = true;

// WhatsApp Numbers
const WHATSAPP_NUMBERS = ['2349017001875', '2349134214260'];

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

// Main Initialization
async function initApp() {
    // Hide preloader
    setTimeout(() => {
        document.getElementById('preloader').classList.add('hidden');
    }, 1500);
    
    setupEventListeners();
    trackVisitor();
    loadProducts();
    loadSettings();
    updateCartUI();
    setupNavbarScroll();
    setupAnimations();
    setupTestimonialSlider();
    setupFAQ();
}

// Event Listeners
function setupEventListeners() {
    // Mobile menu
    document.querySelector('.hamburger').addEventListener('click', toggleMobileMenu);
    
    // Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            setFilter(e.target.dataset.filter);
        });
    });
    
    // Category cards
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const category = e.currentTarget.dataset.category;
            setFilter(category);
            scrollToShop();
        });
    });
    
    // Forms
    document.getElementById('contactForm')?.addEventListener('submit', handleContactSubmit);
    
    // Testimonials
    document.querySelector('.nav-btn.prev')?.addEventListener('click', () => prevTestimonial());
    document.querySelector('.nav-btn.next')?.addEventListener('click', () => nextTestimonial());
}

// Track Visitor with Geolocation
async function trackVisitor() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        const visitorData = {
            city: data.city || 'Unknown',
            region: data.region || 'Unknown',
            country: data.country_name || 'Nigeria',
            ip: data.ip,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            userAgent: navigator.userAgent.slice(0, 100),
            referrer: document.referrer
        };
        
        await db.ref('visitors').push(visitorData);
        
        console.log(`👋 Premium visitor from ${data.city}, ${data.region}`);
    } catch (error) {
        console.log('👋 Visitor tracked');
    }
    visitorCount++;
}

// Load Products from Firebase
async function loadProducts() {
    try {
        isLoading = true;
        const snapshot = await db.ref('products').once('value');
        products = Object.values(snapshot.val() || {});
        
        renderProducts(products);
        console.log(`✅ Loaded ${products.length} premium products`);
        isLoading = false;
    } catch (error) {
        console.error('Error loading products:', error);
        showSkeletonLoader();
    }
}

// Enhanced Product Rendering
function renderProducts(productList) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    
    // Filter products
    const filteredProducts = productList.filter(product => 
        currentFilter === 'all' || product.category === currentFilter
    );
    
    if (filteredProducts.length === 0) {
        grid.innerHTML = `
            <div class="no-products">
                <i class="fas fa-search"></i>
                <h3>No products found</h3>
                <p>Try another category or check back later</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filteredProducts.map((product, index) => `
        <div class="product-card" style="animation-delay: ${index * 0.1}s">
            <div class="product-image-container">
                <img src="${product.image || getDefaultImage(product.category)}" 
                     alt="${product.name}" class="product-image" 
                     loading="lazy"
                     onerror="this.src='${getDefaultImage(product.category)}'">
                <div class="product-badge">${product.stock > 0 ? 'In Stock' : 'Sold Out'}</div>
                ${product.new ? '<div class="product-badge new">New</div>' : ''}
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-price">₦${formatPrice(product.price)}</div>
                <p class="product-description">${product.description?.substring(0, 120) || 'Premium quality fashion item'}...</p>
                <button class="product-btn" onclick="addToCart('${product.id}')" ${product.stock === 0 ? 'disabled' : ''}>
                    ${product.stock === 0 ? '<i class="fas fa-ban"></i> Out of Stock' : '<i class="fas fa-shopping-bag"></i> Add to Cart'}
                    ${product.stock > 0 ? `₦${formatPrice(product.price)}` : ''}
                </button>
            </div>
        </div>
    `).join('');
    
    // Animate cards
    setTimeout(() => {
        document.querySelectorAll('.product-card').forEach((card, index) => {
            setTimeout(() => card.classList.add('animate'), index * 100);
        });
    }, 100);
}

// Filter Products
function setFilter(filter) {
    currentFilter = filter;
    
    // Update active filter
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    renderProducts(products);
}

// Default Images by Category
function getDefaultImage(category = 'general') {
    const images = {
        ankara: 'https://images.unsplash.com/photo-1608259402577-295d84b1e3e9?w=500&h=500&fit=crop',
        agbada: 'https://images.unsplash.com/photo-1574194050860-b6f4441f63bb?w=500&h=500&fit=crop',
        corporate: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=500&fit=crop',
        general: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=500&h=500&fit=crop'
    };
    return images[category] || images.general;
}

// Shopping Cart - Enhanced
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock === 0) return;
    
    const cartItem = cart.find(item => item.id === productId);
    
    if (cartItem) {
        if (cartItem.quantity >= product.stock) {
            showNotification('Limited stock available!', 'error');
            return;
        }
        cartItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1,
            stock: product.stock
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    
    // Success animation
    showNotification(`Added "${product.name}" to cart! 🛍️`, 'success');
}

function updateCartUI() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCount = document.getElementById('cart-count');
    if (cartCount) cartCount.textContent = count;
}

function openCart() {
    if (cart.length === 0) {
        showNotification('Your cart is empty 🛒', 'info');
        return;
    }
    
    const modal = document.getElementById('cartModal');
    const cartItems = document.getElementById('cartItems');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <p>₦${formatPrice(item.price)} x ${item.quantity}</p>
                <small>${item.stock - item.quantity} left in stock</small>
            </div>
            <div class="cart-item-controls">
                <button onclick="updateCartQuantity('${item.id}', -1)" class="qty-btn">-</button>
                <span>${item.quantity}</span>
                <button onclick="updateCartQuantity('${item.id}', 1)" class="qty-btn">+</button>
                <button onclick="removeFromCart('${item.id}')" class="remove-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('') + `
        <div class="cart-total">
            <h3>Total: ₦${formatPrice(total)}</h3>
        </div>
    `;
    
    modal.style.display = 'flex';
}

function closeCart() {
    document.getElementById('cartModal').style.display = 'none';
}

function updateCartQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;
    
    const newQty = item.quantity + change;
    if (newQty <= 0 || newQty > item.stock) return;
    
    item.quantity = newQty;
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    openCart(); // Refresh cart view
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    openCart();
}

async function processCheckout() {
    if (cart.length === 0) return;
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const orderData = {
        id: 'ORD' + Date.now(),
        items: cart,
        total: total,
        status: 'pending',
        method: 'cash', // Default
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        customer: {
            name: 'Customer', // Get from form in future
            phone: 'Customer phone'
        }
    };
    
    try {
        const orderRef = await db.ref('orders').push(orderData);
        showNotification(`✅ Order #${orderRef.key?.substring(0,8)} created!`, 'success');
        
        // Clear cart
        cart = [];
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
        closeCart();
        
        // WhatsApp confirmation
        openWhatsAppOrderConfirmation(orderRef.key);
    } catch (error) {
        showNotification('Order failed. Please call us!', 'error');
    }
}

// WhatsApp Integration - Enhanced
function openWhatsApp() {
    const message = `Hi FashionCloth NG Team! 👋

I'm interested in shopping from your premium collection.
📍 Branches: Owerri, Anambra, Enugu
📞 Phone: 09017001875 | 09134214260

Please send me your latest catalog!

${getCustomerLocationInfo()}`;
    
    const randomNumber = WHATSAPP_NUMBERS[Math.floor(Math.random() * WHATSAPP_NUMBERS.length)];
    window.open(`https://wa.me/${randomNumber}?text=${encodeURIComponent(message)}`, '_blank');
}

function openWhatsAppOrderConfirmation(orderId) {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemsList = cart.map(item => `${item.name} (x${item.quantity})`).join('\n');
    
    const message = `🛒 *ORDER CONFIRMATION* #${orderId?.substring(0,8)}

*Items:*
${itemsList}

*Total: ₦${formatPrice(total)}*
*Payment:* Cash on Delivery

Please confirm delivery details and address! 📍`;
    
    window.open(`https://wa.me/2349017001875?text=${encodeURIComponent(message)}`, '_blank');
}

function getCustomerLocationInfo() {
    return navigator.geolocation ? '📱 Location sharing enabled' : '';
}

// Contact Form
async function handleContactSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const contactData = {
        name: formData.get('name') || e.target.querySelector('input[type="text"]').value,
        phone: formData.get('phone') || e.target.querySelector('input[type="tel"]').value,
        email: formData.get('email') || e.target.querySelector('input[type="email"]').value,
        message: formData.get('message') || e.target.querySelector('textarea').value,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    try {
        await db.ref('contacts').push(contactData);
        showNotification('✅ Message sent! We\'ll reply within 2 hours 📩', 'success');
        e.target.reset();
    } catch (error) {
        showNotification('Error! Please WhatsApp us directly 🚀', 'error');
    }
}

// Load Business Settings
async function loadSettings() {
    try {
        const snapshot = await db.ref('settings').once('value');
        const settings = snapshot.val() || {};
        
        // Update dynamic content
        if (settings.contact) {
            WHATSAPP_NUMBERS[0] = settings.contact.whatsapp || WHATSAPP_NUMBERS[0];
        }
    } catch (error) {
        console.log('Using default settings');
    }
}

// Utility Functions
function scrollToShop() {
    document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
}

function formatPrice(price) {
    return new Intl.NumberFormat('en-NG', {
        style: 'decimal',
        minimumFractionDigits: 0
    }).format(price || 0);
}

function toggleMobileMenu() {
    document.querySelector('.nav-links').classList.toggle('active');
    document.querySelector('.hamburger').classList.toggle('active');
}

function showSkeletonLoader() {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = Array(6).fill().map(() => `
        <div class="product-card skeleton">
            <div class="skeleton-image"></div>
            <div class="skeleton-text">
                <div class="skeleton-line line-1"></div>
                <div class="skeleton-line line-2"></div>
                <div class="skeleton-line line-3"></div>
            </div>
        </div>
    `).join('');
}

// Testimonials Slider
let currentTestimonial = 0;
const testimonials = document.querySelectorAll('.testimonial');

function showTestimonial(index) {
    testimonials.forEach((t, i) => {
        t.classList.toggle('active', i === index);
    });
    currentTestimonial = index;
}

function nextTestimonial() {
    currentTestimonial = (currentTestimonial + 1) % testimonials.length;
    showTestimonial(currentTestimonial);
}

function prevTestimonial() {
    currentTestimonial = (currentTestimonial - 1 + testimonials.length) % testimonials.length;
    showTestimonial(currentTestimonial);
}

function setupTestimonialSlider() {
    setInterval(nextTestimonial, 5000);
    showTestimonial(0);
}

// FAQ Toggle
function setupFAQ() {
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', function() {
            const item = this.parentElement;
            const answer = item.querySelector('.faq-answer');
            const icon = this.querySelector('i');
            
            item.classList.toggle('active');
            answer.style.maxHeight = item.classList.contains('active') ? answer.scrollHeight + 'px' : '0';
            icon.style.transform = item.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
        });
    });
}

// Navbar Scroll Effect
function setupNavbarScroll() {
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(255,255,255,0.98)';
            navbar.style.boxShadow = '0 20px 60px rgba(0,0,0,0.15)';
        } else {
            navbar.style.background = 'rgba(255,255,255,0.95)';
            navbar.style.boxShadow = '0 10px 40px rgba(0,0,0,0.1)';
        }
    });
}

// Scroll Animations
function setupAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.service-card, .category-card, .testimonial').forEach(el => {
        observer.observe(el);
    });
}

// Notification System
function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${getToastIcon(type)}"></i>
        ${message}
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

function getToastIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };
    return icons[type] || icons.info;
}

// Close modals on outside click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// Prevent body scroll when mobile menu open
document.querySelector('.hamburger')?.addEventListener('click', () => {
    document.body.style.overflow = document.querySelector('.nav-links') 
} );