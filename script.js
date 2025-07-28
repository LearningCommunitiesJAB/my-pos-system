// IMPORTANT: This is your Google Apps Script Web App URL.
const GOOGLE_APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/a/macros/hawaii.edu/s/AKfycbw6UL14oiz_jFrfvyv7uGEtFqSgJwNP6BavO0XrLCjtPL_Dykk_evaGPaq7PKV8h2Q/exec';

// Global variables for the main POS page
let currentUserId = 'POS Operator'; // A simple identifier for the current session
let cartItems = [];
let recentOrders = []; // Will be loaded/saved from localStorage for the report

const TAX_RATE = 0.00; // No sales tax

// Product data (remains the same)
const poloProducts = [
    { id: 'polo_shirt_xs', name: 'Polo Shirt (XS)', price: 35.00, type: 'polo', size: 'XS' },
    { id: 'polo_shirt_s', name: 'Polo Shirt (S)', price: 35.00, type: 'polo', size: 'S' },
    { id: 'polo_shirt_m', name: 'Polo Shirt (M)', price: 35.00, type: 'polo', size: 'M' },
    { id: 'polo_shirt_l', name: 'Polo Shirt (L)', price: 35.00, type: 'polo', size: 'L' },
    { id: 'polo_shirt_xl', name: 'Polo Shirt (XL)', price: 35.00, type: 'polo', size: 'XL' },
    { id: 'polo_shirt_xxl', name: 'Polo Shirt (XXL)', price: 37.00, type: 'polo', size: 'XXL' },
];

const scrubProducts = [
    { id: 'scrub_set_xs', name: 'Scrub Set (XS)', price: 40.00, type: 'scrub', size: 'XS' },
    { id: 'scrub_set_s', name: 'Scrub Set (S)', price: 40.00, type: 'scrub', size: 'S' },
    { id: 'scrub_set_m', name: 'Scrub Set (M)', price: 40.00, type: 'scrub', size: 'M' },
    { id: 'scrub_set_l', name: 'Scrub Set (L)', price: 40.00, type: 'scrub', size: 'L' },
    { id: 'scrub_set_xl', name: 'Scrub Set (XL)', price: 40.00, type: 'scrub', size: 'XL' },
    { id: 'scrub_set_xxl', name: 'Scrub Set (XXL)', price: 40.00, type: 'scrub', size: 'XXL' },
];

const flaskProducts = [
    { id: 'flask_18oz_green', name: 'Flask 18oz (Green)', price: 30.00, type: 'flask', size: '18oz', color: 'green' },
    { id: 'flask_18oz_black', name: 'Flask 18oz (Black)', price: 30.00, type: 'flask', size: '18oz', color: 'black' },
    { id: 'flask_34oz_green', name: 'Flask 34oz (Green)', price: 40.00, type: 'flask', size: '34oz', color: 'green' },
    { id: 'flask_34oz_black', name: 'Flask 34oz (Black)', price: 40.00, type: 'flask', size: '34oz', color: 'black' },
];

const allProducts = [...poloProducts, ...scrubProducts, ...flaskProducts];
const quantities = allProducts.reduce((acc, product) => ({ ...acc, [product.id]: 1 }), {});

// DOM Elements
const userIdSpan = document.getElementById('user-id');
const messageBox = document.getElementById('message-box');

const poloProductsList = document.getElementById('polo-products-list');
const scrubProductsList = document.getElementById('scrub-products-list');
const flaskProductsList = document.getElementById('flask-products-list');
const cartItemsList = document.getElementById('cart-items-list');
const subtotalSpan = document.getElementById('subtotal');
const totalSpan = document.getElementById('total');

const proceedToCheckoutBtn = document.getElementById('proceed-to-checkout-btn');
const clearCartBtn = document.getElementById('clear-cart-btn');
const closeSessionBtn = document.getElementById('close-session-btn');


// --- Utility Functions ---

function showMessage(msg, isError = false) {
    messageBox.textContent = msg;
    messageBox.className = `message-box ${isError ? 'error' : ''}`;
    messageBox.classList.remove('hidden');
    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, 3000); // Hide after 3 seconds
}

function calculateTotals() {
    let newSubtotal = 0;
    cartItems.forEach(item => {
        newSubtotal += item.price * item.quantity;
    });
    const newTax = newSubtotal * TAX_RATE;
    const newTotal = newSubtotal + newTax;

    subtotalSpan.textContent = `$${newSubtotal.toFixed(2)}`;
    totalSpan.textContent = `$${newTotal.toFixed(2)}`;
    return { newSubtotal, newTax, newTotal };
}

// --- Local Storage Functions for Main Page ---
function saveCartToLocalStorage() {
    try {
        localStorage.setItem('pos-cart', JSON.stringify(cartItems));
        localStorage.setItem('pos-cart-total', JSON.stringify(calculateTotals().newTotal)); // Save total too
    } catch (e) {
        console.error("Error saving cart to local storage:", e);
        showMessage("Error saving cart locally.", true);
    }
}

function loadCartFromLocalStorage() {
    try {
        const storedCart = localStorage.getItem('pos-cart');
        if (storedCart) {
            cartItems = JSON.parse(storedCart);
        }
    } catch (e) {
        console.error("Error loading cart from local storage:", e);
        showMessage("Error loading previous cart locally.", true);
    }
}

function saveRecentOrdersToLocalStorage() {
    try {
        localStorage.setItem('pos-recent-orders', JSON.stringify(recentOrders));
    } catch (e) {
        console.error("Error saving recent orders to local storage:", e);
        showMessage("Error saving recent orders locally.", true);
    }
}

