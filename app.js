// Firebase configuration
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
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM Elements
const productList = document.getElementById('productList');
const saleItems = document.getElementById('saleItems');
const totalAmount = document.getElementById('totalAmount');
const completeSaleBtn = document.getElementById('completeSale');
const searchInput = document.getElementById('searchInput');
const amountGivenInput = document.getElementById('amountGiven');
const changeAmountSpan = document.getElementById('changeAmount');
const paymentMethodInputs = document.querySelectorAll('input[name="paymentMethod"]');
const cashPaymentDiv = document.getElementById('cashPayment');

// Current sale items and products list
let currentSale = [];
let allProducts = [];

// Filter products based on search term
function filterProducts(products, searchTerm = '') {
    if (!searchTerm.trim()) return products;
    
    const term = searchTerm.toLowerCase();
    return products.filter(product => 
        product.name.toLowerCase().includes(term) ||
        (product.category && product.category.toLowerCase().includes(term))
    );
}

// Display products in the UI
function displayProducts(products) {
    productList.innerHTML = ''; // Clear current list
    
    if (products.length === 0) {
        productList.innerHTML = '<p>No se encontraron productos</p>';
        return;
    }
    
    products.forEach(product => {
        const productElement = createProductElement(product);
        productList.appendChild(productElement);
    });
}

// Handle search input
function handleSearch() {
    const searchTerm = searchInput.value.trim();
    const filteredProducts = filterProducts(allProducts, searchTerm);
    displayProducts(filteredProducts);
}

// Load products from Firebase
function loadProducts() {
    const userId = 'fLkZ5tugD0WfLzgfaYyF4XKNUfy1'; // User ID from the products path
    const productsRef = database.ref(`products/${userId}`);
    
    productsRef.on('value', (snapshot) => {
        allProducts = []; // Reset the products array
        const products = snapshot.val();
        
        if (products) {
            Object.entries(products).forEach(([key, product]) => {
                if (product.stock > 0 && product.isAvailable) { // Only show available products with stock
                    allProducts.push({ 
                        id: key, 
                        name: product.name, 
                        price: product.price, 
                        stock: product.stock,
                        category: product.category || ''
                    });
                }
            });
            
            // Display all products initially
            displayProducts(allProducts);
        } else {
            productList.innerHTML = '<p>No hay productos disponibles</p>';
        }
    });
}

// Create product element
function createProductElement(product) {
    const div = document.createElement('div');
    div.className = 'product-card';
    div.setAttribute('data-id', product.id);
    div.innerHTML = `
        <h3>${product.name}</h3>
        <p>Precio: $${product.price.toFixed(2)}</p>
        <p>Stock: ${product.stock}</p>
        <button class="btn btn-primary" onclick="addToSale('${product.id}', '${product.name}', ${product.price}, ${product.stock})">
            Agregar
        </button>
    `;
    return div;
}

// Add product to sale
function addToSale(productId, productName, price, stock) {
    // Check if product is already in the sale
    const existingItemIndex = currentSale.findIndex(item => item.id === productId);
    
    if (existingItemIndex >= 0) {
        // Update quantity if product is already in the sale
        if (currentSale[existingItemIndex].quantity < stock) {
            currentSale[existingItemIndex].quantity += 1;
        } else {
            alert('No hay suficiente stock disponible');
            return;
        }
    } else {
        // Add new product to sale
        currentSale.push({
            id: productId,
            name: productName,
            price: price,
            quantity: 1,
            stock: stock
        });
    }
    
    updateSaleDisplay();
}

// Update sale display
function updateSaleDisplay() {
    saleItems.innerHTML = '';
    let total = 0;
    
    currentSale.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'sale-item';
        itemElement.innerHTML = `
            <div class="sale-item-details">
                <h4>${item.name}</h4>
                <p>$${item.price.toFixed(2)} x ${item.quantity} = $${itemTotal.toFixed(2)}</p>
            </div>
            <div class="sale-item-actions">
                <button class="btn btn-sm" onclick="updateQuantity(${index}, ${item.quantity - 1})" ${item.quantity <= 1 ? 'disabled' : ''}>
                    -
                </button>
                <span>${item.quantity}</span>
                <button class="btn btn-sm" onclick="updateQuantity(${index}, ${item.quantity + 1})" ${item.quantity >= item.stock ? 'disabled' : ''}>
                    +
                </button>
                <button class="btn btn-sm btn-danger" onclick="removeFromSale(${index})">
                    ×
                </button>
            </div>
        `;
        
        saleItems.appendChild(itemElement);
    });
    
    totalAmount.textContent = total.toFixed(2);
    
    // Recalculate change when sale total changes
    calculateChange();
}

// Update product quantity in sale
function updateQuantity(index, newQuantity) {
    if (newQuantity < 1) {
        removeFromSale(index);
        return;
    }
    
    if (newQuantity > currentSale[index].stock) {
        alert('No hay suficiente stock disponible');
        return;
    }
    
    currentSale[index].quantity = newQuantity;
    updateSaleDisplay();
}

// Remove product from sale
function removeFromSale(index) {
    currentSale.splice(index, 1);
    updateSaleDisplay();
}

/**
 * Ensures all sales records have consistent structure and data types
 * @param {Object} saleData - The sale data to normalize
 * @returns {Object} Normalized sale data
 */
