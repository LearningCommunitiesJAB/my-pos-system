// This script handles the transaction report page logic.

let recentOrders = []; // This will be loaded from localStorage

// DOM Elements
const messageBox = document.getElementById('message-box');
const reportTableContainer = document.getElementById('report-table-container');
const backToPosFromReportBtn = document.getElementById('back-to-pos-from-report-btn');
const reportDateSpan = document.getElementById('report-date');

// --- Utility Functions ---

function showMessage(msg, isError = false) {
    messageBox.textContent = msg;
    messageBox.className = `message-box ${isError ? 'error' : ''}`;
    messageBox.classList.remove('hidden');
    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, 3000); // Hide after 3 seconds
}

// --- Local Storage Functions for Report Page ---
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

function renderReportTable() {
    reportTableContainer.innerHTML = ''; // Clear previous content

    if (recentOrders.length === 0) {
        reportTableContainer.innerHTML = '<p class="text-gray-500 text-center py-8">No transactions recorded yet.</p>';
        return;
    }

    const tableHtml = `
        <table class="min-w-full bg-white rounded-lg shadow-sm">
            <thead class="bg-[#E9ECEF]">
                <tr>
                    <th class="py-3 px-4 text-left text-sm font-semibold text-[#073B4C] uppercase rounded-tl-lg">Date & Time</th>
                    <th class="py-3 px-4 text-left text-sm font-semibold text-[#073B4C] uppercase">Items Sold</th>
                    <th class="py-3 px-4 text-left text-sm font-semibold text-[#073B4C] uppercase">Payment Method</th>
                    <th class="py-3 px-4 text-left text-sm font-semibold text-[#073B4C] uppercase">Customer Name</th>
                    <th class="py-3 px-4 text-left text-sm font-semibold text-[#073B4C] uppercase">Customer Email</th>
                    <th class="py-3 px-4 text-left text-sm font-semibold text-[#073B4C] uppercase rounded-tr-lg">Customer Phone</th>
                </tr>
            </thead>
            <tbody>
                ${recentOrders.map(order => `
                    <tr class="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                        <td class="py-3 px-4 text-sm text-gray-800 font-medium">${new Date(order.timestamp).toLocaleString()}</td>
                        <td class="py-3 px-4 text-sm text-gray-700">
                            <ul class="list-disc list-inside space-y-1">
                                ${order.items.map(item => `<li>${item.name} (x${item.quantity})</li>`).join('')}
                            </ul>
                        </td>
                        <td class="py-3 px-4 text-sm text-gray-600">${order.customer?.paymentMethod || 'N/A'}</td>
                        <td class="py-3 px-4 text-sm text-gray-600">${order.customer?.name || 'N/A'}</td>
                        <td class="py-3 px-4 text-sm text-gray-600">${order.customer?.email || ''}</td>
                        <td class="py-3 px-4 text-sm text-gray-600">${order.customer?.phone || ''}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    reportTableContainer.innerHTML = tableHtml;
}

// --- Event Listeners ---
backToPosFromReportBtn.addEventListener('click', () => {
    window.location.href = 'index.html'; // Go back to POS page
});

// --- Initialization ---

function initializeReportPage() {
    loadRecentOrdersFromLocalStorage(); // Load recent orders on page load
    renderReportTable(); // Render the report
    reportDateSpan.textContent = new Date().toLocaleDateString(); // Set the current date in the footer
    console.log("Report Page Initialized!"); // Added for debugging
}

// Initial render on page load
window.onload = function() {
    initializeReportPage();
};
