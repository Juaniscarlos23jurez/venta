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

// Complete sale
function completeSale() {
    if (currentSale.length === 0) {
        alert('No hay productos en la venta');
        return;
    }
    
    if (!confirm('¿Confirmar venta?')) {
        return;
    }
    
    const userId = 'fLkZ5tugD0WfLzgfaYyF4XKNUfy1';
    const saleRef = database.ref(`sales/${userId}`).push();
    const saleId = saleRef.key;
    const now = Date.now();
    
    // Create initial sale data
    const saleData = {
        id: saleId,
        createdAt: now,
        discount: 0,
        discountType: 'percentage',
        items: currentSale.map(item => ({
            name: item.name,
            price: parseFloat(item.price),
            productId: item.id,
            quantity: parseInt(item.quantity),
            subtotal: (parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)
        })),
        paymentMethod: 'Efectivo',
        updatedAt: now
    };
    
    // Calculate totals
    saleData.subtotal = saleData.items.reduce((sum, item) => 
        sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
    saleData.total = saleData.subtotal - saleData.discount;
    
    // Normalize the sale data to ensure consistency
    const normalizedSaleData = normalizeSaleData(saleData);
    
    // Save sale
    saleRef.set(normalizedSaleData)
        .then(() => {
            // Update product stock
            const updates = {};
            currentSale.forEach(item => {
                const productPath = `products/${userId}/${item.id}`;
                updates[`${productPath}/stock`] = firebase.database.ServerValue.increment(-item.quantity);
                updates[`${productPath}/updatedAt`] = now;
            });
            
            return database.ref().update(updates);
        })
        .then(() => {
            alert('Venta completada con éxito');
            currentSale = [];
            updateSaleDisplay();
            searchInput.value = '';
            loadProducts();
        })
        .catch(error => {
            console.error('Error al completar la venta:', error);
            alert('Error al completar la venta. Por favor, intente nuevamente.');
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
});