function normalizeSaleData(saleData) {
    // Ensure all required fields exist with proper types
    const now = Date.now();
    const items = (saleData.items || []).map(item => ({
        name: String(item.name || ''),
        price: parseFloat(item.price) || 0,
        productId: String(item.productId || ''),
        quantity: parseInt(item.quantity) || 1,
        subtotal: (parseFloat(item.subtotal) || 0).toFixed(2)
    }));

    // Calculate subtotal if not provided
    const subtotal = saleData.subtotal !== undefined 
        ? parseFloat(saleData.subtotal) 
        : items.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);

    // Calculate total if not provided
    const total = saleData.total !== undefined 
        ? parseFloat(saleData.total)
        : subtotal - (saleData.discount || 0);

    return {
        id: String(saleData.id || ''),
        createdAt: parseInt(saleData.createdAt) || now,
        discount: parseFloat(saleData.discount) || 0,
        discountType: String(saleData.discountType || 'percentage'),
        items: items,
        paymentMethod: String(saleData.paymentMethod || 'Efectivo'),
        subtotal: parseFloat(subtotal.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        updatedAt: parseInt(saleData.updatedAt) || now
    };
}

// Calculate change based on amount given and total
function calculateChange() {
    if (!cashPaymentDiv.style.display || cashPaymentDiv.style.display === 'none') {
        return;
    }
    
    const total = parseFloat(totalAmount.textContent) || 0;
    const amountGiven = parseFloat(amountGivenInput.value) || 0;
    const change = Math.max(0, (amountGiven - total).toFixed(2));
    
    if (amountGiven >= total) {
        changeAmountSpan.textContent = `$${change}`;
        changeAmountSpan.style.color = '#2ecc71'; // Green color for positive change
    } else {
        const remaining = (total - amountGiven).toFixed(2);
        changeAmountSpan.textContent = `-$${remaining}`;
        changeAmountSpan.style.color = '#e74c3c'; // Red color for amount still due
    }
}

// Update payment method UI
function updatePaymentMethod() {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    
    if (paymentMethod === 'efectivo') {
        cashPaymentDiv.style.display = 'block';
        amountGivenInput.focus();
    } else {
        cashPaymentDiv.style.display = 'none';
    }
    
    // Recalculate change when payment method changes
    calculateChange();
}

// Complete sale
function completeSale() {
    if (currentSale.length === 0) {
        alert('No hay productos en la venta');
        return;
    }
    
    const total = parseFloat(totalAmount.textContent);
    const now = new Date();
    const saleId = now.getTime().toString();
    
    // Get the selected payment method
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    const amountGiven = parseFloat(amountGivenInput.value) || 0;
    const change = paymentMethod === 'efectivo' ? Math.max(0, (amountGiven - total).toFixed(2)) : 0;
    
    // Validate cash payment
    if (paymentMethod === 'efectivo' && (isNaN(amountGiven) || amountGiven < total)) {
        alert('La cantidad recibida debe ser mayor o igual al total');
        return;
    }
    
    const saleData = {
        id: saleId,
        date: now.toISOString(),
        items: currentSale.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
        })),
        total: total,
        paymentMethod: paymentMethod,
        amountGiven: paymentMethod === 'efectivo' ? parseFloat(amountGiven.toFixed(2)) : total,
        change: parseFloat(change),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    const userId = 'fLkZ5tugD0WfLzgfaYyF4XKNUfy1'; // Same user ID as in loadProducts
    const salesRef = database.ref(`sales/${userId}/${saleId}`);
    
    // Save sale to Firebase
    salesRef.set(saleData)
        .then(() => {
            // Update product stock in Firebase
            const updates = {};
            currentSale.forEach(item => {
                updates[`products/${userId}/${item.id}/stock`] = item.stock - item.quantity;
            });
            
            return database.ref().update(updates);
        })
        .then(() => {
            // Show success message with sale details
            const paymentDetails = paymentMethod === 'efectivo' 
                ? `Pago en efectivo. Recibido: $${amountGiven.toFixed(2)}, Cambio: $${change}`
                : 'Pago con tarjeta';
            
            alert(`Venta completada exitosamente!\nTotal: $${total.toFixed(2)}\n${paymentDetails}`);
            
            // Reset the sale
            currentSale = [];
            updateSaleDisplay();
            amountGivenInput.value = '';
            changeAmountSpan.textContent = '$0.00';
            
            // Reset to cash payment by default
            document.querySelector('input[value="efectivo"]').checked = true;
            updatePaymentMethod();
        })
        .catch(error => {
            console.error('Error al completar la venta:', error);
            alert('Ocurrió un error al completar la venta. Por favor, inténtalo de nuevo.');
        });
}

/**
 * Helper function to safely read sales data with consistent structure
 * @param {Object} snapshot - Firebase data snapshot
 * @returns {Array} Array of normalized sales
 */
function getNormalizedSales(snapshot) {
    const sales = [];
    snapshot.forEach(childSnapshot => {
        const sale = childSnapshot.val();
        sales.push(normalizeSaleData({
            ...sale,
            id: childSnapshot.key // Ensure ID is always set
        }));
    });
    return sales;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    completeSaleBtn.addEventListener('click', completeSale);
    searchInput.addEventListener('input', handleSearch);
    
    // Add event listeners for payment method changes
    paymentMethodInputs.forEach(input => {
        input.addEventListener('change', updatePaymentMethod);
    });
    
    // Add event listener for amount given input
    amountGivenInput.addEventListener('input', calculateChange);
});
