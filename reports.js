// Firebase configuration (same as in app.js)
const firebaseConfig = {
    apiKey: "AIzaSyCR7Z_Z-iizQh5MN3Al1GtrjuU5G4GZYXs",
    authDomain: "finansas-mvapq7.firebaseapp.com",
    databaseURL: "https://finansas-mvapq7-default-rtdb.firebaseio.com",
    projectId: "finansas-mvapq7",
    storageBucket: "finansas-mvapq7.firebasestorage.app",
    messagingSenderId: "518436904271",
    appId: "1:518436904271:web:5264f3bbafd850e594b93a",
    measurementId: "G-R3271ETLQW"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig, 'ReportsApp'); // Use a different name to avoid conflicts
const database = app.database();

// DOM Elements
const dateFromInput = document.getElementById('dateFrom');
const dateToInput = document.getElementById('dateTo');
const applyFiltersBtn = document.getElementById('applyFilters');
const resetFiltersBtn = document.getElementById('resetFilters');
const totalSalesElement = document.getElementById('totalSales');
const cashSalesElement = document.getElementById('cashSales');
const cardSalesElement = document.getElementById('cardSales');
const recentSalesBody = document.getElementById('recentSalesBody');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const currentPageSpan = document.getElementById('currentPage');
const totalPagesSpan = document.getElementById('totalPages');
let salesChart = null;

// Pagination state
let currentPage = 1;
let itemsPerPage = 10;
let allSales = [];

// Parse date safely
const parseDate = (dateString) => {
    // If it's already a date object, return it
    if (dateString instanceof Date) {
        return isNaN(dateString.getTime()) ? null : dateString;
    }
    
    // If it's a timestamp (number), convert to date
    if (typeof dateString === 'number') {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? null : date;
    }
    
    // If it's a string, try to parse it
    if (typeof dateString === 'string') {
        // Try ISO format first
        let date = new Date(dateString);
        if (!isNaN(date.getTime())) return date;
        
        // Try common date formats
        const formats = [
            'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD',
            'MM-DD-YYYY', 'DD-MM-YYYY', 'YYYY/MM/DD'
        ];
        
        for (const format of formats) {
            const parts = dateString.split(/[\/\-]/);
            if (parts.length === 3) {
                let year, month, day;
                
                if (format === 'MM/DD/YYYY' || format === 'MM-DD-YYYY') {
                    month = parseInt(parts[0], 10) - 1;
                    day = parseInt(parts[1], 10);
                    year = parseInt(parts[2], 10);
                } else if (format === 'DD/MM/YYYY' || format === 'DD-MM-YYYY') {
                    day = parseInt(parts[0], 10);
                    month = parseInt(parts[1], 10) - 1;
                    year = parseInt(parts[2], 10);
                } else if (format === 'YYYY-MM-DD' || format === 'YYYY/MM/DD') {
                    year = parseInt(parts[0], 10);
                    month = parseInt(parts[1], 10) - 1;
                    day = parseInt(parts[2], 10);
                }
                
                if (year && month >= 0 && day) {
                    date = new Date(year, month, day);
                    if (!isNaN(date.getTime())) return date;
                }
            }
        }
    }
    
    return null; // Return null if date is invalid
};

// Format date to YYYY-MM-DD
const formatDate = (date) => {
    if (!date) return '';
    const d = parseDate(date);
    if (!d) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Format date for display
const formatDateForDisplay = (date) => {
    if (!date || isNaN(date.getTime())) return 'Fecha inválida';
    return date.toLocaleDateString('es-MX');
};

// Format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0);
};