function loadRecentOrdersFromLocalStorage() {
    try {
        const storedOrders = localStorage.getItem('pos-recent-orders');
        if (storedOrders) {
            recentOrders = JSON.parse(storedOrders);
            // Ensure orders are sorted by timestamp (most recent first)
            recentOrders.sort((a, b) => (new Date(b.timestamp).getTime() || 0) - (new Date(a.timestamp).getTime() || 0));
        }
    } catch (e) {
        console.error("Error loading recent orders from local storage:", e);
        showMessage("Error loading previous orders locally.", true);
    }
}

// --- Render Functions ---

function renderProductList(productsToRender, containerElement) {
    containerElement.innerHTML = ''; // Clear previous content
    productsToRender.forEach(product => {
        const productDiv = document.createElement('div');
        productDiv.className = "flex flex-col sm:flex-row items-center justify-between bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200";
        productDiv.innerHTML = `
            <div class="flex-grow mb-2 sm:mb-0">
                <h3 class="text-lg font-medium text-gray-800">${product.name}</h3>
                <p class="text-gray-600">$${product.price.toFixed(2)}</p>
            </div>
            <div class="flex items-center space-x-3">
                <input
                    type="number"
                    min="1"
                    value="${quantities[product.id]}"
                    data-product-id="${product.id}"
                    class="w-20 p-2 border border-gray-300 rounded-md text-center focus:ring-blue-500 focus:border-blue-500 quantity-input"
                />
                <button
                    data-product-id="${product.id}"
                    class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 add-to-cart-btn"
                >
                    Add
                </button>
            </div>
        `;
        containerElement.appendChild(productDiv);
    });

    // Attach event listeners for quantity changes and add to cart
    containerElement.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const productId = e.target.dataset.productId;
            quantities[productId] = Math.max(1, parseInt(e.target.value, 10) || 1);
        });
    });
    containerElement.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = e.target.dataset.productId;
            const product = allProducts.find(p => p.id === productId);
            if (product) addToCart(product);
        });
    });
}

function renderCartItems() {
    cartItemsList.innerHTML = ''; // Clear previous content
    if (cartItems.length === 0) {
        cartItemsList.innerHTML = '<p class="text-gray-500 text-center py-8">Your cart is empty. Add some items!</p>';
    } else {
        cartItems.forEach((item, index) => {
            const cartItemDiv = document.createElement('div');
            cartItemDiv.className = "flex items-center justify-between bg-white p-3 rounded-md shadow-sm";
            cartItemDiv.innerHTML = `
                <div class="flex-grow">
                    <p class="text-gray-800 font-medium">${item.name}</p>
                    <p class="text-sm text-gray-600">${item.quantity} x $${item.price.toFixed(2)}</p>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-gray-900 font-semibold">$${(item.quantity * item.price).toFixed(2)}</span>
                    <button
                        data-index="${index}"
                        class="p-1 text-red-600 hover:text-red-800 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 remove-from-cart-btn"
                        aria-label="Remove item"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            `;
            cartItemsList.appendChild(cartItemDiv);
        });
        // Attach event listeners for remove from cart
        cartItemsList.querySelectorAll('.remove-from-cart-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index, 10);
                removeFromCart(index);
            });
        });
    }
    calculateTotals();
}

// --- Core Logic Functions ---

function addToCart(product) {
    const quantity = quantities[product.id];
    if (quantity <= 0) {
        showMessage('Quantity must be at least 1.', true);
        return;
    }

    const existingItemIndex = cartItems.findIndex(item => item.id === product.id);
    if (existingItemIndex > -1) {
        cartItems[existingItemIndex].quantity += quantity;
    } else {
        cartItems.push({ ...product, quantity });
    }
    showMessage(`${quantity} x ${product.name} added to cart.`);
    renderCartItems();
    saveCartToLocalStorage(); // Save cart after every change
}

function removeFromCart(index) {
    if (index > -1 && index < cartItems.length) {
        const removedItem = cartItems.splice(index, 1);
        showMessage(`${removedItem[0].name} removed from cart.`);
        renderCartItems();
        saveCartToLocalStorage(); // Save cart after every change
    }
}

function clearCart() {
    cartItems = [];
    showMessage('Cart cleared.');
    renderCartItems();
    saveCartToLocalStorage(); // Clear cart in local storage
}

function initiateCheckout() {
    if (cartItems.length === 0) {
        showMessage('Your cart is empty. Please add items before proceeding to checkout.', true);
        return;
    }
    // Save cart data to local storage before redirecting
    saveCartToLocalStorage();
    window.location.href = 'checkout.html'; // Redirect to the new checkout page
}

function closeSession() {
    clearCart(); // Clear current cart
    // No need to save recentOrders here, as they are accumulated in checkout.js
    // and the report page will load them directly from localStorage.
    window.location.href = 'report.html'; // Redirect to the new report page
}

// --- Event Listeners ---
proceedToCheckoutBtn.addEventListener('click', initiateCheckout);
clearCartBtn.addEventListener('click', clearCart);
closeSessionBtn.addEventListener('click', closeSession);


// --- Initialization ---

function initializePOS() {
    try {
        userIdSpan.textContent = currentUserId; // Display "POS Operator"
        loadCartFromLocalStorage(); // Load cart on page load
        loadRecentOrdersFromLocalStorage(); // Load recent orders for the report page
        renderProductList(poloProducts, poloProductsList);
        renderProductList(scrubProducts, scrubProductsList);
        renderProductList(flaskProducts, flaskProductsList);
        renderCartItems();
        console.log("Main POS System Initialized!"); // Added for debugging
    } catch (error) {
        console.error("Error during POS system initialization:", error);
        showMessage(`Error initializing POS: ${error.message}`, true);
    }
}

// Initial render on page load
window.onload = function() {
    initializePOS();
};
