// ========== КОНФИГУРАЦИЯ ==========
// Выбери нужный сервер:
// - 'local' для работы с локальным сервером (http://127.0.0.1:8000)
// - 'remote' для работы с Railway (https://heavy-logic-api.up.railway.app)
const API_MODE = 'remote'; // поменяй на 'remote' при деплое

const API_BASE_URL = API_MODE === 'local' 
    ? 'http://127.0.0.1:8000' 
    : 'https://heavy-logic-api-production.up.railway.app';

// ========== ВСПЛЫВАЮЩЕЕ УВЕДОМЛЕНИЕ ==========
function showToast(message, duration = 2000) {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ========== РАБОТА С ТОВАРАМИ (API) ==========
let productCache = []; // кешируем товары, чтобы не дёргать API каждый раз

async function fetchProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        if (!response.ok) throw new Error('Ошибка загрузки товаров');
        productCache = await response.json();
        return productCache;
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        showToast('Не удалось загрузить каталог', 3000);
        return [];
    }
}

async function fetchProductById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/products/${id}`);
        if (!response.ok) throw new Error('Товар не найден');
        return await response.json();
    } catch (error) {
        console.error(`Ошибка загрузки товара ${id}:`, error);
        showToast('Товар не найден', 3000);
        return null;
    }
}

// ========== КОРЗИНА (localStorage) ==========
let cart = JSON.parse(localStorage.getItem('cart')) || [];

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    
    // Обновляем отображение, если мы на странице корзины
    if (window.location.pathname.includes('cart.html')) {
        renderCart();
    }
}

function updateCartCount() {
    const countSpan = document.getElementById('cart-count');
    if (countSpan) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        countSpan.textContent = totalItems;
    }
}

function addToCart(id, name, price) {
    const existingItem = cart.find(item => item.id == id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price, quantity: 1 });
    }
    saveCart();
    showToast(`✅ ${name} добавлен в корзину`);
}

function updateQuantity(index, newQuantity) {
    if (newQuantity < 1) {
        cart.splice(index, 1);
    } else {
        cart[index].quantity = newQuantity;
    }
    saveCart();
    if (window.location.pathname.includes('cart.html')) {
        renderCart();
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    if (window.location.pathname.includes('cart.html')) {
        renderCart();
    }
}

// ========== ОТРИСОВКА КОРЗИНЫ ==========
function renderCart() {
    const container = document.getElementById('cart-items-container');
    const totalSpan = document.getElementById('total-price');
    const totalDiv = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = '<p>Ваша корзина пуста.</p>';
        if (totalDiv) totalDiv.style.display = 'none';
        if (checkoutBtn) checkoutBtn.style.display = 'none';
        return;
    }

    let html = '';
    let total = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        html += `
            <div class="cart-item">
                <div style="flex: 2;">
                    <strong>${item.name}</strong> — ${item.price} ₽
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="quantity-control">
                        <button class="quantity-btn minus" data-index="${index}">–</button>
                        <input type="number" class="quantity-input" value="${item.quantity}" min="1" data-index="${index}">
                        <button class="quantity-btn plus" data-index="${index}">+</button>
                    </div>
                    <span style="min-width: 80px; text-align: right;">${itemTotal} ₽</span>
                    <button class="remove-from-cart" data-index="${index}">Удалить</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    
    // Обновляем итог
    const subtotalSpan = document.getElementById('subtotal-price');
    if (subtotalSpan) subtotalSpan.textContent = total;
    if (totalSpan) totalSpan.textContent = total;
    if (totalDiv) totalDiv.style.display = 'block';
    if (checkoutBtn) checkoutBtn.style.display = 'inline-block';

    // Обработчики кнопок
    document.querySelectorAll('.quantity-btn.minus').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = btn.dataset.index;
            updateQuantity(idx, cart[idx].quantity - 1);
        });
    });

    document.querySelectorAll('.quantity-btn.plus').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = btn.dataset.index;
            updateQuantity(idx, cart[idx].quantity + 1);
        });
    });

    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const idx = e.target.dataset.index;
            let newQty = parseInt(e.target.value);
            if (isNaN(newQty) || newQty < 1) newQty = 1;
            updateQuantity(idx, newQty);
        });
    });

    document.querySelectorAll('.remove-from-cart').forEach(btn => {
        btn.addEventListener('click', () => {
            removeFromCart(btn.dataset.index);
        });
    });
}

// ========== ОФОРМЛЕНИЕ ЗАКАЗА ==========
async function checkout() {
    if (cart.length === 0) return;
    
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    // Собираем данные покупателя (можно позже добавить модальное окно с формой)
    const customerName = prompt('Введите ваше имя:');
    if (!customerName) return;
    const customerEmail = prompt('Введите ваш email:');
    if (!customerEmail) return;
    const customerPhone = prompt('Введите ваш телефон:');
    if (!customerPhone) return;

    const orderData = {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
        })),
        total: total
    };

    try {
        showToast('Создаём заказ...');
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
        }
        
        const order = await response.json();
        cart = [];
        saveCart();
        showToast(`✅ Заказ №${order.id} оформлен! Мы свяжемся с вами.`, 4000);
        window.location.href = 'success.html';
    } catch (error) {
        console.error('Ошибка создания заказа:', error);
        showToast('❌ Не удалось оформить заказ', 4000);
    }
}