// Load sales data
const loadSalesData = (startDate = null, endDate = null) => {
    const userId = 'fLkZ5tugD0WfLzgfaYyF4XKNUfy1';
    const salesRef = database.ref(`sales/${userId}`);
    
    salesRef.once('value')
        .then((snapshot) => {
            const salesData = [];
            let totalSales = 0;
            let cashSales = 0;
            let cardSales = 0;
            const salesByDay = {};
            let totalProcessed = 0;
            
            if (!snapshot.exists()) {
                console.log('No sales data found');
                updateUI([], {}, 0, 0, 0);
                return;
            }
            
            snapshot.forEach((childSnapshot) => {
                try {
                    const sale = childSnapshot.val();
                    totalProcessed++;
                    
                    if (!sale || typeof sale.timestamp === 'undefined') {
                        console.warn('Sale missing timestamp:', childSnapshot.key);
                        return;
                    }
                    
                    const saleDate = new Date(sale.timestamp);
                    if (isNaN(saleDate.getTime())) {
                        console.warn('Invalid timestamp:', sale.timestamp);
                        return;
                    }
                    
                    // Check if we need to filter by date
                    const shouldInclude = !startDate || !endDate || 
                                        (saleDate >= startDate && saleDate <= endDate);
                    
                    if (shouldInclude) {
                        const saleDay = saleDate.toISOString().split('T')[0];
                        const saleAmount = parseFloat(sale.total) || 0;
                        
                        // Update totals
                        totalSales += saleAmount;
                        if (sale.paymentMethod === 'efectivo') {
                            cashSales += saleAmount;
                        } else {
                            cardSales += saleAmount;
                        }
                        
                        // Group by day for chart
                        if (!salesByDay[saleDay]) {
                            salesByDay[saleDay] = 0;
                        }
                        salesByDay[saleDay] += saleAmount;
                        
                        // Add to recent sales
                        salesData.push({
                            id: childSnapshot.key,
                            ...sale,
                            date: saleDate
                        });
                    }
                } catch (error) {
                    console.error('Error processing sale:', error, childSnapshot.key);
                }
            });
            
            console.log(`Processed ${totalProcessed} sales`);
            updateUI(salesData, salesByDay, totalSales, cashSales, cardSales);
        })
        .catch(error => {
            console.error('Error loading sales:', error);
            alert('Error al cargar las ventas. Por favor, intente de nuevo.');
        });
};

// Update UI with sales data
const updateUI = (salesData, salesByDay, totalSales, cashSales, cardSales) => {
    // Update summary cards
    totalSalesElement.textContent = formatCurrency(totalSales);
    cashSalesElement.textContent = formatCurrency(cashSales);
    cardSalesElement.textContent = formatCurrency(cardSales);
    
    // Update chart
    updateSalesChart(salesByDay);
    
    // Update recent sales table
    updateRecentSales(salesData);
};

// Update sales chart
const updateSalesChart = (salesByDay) => {
    const ctx = document.getElementById('salesChart').getContext('2d');
    const dates = Object.keys(salesByDay).sort();
    const amounts = dates.map(date => salesByDay[date]);
    
    if (salesChart) {
        salesChart.destroy();
    }
    
    salesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates.map(date => new Date(date).toLocaleDateString('es-MX')),
            datasets: [{
                label: 'Ventas por Día',
                data: amounts,
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value).replace('MXN', '').trim();
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.raw);
                        }
                    }
                }
            }
        }
    });
};

// Update recent sales table with pagination
const updateRecentSales = (sales) => {
    allSales = sales.sort((a, b) => b.date - a.date);
    const totalPages = Math.ceil(allSales.length / itemsPerPage);
    currentPageSpan.textContent = currentPage;
    totalPagesSpan.textContent = totalPages;
    
    // Update pagination buttons
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
    
    recentSalesBody.innerHTML = '';
    
    if (allSales.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5" class="no-data">No hay ventas en el período seleccionado</td>';
        recentSalesBody.appendChild(row);
        return;
    }
    
    // Calculate page slice
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageSales = allSales.slice(startIndex, endIndex);
    
    pageSales.forEach(sale => {
        const row = document.createElement('tr');
        const saleDate = new Date(sale.timestamp);
        
        row.innerHTML = `
            <td>${saleDate.toLocaleDateString('es-MX')}</td>
            <td>${saleDate.toLocaleTimeString('es-MX')}</td>
            <td>${formatCurrency(sale.total)}</td>
            <td>${sale.paymentMethod === 'efectivo' ? 'Efectivo' : 'Tarjeta'}</td>
            <td class="action-buttons">
                <button class="edit-btn" data-sale-id="${sale.id}">
                    Editar
                </button>
                <button class="delete-btn" data-sale-id="${sale.id}">
                    Eliminar
                </button>
            </td>
        `;
        
        // Add event listeners for edit and delete buttons
        row.querySelector('.edit-btn').addEventListener('click', () => openEditModal(sale));
        row.querySelector('.delete-btn').addEventListener('click', () => deleteSale(sale.id));
        
        recentSalesBody.appendChild(row);
    });
};

