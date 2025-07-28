// No Firebase or Local Storage imports needed
// The previous Firebase imports were causing issues and are now removed.

// IMPORTANT: You MUST replace this with the Web App URL you get after deploying your Google Apps Script.
const GOOGLE_APPS_SCRIPT_WEB_APP_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE'; // Make sure to replace this!

// Global variables (no external dependencies for data persistence or auth)
let currentUserId = 'POS Operator'; // A simple identifier for the current session
let cartItems = [];
let recentOrders = []; // This will hold orders only for the current session's report
const TAX_RATE = 0.00; // No sales tax

// Product data
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

const posPage = document.getElementById('pos-page');
const checkoutPage = document.getElementById('checkout-page');
const reportPage = document.getElementById('report-page');

const poloProductsList = document.getElementById('polo-products-list');
const scrubProductsList = document.getElementById('scrub-products-list');
const flaskProductsList = document.getElementById('flask-products-list');
const cartItemsList = document.getElementById('cart-items-list');
const subtotalSpan = document.getElementById('subtotal');
const totalSpan = document.getElementById('total');

const proceedToCheckoutBtn = document.getElementById('proceed-to-checkout-btn');
const clearCartBtn = document.getElementById('clear-cart-btn');
const closeSessionBtn = document.getElementById('close-session-btn');

const customerNameInput = document.getElementById('customer-name');
const customerEmailInput = document.getElementById('customer-email');
const customerPhoneInput = document.getElementById('customer-phone');
const paymentMethodRadios = document.querySelectorAll('input[name="paymentMethod"]');
const checkoutOrderSummary = document.getElementById('checkout-order-summary');
const checkoutTotalSpan = document.getElementById('checkout-total');
const completeOrderBtn = document.getElementById('complete-order-btn');
const backToPosFromCheckoutBtn = document.getElementById('back-to-pos-from-checkout-btn');

const reportTableContainer = document.getElementById('report-table-container');
const backToPosFromReportBtn = document.getElementById('back-to-pos-from-report-btn');

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

function calculateTotals() {
    let newSubtotal = 0;
    cartItems.forEach(item => {
        newSubtotal += item.price * item.quantity;
    });
    const newTax = newSubtotal * TAX_RATE;
    const newTotal = newSubtotal + newTax;

    subtotalSpan.textContent = `$${newSubtotal.toFixed(2)}`;
    totalSpan.textContent = `$${newTotal.toFixed(2)}`;
    checkoutTotalSpan.textContent = `$${newTotal.toFixed(2)}`; // Update checkout total
    return { newSubtotal, newTax, newTotal };
}

