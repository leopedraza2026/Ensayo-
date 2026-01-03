// app.js — lógica del restaurante (no requiere servidor)
// Guarda datos en localStorage para persistencia local

const STORAGE_KEYS = {
  MENU: 'mi_restaurante_menu_v1',
  CART: 'mi_restaurante_cart_v1',
  ORDERS: 'mi_restaurante_orders_v1'
};

const defaultMenu = [
  { id: 'm1', name: 'Hamburguesa clásica', desc: 'Carne, queso, lechuga y tomate', price: 7.50, category: 'Principal', emoji: '🍔' },
  { id: 'm2', name: 'Pizza Margarita', desc: 'Salsa, queso y albahaca', price: 8.90, category: 'Principal', emoji: '🍕' },
  { id: 'm3', name: 'Ensalada César', desc: 'Lechuga, pollo y aderezo César', price: 6.20, category: 'Ensaladas', emoji: '🥗' },
  { id: 'm4', name: 'Patatas fritas', desc: 'Crujientes', price: 3.00, category: 'Aperitivos', emoji: '🍟' },
  { id: 'm5', name: 'Sopa del día', desc: 'Calentita y casera', price: 4.50, category: 'Entrantes', emoji: '🍲' },
  { id: 'm6', name: 'Brownie con helado', desc: 'Postre dulce', price: 3.80, category: 'Postres', emoji: '🍫' }
];

// Utils
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const format = v => '$' + v.toFixed(2);

// State
let menu = load(STORAGE_KEYS.MENU) || defaultMenu.slice();
let cart = load(STORAGE_KEYS.CART) || []; // [{id, qty}]
save(STORAGE_KEYS.MENU, menu); // ensure saved

// Elements
const menuEl = $('#menu');
const cartCountEl = $('#cart-count');
const cartPanel = $('#cart-panel');
const cartItemsEl = $('#cart-items');
const cartSubtotalEl = $('#cart-subtotal');
const openCartBtn = $('#open-cart');
const closeCartBtn = $('#close-cart');
const cartCount = () => cart.reduce((s,i)=>s+i.qty,0);

const searchInput = $('#search');
const categoryFilter = $('#category-filter');
const sortSelect = $('#sort');

const addDishForm = $('#add-dish-form');
const toggleAdminBtn = $('#toggle-admin');
const adminPanel = $('#admin');
const resetSampleBtn = $('#reset-sample');

const checkoutForm = $('#checkout-form');
const orderMessage = $('#order-message');
const yearEl = $('#year');

// Initialize
document.addEventListener('DOMContentLoaded', init);

function init(){
  yearEl.textContent = new Date().getFullYear();
  populateCategoryFilter();
  renderMenu();
  renderCart();
  attachListeners();
  updateCartCountUI();
}

function attachListeners(){
  openCartBtn.addEventListener('click', ()=> toggleCart(true));
  closeCartBtn.addEventListener('click', ()=> toggleCart(false));
  searchInput.addEventListener('input', renderMenu);
  categoryFilter.addEventListener('change', renderMenu);
  sortSelect.addEventListener('change', renderMenu);

  toggleAdminBtn.addEventListener('click', ()=>{
    adminPanel.classList.toggle('hidden');
    const hidden = adminPanel.classList.contains('hidden');
    adminPanel.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  });

  addDishForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const name = $('#dish-name').value.trim();
    const desc = $('#dish-desc').value.trim();
    const price = parseFloat($('#dish-price').value) || 0;
    const category = $('#dish-category').value.trim() || 'Principal';
    const emoji = $('#dish-emoji').value.trim() || '🍽️';
    if(!name || price <= 0) return alert('Nombre y precio válidos.');
    const id = 'm' + Date.now();
    const newDish = { id, name, desc, price, category, emoji };
    menu.push(newDish);
    save(STORAGE_KEYS.MENU, menu);
    populateCategoryFilter();
    renderMenu();
    addDishForm.reset();
  });

  resetSampleBtn.addEventListener('click', ()=>{
    if(confirm('¿Restablecer menú de ejemplo? Se reemplazará el menú actual.')) {
      menu = defaultMenu.slice();
      save(STORAGE_KEYS.MENU, menu);
      populateCategoryFilter();
      renderMenu();
    }
  });

  checkoutForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    placeOrder();
  });
}

function populateCategoryFilter(){
  const cats = ['all', ...Array.from(new Set(menu.map(m=>m.category)))];
  categoryFilter.innerHTML = '';
  cats.forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c === 'all' ? 'all' : c;
    opt.textContent = c === 'all' ? 'Todas las categorías' : c;
    categoryFilter.appendChild(opt);
  });
}