// ========== ОБРАБОТЧИКИ КНОПОК "В КОРЗИНУ" ==========
function handleAddToCart(e) {
    const btn = e.currentTarget;
    const id = btn.dataset.id;
    const name = btn.dataset.name;
    const price = btn.dataset.price;
    addToCart(id, name, price);
}

function attachCartListeners() {
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.removeEventListener('click', handleAddToCart);
        button.addEventListener('click', handleAddToCart);
    });
}

window.attachCartListeners = attachCartListeners;

// ========== ДИНАМИЧЕСКАЯ ЗАГРУЗКА ТОВАРОВ НА СТРАНИЦАХ ==========
async function renderProductCards(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const products = await fetchProducts();
    if (products.length === 0) {
        container.innerHTML = '<p>Товары временно недоступны.</p>';
        return;
    }

    let html = '';
    products.forEach(product => {
        html += `
            <div class="product-card">
                <h3><a href="product.html?id=${product.id}">${product.name}</a></h3>
                <p>${product.description || ''}</p>
                <div class="price">${product.price} ₽ ${product.old_price ? `<span class="old-price">${product.old_price} ₽</span>` : ''}</div>
                <button class="add-to-cart" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}">В корзину</button>
            </div>
        `;
    });
    container.innerHTML = html;
    attachCartListeners();
}

// ========== ДЕТАЛЬНАЯ СТРАНИЦА ТОВАРА ==========
async function loadProductDetail() {
    const container = document.getElementById('product-container');
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    if (!productId) {
        container.innerHTML = '<p>Товар не найден.</p>';
        return;
    }

    const product = await fetchProductById(productId);
    if (!product) {
        container.innerHTML = '<p>Товар не найден.</p>';
        return;
    }

    const featuresList = product.features.map(f => `<li>${f}</li>`).join('');
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px;" class="product-container-grid">
            <div>
                <img src="${product.image}" alt="${product.name}" style="width: 100%; border: 1.5px solid #000;">
            </div>
            <div>
                <h1>${product.name}</h1>
                <div class="price">${product.price} ₽ ${product.old_price ? `<span class="old-price">${product.old_price} ₽</span>` : ''}</div>
                <p>${product.description || ''}</p>
                <h3>Характеристики:</h3>
                <ul>${featuresList}</ul>
                <button class="add-to-cart btn" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" style="width: auto; padding: 12px 40px;">В корзину</button>
            </div>
        </div>
    `;
    attachCartListeners();
}

// ========== WEB3FORMS (если осталась форма) ==========
function initWeb3Forms() {
    const forms = document.querySelectorAll('#service-form, #subscribe-form');
    forms.forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            let resultDiv = document.getElementById('form-result');
            if (!resultDiv) {
                resultDiv = document.createElement('div');
                resultDiv.id = 'form-result';
                resultDiv.style.marginTop = '20px';
                form.insertAdjacentElement('afterend', resultDiv);
            }
            resultDiv.innerHTML = '<p style="color: #000; border: 1.5px solid #000; padding: 15px;">⏳ Отправка...</p>';
            try {
                const response = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (data.success) {
                    resultDiv.innerHTML = '<p style="background: #000; color: #fff; padding: 15px; border: 1.5px solid #000;">✅ Заявка отправлена!</p>';
                    form.reset();
                    showToast('✅ Заявка отправлена!');
                } else {
                    resultDiv.innerHTML = `<p style="color: #000; border: 1.5px solid #000; padding: 15px;">❌ Ошибка: ${data.message}</p>`;
                    showToast('❌ Ошибка отправки', 3000);
                }
            } catch (error) {
                resultDiv.innerHTML = '<p style="color: #000; border: 1.5px solid #000; padding: 15px;">❌ Ошибка соединения</p>';
                showToast('❌ Ошибка соединения', 3000);
            }
        });
    });
}

// ========== МАСКА ТЕЛЕФОНА ==========
function initPhoneMask() {
    const phoneInput = document.querySelector('input[name="phone"]');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            let formatted = '+7 (';
            if (value.length > 1) formatted += value.slice(1, 4);
            if (value.length >= 4) formatted += ') ' + value.slice(4, 7);
            if (value.length >= 7) formatted += '-' + value.slice(7, 9);
            if (value.length >= 9) formatted += '-' + value.slice(9, 11);
            e.target.value = formatted;
        });
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    attachCartListeners();
    initWeb3Forms();
    initPhoneMask();

    // Определяем текущую страницу
    const path = window.location.pathname;

    if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
        // На главной можем подгрузить популярные товары в блок (если нужно)
        const productGrid = document.querySelector('.product-grid');
        if (productGrid) {
            renderProductCards('.product-grid');
        }
    }

    if (path.includes('shop.html')) {
        renderProductCards('.product-grid');
    }

    if (path.includes('product.html')) {
        loadProductDetail();
    }

    if (path.includes('cart.html')) {
        renderCart();
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', checkout);
        }
    }
});