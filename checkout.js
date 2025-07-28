// This script handles the checkout page logic.

// IMPORTANT: You MUST replace this with the Web App URL you get after deploying your Google Apps Script.
const GOOGLE_APPS_SCRIPT_WEB_APP_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE'; // Make sure to replace this!

let cartItems = [];
let currentTotal = 0;
let recentOrders = []; // To accumulate orders for the report
let currentUserId = 'POS Operator'; // Consistent user ID

// DOM Elements
const messageBox = document.getElementById('message-box');
const checkoutOrderSummary = document.getElementById('checkout-order-summary');
const checkoutTotalSpan = document.getElementById('checkout-total');
const customerNameInput = document.getElementById('customer-name');
const customerEmailInput = document.getElementById('customer-email');
const customerPhoneInput = document.getElementById('customer-phone');
const paymentMethodRadios = document.querySelectorAll('input[name="paymentMethod"]');
const completeOrderBtn = document.getElementById('complete-order-btn');
const backToPosFromCheckoutBtn = document.getElementById('back-to-pos-from-checkout-btn');

let customerInfo = {
    name: '',
    email: '',
    phone: '',
    paymentMethod: '',
};

// --- Utility Functions ---

function showMessage(msg, isError = false) {
    messageBox.textContent = msg;
    messageBox.className = `message-box ${isError ? 'error' : ''}`;
    messageBox.classList.remove('hidden');
    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, 3000); // Hide after 3 seconds
}

// Generates a simple unique ID for orders
function generateOrderId() {
    return 'order_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

// --- Local Storage Functions for Checkout Page ---
function loadCartFromLocalStorage() {
    try {
        const storedCart = localStorage.getItem('pos-cart');
        if (storedCart) {
            cartItems = JSON.parse(storedCart);
        }
        const storedTotal = localStorage.getItem('pos-cart-total');
        if (storedTotal) {
            currentTotal = JSON.parse(storedTotal);
        }
    } catch (e) {
        console.error("Error loading cart from local storage:", e);
        showMessage("Error loading cart locally.", true);
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
        showMessage("Error loading previous orders locally for report.", true);
    }
}

function saveRecentOrdersToLocalStorage() {
    try {
        localStorage.setItem('pos-recent-orders', JSON.stringify(recentOrders));
    } catch (e) {
        console.error("Error saving recent orders to local storage:", e);
        showMessage("Error saving recent orders locally for report.", true);
    }
}

function clearCartInLocalStorage() {
    localStorage.removeItem('pos-cart');
    localStorage.removeItem('pos-cart-total');
}

// --- Render Functions ---

function renderCheckoutOrderSummary() {
    checkoutOrderSummary.innerHTML = '';
    if (cartItems.length === 0) {
        checkoutOrderSummary.innerHTML = '<p class="text-gray-500 text-center py-4">No items in cart.</p>';
        currentTotal = 0; // Reset total if cart is empty
    } else {
        cartItems.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = "flex justify-between text-gray-700";
            itemDiv.innerHTML = `
                <span>${item.name} (x${item.quantity})</span>
                <span>$${(item.quantity * item.price).toFixed(2)}</span>
            `;
            checkoutOrderSummary.appendChild(itemDiv);
        });
    }
    checkoutTotalSpan.textContent = `$${currentTotal.toFixed(2)}`;
}

// --- Core Logic Functions ---

function handleCustomerInfoChange(e) {
    const { name, value, type, checked } = e.target;
    if (type === 'radio') {
        customerInfo[name] = value;
    } else {
        customerInfo[name] = value;
    }
}

async function completeOrder() {
    // Basic validation for customer info
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone || !customerInfo.paymentMethod) {
        showMessage('Error: Please fill in all customer details and select a payment method.', true);
        return;
    }

    if (cartItems.length === 0) {
        showMessage('Error: Cart is empty. Please go back and add items.', true);
        return;
    }

    const orderData = {
        id: generateOrderId(), // Generate a unique ID for the order
        items: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            itemTotal: item.price * item.quantity,
        })),
        subtotal: currentTotal / (1 + 0), // Assuming TAX_RATE is 0, otherwise adjust
        tax: 0, // Assuming TAX_RATE is 0
        total: currentTotal,
        timestamp: new Date().toISOString(), // Use ISO string for consistent date storage
        placedBy: currentUserId,
        customer: customerInfo,
    };

    // --- Send order data to Google Apps Script ---
    try {
        showMessage('Sending order to Google Sheet...');
        const response = await fetch(GOOGLE_APPS_SCRIPT_WEB_APP_URL, {
            method: 'POST',
            mode: 'cors', // Required for cross-origin requests
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData),
        });

        const result = await response.json();

        if (result.success) {
            recentOrders.unshift(orderData); // Add to local array for current session's report
            saveRecentOrdersToLocalStorage(); // Persist recent orders
            clearCartInLocalStorage(); // Clear cart from local storage
            showMessage(`Order completed successfully! Order ID: ${orderData.id.substring(0,8)}...`);

            // Reset customer info form fields
            customerNameInput.value = '';
            customerEmailInput.value = '';
            customerPhoneInput.value = '';
            paymentMethodRadios.forEach(radio => radio.checked = false);
            customerInfo = { name: '', email: '', phone: '', paymentMethod: '' };

            // Redirect back to the main POS page
            window.location.href = 'index.html';
        } else {
            showMessage(`Error: ${result.error || 'Failed to record order in Google Sheet.'}`, true);
            console.error("Apps Script Error:", result.error);
        }
    } catch (e) {
        console.error("Network or Apps Script communication error:", e);
        showMessage(`Error: Could not connect to Google Sheet. ${e.message}`, true);
    }
}

// --- Event Listeners ---
customerNameInput.addEventListener('input', handleCustomerInfoChange);
customerEmailInput.addEventListener('input', handleCustomerInfoChange);
customerPhoneInput.addEventListener('input', handleCustomerInfoChange);
paymentMethodRadios.forEach(radio => {
    radio.addEventListener('change', handleCustomerInfoChange);
});
completeOrderBtn.addEventListener('click', completeOrder);
backToPosFromCheckoutBtn.addEventListener('click', () => {
    window.location.href = 'index.html'; // Go back to POS page
});

// --- Initialization ---

function initializeCheckoutPage() {
    loadCartFromLocalStorage(); // Load cart data from localStorage
    loadRecentOrdersFromLocalStorage(); // Load recent orders for potential future use or consistency
    renderCheckoutOrderSummary(); // Render the summary based on loaded cart
    console.log("Checkout Page Initialized!"); // Added for debugging
}

// Initial render on page load
window.onload = function() {
    initializeCheckoutPage();
};