function switchPage(pageId) {
    // Remove 'active' from all main page sections first
    posPage.classList.remove('active');
    checkoutPage.classList.remove('active');
    reportPage.classList.remove('active');

    // Add 'active' only to the requested page
    if (pageId === 'pos') {
        posPage.classList.add('active');
    } else if (pageId === 'checkout') {
        checkoutPage.classList.add('active');
        renderCheckoutOrderSummary();
    } else if (pageId === 'report') {
        reportPage.classList.add('active');
        renderReportTable();
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

function renderCheckoutOrderSummary() {
    checkoutOrderSummary.innerHTML = '';
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

function renderReportTable() {
    reportTableContainer.innerHTML = '';
    if (recentOrders.length === 0) {
        reportTableContainer.innerHTML = '<p class="text-gray-500 text-center py-8">No transactions recorded yet.</p>';
        return;
    }

    const tableHtml = `
        <table class="min-w-full bg-white rounded-lg shadow-sm">
            <thead class="bg-gray-200">
                <tr>
                    <th class="py-3 px-4 text-left text-sm font-semibold text-gray-700 uppercase rounded-tl-lg">Order ID</th>
                    <th class="py-3 px-4 text-left text-sm font-semibold text-gray-700 uppercase">Items</th>
                    <th class="py-3 px-4 text-left text-sm font-semibold text-gray-700 uppercase">Total</th>
                    <th class="py-3 px-4 text-left text-sm font-semibold text-gray-700 uppercase">Customer</th>
                    <th class="py-3 px-4 text-left text-sm font-semibold text-gray-700 uppercase">Payment</th>
                    <th class="py-3 px-4 text-left text-sm font-semibold text-gray-700 uppercase">Placed By</th>
                    <th class="py-3 px-4 text-left text-sm font-semibold text-gray-700 uppercase rounded-tr-lg">Timestamp</th>
                </tr>
            </thead>
            <tbody>
                ${recentOrders.map(order => `
                    <tr class="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                        <td class="py-3 px-4 text-sm text-gray-800 font-medium">${order.id.substring(0, 8)}...</td>
                        <td class="py-3 px-4 text-sm text-gray-700">
                            <ul class="list-disc list-inside">
                                ${order.items.map(item => `<li>${item.name} (x${item.quantity})</li>`).join('')}
                            </ul>
                        </td>
                        <td class="py-3 px-4 text-sm text-gray-800 font-semibold">$${order.total.toFixed(2)}</td>
                        <td class="py-3 px-4 text-sm text-gray-600">
                            ${order.customer?.name || 'N/A'} <br/>
                            <span class="text-xs">${order.customer?.email || ''}</span> <br/>
                            <span class="text-xs">${order.customer?.phone || ''}</span>
                        </td>
                        <td class="py-3 px-4 text-sm text-gray-600">${order.customer?.paymentMethod || 'N/A'}</td>
                        <td class="py-3 px-4 text-sm text-gray-600">${order.placedBy || 'N/A'}</td>
                        <td class="py-3 px-4 text-sm text-gray-600">${new Date(order.timestamp).toLocaleString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    reportTableContainer.innerHTML = tableHtml;
}

// --- Order ID Generator ---
// Generates a simple unique ID for orders
function generateOrderId() {
    return 'order_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
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
}

function removeFromCart(index) {
    if (index > -1 && index < cartItems.length) {
        const removedItem = cartItems.splice(index, 1);
        showMessage(`${removedItem[0].name} removed from cart.`);
        renderCartItems();
    }
}

function clearCart() {
    cartItems = [];
    showMessage('Cart cleared.');
    renderCartItems();
}

function initiateCheckout() {
    if (cartItems.length === 0) {
        showMessage('Your cart is empty. Please add items before proceeding to checkout.', true);
        return;
    }
    showMessage('Proceeding to checkout...');
    switchPage('checkout');
}

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

    const { newSubtotal, newTax, newTotal } = calculateTotals(); // Recalculate just before saving

    const orderData = {
        id: generateOrderId(), // Generate a unique ID for the order
        items: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            itemTotal: item.price * item.quantity,
        })),
        subtotal: newSubtotal,
        tax: newTax,
        total: newTotal,
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
            showMessage(`Order completed successfully! Order ID: ${orderData.id.substring(0,8)}...`);
            clearCart();
            customerInfo = { name: '', email: '', phone: '', paymentMethod: '' }; // Reset customer info
            customerNameInput.value = '';
            customerEmailInput.value = '';
            customerPhoneInput.value = '';
            paymentMethodRadios.forEach(radio => radio.checked = false);
            switchPage('pos');
        } else {
            showMessage(`Error: ${result.error || 'Failed to record order in Google Sheet.'}`, true);
            console.error("Apps Script Error:", result.error);
        }
    } catch (e) {
        console.error("Network or Apps Script communication error:", e);
        showMessage(`Error: Could not connect to Google Sheet. ${e.message}`, true);
    }
}

function closeSession() {
    clearCart(); // Clear current cart
    showMessage('Session closed. Displaying transaction report.');
    switchPage('report'); // Navigate to the report page
}

// --- Event Listeners ---
proceedToCheckoutBtn.addEventListener('click', initiateCheckout);
clearCartBtn.addEventListener('click', clearCart);
closeSessionBtn.addEventListener('click', closeSession);

customerNameInput.addEventListener('input', handleCustomerInfoChange);
customerEmailInput.addEventListener('input', handleCustomerInfoChange);
customerPhoneInput.addEventListener('input', handleCustomerInfoChange);
paymentMethodRadios.forEach(radio => {
    radio.addEventListener('change', handleCustomerInfoChange);
});
completeOrderBtn.addEventListener('click', completeOrder);
backToPosFromCheckoutBtn.addEventListener('click', () => switchPage('pos'));
backToPosFromReportBtn.addEventListener('click', () => switchPage('pos'));

// --- Initialization ---

function initializePOS() {
    userIdSpan.textContent = currentUserId; // Display "POS Operator"
    // No loading from local storage as data will be sent to Google Sheet
    renderProductList(poloProducts, poloProductsList);
    renderProductList(scrubProducts, scrubProductsList);
    renderProductList(flaskProducts, flaskProductsList);
    renderCartItems();
    console.log("POS System Initialized!"); // Added for debugging
}

// Initial render on page load
window.onload = function() {
    initializePOS();
};