// Edit sale modal functions
const openEditModal = (sale) => {
    const modal = document.getElementById('editSaleModal');
    const totalInput = document.getElementById('editTotal');
    const paymentMethodSelect = document.getElementById('editPaymentMethod');
    
    totalInput.value = sale.total;
    paymentMethodSelect.value = sale.paymentMethod;
    
    modal.style.display = 'block';
    modal.dataset.saleId = sale.id;
    
    document.getElementById('editSaleForm').onsubmit = (e) => {
        e.preventDefault();
        updateSale(sale.id, {
            total: parseFloat(totalInput.value),
            paymentMethod: paymentMethodSelect.value
        });
    };
};

const closeEditModal = () => {
    document.getElementById('editSaleModal').style.display = 'none';
};

// Update sale in Firebase
const updateSale = (saleId, updates) => {
    const userId = 'fLkZ5tugD0WfLzgfaYyF4XKNUfy1';
    const saleRef = database.ref(`sales/${userId}/${saleId}`);
    
    saleRef.update(updates)
        .then(() => {
            closeEditModal();
            loadSalesData(dateFromInput.value ? new Date(dateFromInput.value) : null,
                         dateToInput.value ? new Date(dateToInput.value) : null);
        })
        .catch(error => {
            console.error('Error updating sale:', error);
            alert('Error al actualizar la venta. Por favor, intente de nuevo.');
        });
};

// Delete sale from Firebase
const deleteSale = (saleId) => {
    if (!confirm('¿Está seguro de que desea eliminar esta venta? Esta acción no se puede deshacer.')) {
        return;
    }
    
    const userId = 'fLkZ5tugD0WfLzgfaYyF4XKNUfy1';
    const saleRef = database.ref(`sales/${userId}/${saleId}`);
    
    saleRef.remove()
        .then(() => {
            loadSalesData(dateFromInput.value ? new Date(dateFromInput.value) : null,
                         dateToInput.value ? new Date(dateToInput.value) : null);
        })
        .catch(error => {
            console.error('Error deleting sale:', error);
            alert('Error al eliminar la venta. Por favor, intente de nuevo.');
        });
};

// Initialize the reports page
const initReportsPage = () => {
    console.log('Initializing reports page...');
    
    // Set default date inputs to empty (show all)
    dateFromInput.value = '';
    dateToInput.value = '';
    currentPage = 1;
    
    // Event listeners
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updateRecentSales(allSales);
        }
    });
    
    nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(allSales.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            updateRecentSales(allSales);
        }
    });
    
    // Window click event for modal
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('editSaleModal');
        if (event.target === modal) {
            closeEditModal();
        }
    });
    
    applyFiltersBtn.addEventListener('click', () => {
        console.log('Apply filters clicked');
        
        // If no dates are selected, show all sales
        if (!dateFromInput.value && !dateToInput.value) {
            loadSalesData();
            return;
        }
        
        // If only one date is provided, use it for both start and end
        const startDate = dateFromInput.value ? new Date(dateFromInput.value) : null;
        const endDate = dateToInput.value ? new Date(dateToInput.value) : null;
        
        if (startDate) startDate.setHours(0, 0, 0, 0);
        if (endDate) endDate.setHours(23, 59, 59, 999);
        
        if (startDate && endDate && startDate > endDate) {
            alert('La fecha de inicio no puede ser mayor a la fecha final');
            return;
        }
        
        console.log('Loading filtered sales data...');
        loadSalesData(startDate, endDate);
    });
    
    resetFiltersBtn.addEventListener('click', () => {
        console.log('Reset filters clicked');
        dateFromInput.value = '';
        dateToInput.value = '';
        loadSalesData(); // Reload all sales
    });
    
    // Load all sales by default
    console.log('Loading all sales data...');
    loadSalesData();
    
    // Add loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loadingIndicator';
    loadingIndicator.style.display = 'none';
    loadingIndicator.textContent = 'Cargando datos...';
    document.querySelector('.container').insertBefore(loadingIndicator, document.querySelector('.filters').nextSibling);
};

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', initReportsPage);