function renderMenu(){
  const q = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const sort = sortSelect.value;
  let items = menu.slice();

  if(category && category !== 'all'){
    items = items.filter(i => i.category === category);
  }
  if(q){
    items = items.filter(i => (i.name + ' ' + (i.desc||'')).toLowerCase().includes(q));
  }
  if(sort === 'price-asc') items.sort((a,b)=>a.price-b.price);
  if(sort === 'price-desc') items.sort((a,b)=>b.price-a.price);

  menuEl.innerHTML = '';
  items.forEach(dish => {
    const card = document.createElement('article');
    card.className = 'card dish';
    card.innerHTML = `
      <div style="display:flex;gap:12px;">
        <div class="dish-emoji" aria-hidden="true">${dish.emoji || '🍽️'}</div>
        <div style="flex:1">
          <div class="dish-title">
            <h3>${escapeHtml(dish.name)}</h3>
            <div class="price">${format(dish.price)}</div>
          </div>
          <p class="dish-desc">${escapeHtml(dish.desc || '')}</p>
          <div class="dish-footer">
            <small class="muted">${escapeHtml(dish.category)}</small>
            <div>
              <button class="btn add-to-cart" data-id="${dish.id}">Añadir</button>
            </div>
          </div>
        </div>
      </div>
    `;
    menuEl.appendChild(card);
  });

  // attach add-to-cart listeners
  $$('.add-to-cart').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      addToCart(btn.dataset.id, 1);
    });
  });
}

function addToCart(id, qty = 1){
  const idx = cart.findIndex(i => i.id === id);
  if(idx >= 0) cart[idx].qty += qty;
  else cart.push({ id, qty });
  save(STORAGE_KEYS.CART, cart);
  renderCart();
  updateCartCountUI();
  toggleCart(true);
}

function renderCart(){
  cartItemsEl.innerHTML = '';
  if(cart.length === 0){
    cartItemsEl.innerHTML = '<p class="muted">El carrito está vacío.</p>';
    cartSubtotalEl.textContent = format(0);
    return;
  }

  cart.forEach(entry => {
    const dish = menu.find(m => m.id === entry.id);
    if(!dish) return;
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.innerHTML = `
      <div style="flex:1">
        <div><strong>${escapeHtml(dish.name)}</strong></div>
        <div class="muted small">${format(dish.price)} x <input class="qty" data-id="${entry.id}" type="number" min="0" value="${entry.qty}" style="width:54px;border-radius:6px;border:1px solid #e5e7eb;padding:4px;"></div>
      </div>
      <div style="text-align:right">
        <div><strong>${format(dish.price * entry.qty)}</strong></div>
        <div><button class="btn small remove" data-id="${entry.id}">Eliminar</button></div>
      </div>
    `;
    cartItemsEl.appendChild(el);
  });

  // quantity change listeners
  $$('.qty').forEach(input=>{
    input.addEventListener('change', e=>{
      const id = input.dataset.id;
      let v = parseInt(input.value) || 0;
      if(v < 0) v = 0;
      updateQty(id, v);
    });
  });

  $$('.remove').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.id;
      removeFromCart(id);
    });
  });

  const subtotal = cart.reduce((s, entry)=>{
    const dish = menu.find(m => m.id === entry.id);
    return s + (dish ? dish.price * entry.qty : 0);
  }, 0);

  cartSubtotalEl.textContent = format(subtotal);
}

function updateQty(id, qty){
  const idx = cart.findIndex(c => c.id === id);
  if(idx < 0) return;
  if(qty <= 0) cart.splice(idx,1);
  else cart[idx].qty = qty;
  save(STORAGE_KEYS.CART, cart);
  renderCart();
  updateCartCountUI();
}

function removeFromCart(id){
  cart = cart.filter(c => c.id !== id);
  save(STORAGE_KEYS.CART, cart);
  renderCart();
  updateCartCountUI();
}

function toggleCart(open){
  cartPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
  cartPanel.style.display = open ? 'flex' : 'none';
  if(open) document.getElementById('customer-name').focus();
}

function updateCartCountUI(){
  cartCountEl.textContent = cartCount();
  cartCountEl.parentElement.setAttribute('aria-label', `Artículos en carrito: ${cartCount()}`);
}

function placeOrder(){
  if(cart.length === 0) return alert('El carrito está vacío.');
  const name = $('#customer-name').value.trim();
  const phone = $('#customer-phone').value.trim();
  const address = $('#customer-address').value.trim();
  if(!name || !phone || !address) {
    orderMessage.textContent = 'Completa los datos de contacto.';
    return;
  }

  const order = {
    id: 'o' + Date.now(),
    createdAt: new Date().toISOString(),
    customer: { name, phone, address },
    items: cart.map(c => ({ ...c })),
    total: cart.reduce((s,c)=> {
      const dish = menu.find(m=>m.id===c.id);
      return s + (dish ? dish.price * c.qty : 0);
    },0)
  };

  const orders = load(STORAGE_KEYS.ORDERS) || [];
  orders.push(order);
  save(STORAGE_KEYS.ORDERS, orders);

  // Simulate checkout success
  orderMessage.textContent = `Pedido realizado. Gracias ${name}. Total: ${format(order.total)}. ID: ${order.id}`;
  // limpiar carrito y formulario
  cart = [];
  save(STORAGE_KEYS.CART, cart);
  renderCart();
  updateCartCountUI();
  checkoutForm.reset();
  // cerramos panel tras un momento
  setTimeout(()=>toggleCart(false), 1200);
}

function save(key, data){
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch(e){ console.warn('No se pudo guardar en localStorage', e); }
}
function load(key){
  try { return JSON.parse(localStorage.getItem(key)); }
  catch(e){ return null; }
}

function escapeHtml(str){
  return String(str || '').replace(/[&<>"']/g, function(m){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]);
  });
}