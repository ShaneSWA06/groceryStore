const KEYS = {
  USERS: 'gs_users',
  ITEMS: 'gs_items',
  CATEGORIES: 'gs_categories',
  TRANSACTIONS: 'gs_transactions',
  TRANSACTION_ITEMS: 'gs_transaction_items',
};

const DEFAULT_ADMIN = {
  id: 1,
  username: 'admin',
  password: 'admin123',
  role: 'admin',
  full_name: 'Administrator',
  created_at: new Date().toISOString(),
};

function getList(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function setList(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function nextId(items) {
  if (!items.length) return 1;
  return Math.max(...items.map(i => i.id)) + 1;
}

function initializeIfEmpty() {
  const users = getList(KEYS.USERS);
  if (users.length === 0) {
    setList(KEYS.USERS, [DEFAULT_ADMIN]);
  }
}

function apiError(message) {
  const err = new Error(message);
  err.response = { data: { error: message } };
  return err;
}

// Auth
export function login(username, password) {
  initializeIfEmpty();
  const users = getList(KEYS.USERS);
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) throw apiError('Invalid username or password');
  const token = `local_${user.id}_${Date.now()}`;
  const userData = { id: user.id, username: user.username, role: user.role, fullName: user.full_name };
  return { token, user: userData };
}

// Items
export function getItems() {
  return getList(KEYS.ITEMS);
}

export function getItemById(id) {
  const items = getList(KEYS.ITEMS);
  const item = items.find(i => i.id === parseInt(id));
  if (!item) throw apiError('Item not found');
  return item;
}

export function getItemByBarcode(barcode) {
  const items = getList(KEYS.ITEMS);
  const item = items.find(i => String(i.barcode).trim() === String(barcode).trim());
  if (!item) throw apiError('Item not found. Please add it in Admin section first.');
  return item;
}

export function createItem(data) {
  const items = getList(KEYS.ITEMS);
  if (items.find(i => String(i.barcode) === String(data.barcode))) {
    throw apiError('Barcode already exists');
  }
  const newItem = {
    id: nextId(items),
    barcode: data.barcode,
    name: data.name,
    price: parseFloat(data.price),
    base_price: data.base_price ? parseFloat(data.base_price) : null,
    category: data.category || null,
    stock: parseInt(data.stock) || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  setList(KEYS.ITEMS, [...items, newItem]);
  return newItem;
}

export function updateItem(id, data) {
  const items = getList(KEYS.ITEMS);
  const idx = items.findIndex(i => i.id === parseInt(id));
  if (idx === -1) throw apiError('Item not found');
  if (items.find(i => String(i.barcode) === String(data.barcode) && i.id !== parseInt(id))) {
    throw apiError('Barcode already exists');
  }
  items[idx] = {
    ...items[idx],
    barcode: data.barcode,
    name: data.name,
    price: parseFloat(data.price),
    base_price: data.base_price ? parseFloat(data.base_price) : null,
    category: data.category || null,
    stock: parseInt(data.stock) || 0,
    updated_at: new Date().toISOString(),
  };
  setList(KEYS.ITEMS, items);
  return { message: 'Item updated', changes: 1 };
}

export function deleteItem(id) {
  const items = getList(KEYS.ITEMS);
  setList(KEYS.ITEMS, items.filter(i => i.id !== parseInt(id)));
  return { message: 'Item deleted' };
}

// Categories
export function getCategories() {
  return getList(KEYS.CATEGORIES);
}

export function createCategory(data) {
  const cats = getList(KEYS.CATEGORIES);
  if (cats.find(c => c.name.toLowerCase() === data.name.trim().toLowerCase())) {
    throw apiError('Category already exists');
  }
  const newCat = {
    id: nextId(cats),
    name: data.name.trim(),
    description: data.description || null,
    created_at: new Date().toISOString(),
  };
  setList(KEYS.CATEGORIES, [...cats, newCat]);
  return { ...newCat, message: 'Category created' };
}

export function deleteCategory(id) {
  const cats = getList(KEYS.CATEGORIES);
  const cat = cats.find(c => c.id === parseInt(id));
  if (!cat) throw apiError('Category not found');
  const items = getList(KEYS.ITEMS);
  if (items.find(i => i.category === cat.name)) {
    throw apiError('Cannot delete category that has items assigned to it');
  }
  setList(KEYS.CATEGORIES, cats.filter(c => c.id !== parseInt(id)));
  return { message: 'Category deleted' };
}

// Transactions
export function getTransactions() {
  const transactions = getList(KEYS.TRANSACTIONS);
  const txItems = getList(KEYS.TRANSACTION_ITEMS);
  return transactions.map(t => ({
    ...t,
    item_count: txItems.filter(ti => ti.transaction_id === t.transaction_id).length,
  })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function getTransactionById(transactionId) {
  const transactions = getList(KEYS.TRANSACTIONS);
  const txItems = getList(KEYS.TRANSACTION_ITEMS);
  const tx = transactions.find(t => t.transaction_id === transactionId);
  if (!tx) throw apiError('Transaction not found');
  return { ...tx, items: txItems.filter(ti => ti.transaction_id === transactionId) };
}

// Users
export function getUsers() {
  initializeIfEmpty();
  return getList(KEYS.USERS).map(u => ({
    id: u.id,
    username: u.username,
    role: u.role,
    full_name: u.full_name,
    created_at: u.created_at,
  }));
}

export function createUser(data) {
  initializeIfEmpty();
  const users = getList(KEYS.USERS);
  if (users.find(u => u.username === data.username)) {
    throw apiError('Username already exists');
  }
  const newUser = {
    id: nextId(users),
    username: data.username,
    password: data.password,
    role: data.role || 'cashier',
    full_name: data.fullName || null,
    created_at: new Date().toISOString(),
  };
  setList(KEYS.USERS, [...users, newUser]);
  return { id: newUser.id, username: newUser.username, role: newUser.role, fullName: newUser.full_name, message: 'User created' };
}

export function deleteUser(id) {
  const users = getList(KEYS.USERS);
  setList(KEYS.USERS, users.filter(u => u.id !== parseInt(id)));
  return { message: 'User deleted' };
}

// Sales / Checkout
export function checkout(items) {
  const storedItems = getList(KEYS.ITEMS);
  const transactions = getList(KEYS.TRANSACTIONS);
  const txItems = getList(KEYS.TRANSACTION_ITEMS);

  const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const now = new Date().toISOString();

  const transaction = {
    id: nextId(transactions),
    transaction_id: transactionId,
    total_amount: totalAmount,
    created_at: now,
  };

  let txItemIdBase = txItems.length > 0 ? Math.max(...txItems.map(t => t.id)) + 1 : 1;
  const newTxItems = items.map((item, idx) => {
    const itemIdx = storedItems.findIndex(i => i.id === item.itemId);
    if (itemIdx >= 0) {
      storedItems[itemIdx] = {
        ...storedItems[itemIdx],
        stock: Math.max(0, storedItems[itemIdx].stock - item.quantity),
      };
    }
    return {
      id: txItemIdBase + idx,
      transaction_id: transactionId,
      item_id: item.itemId,
      barcode: item.barcode,
      item_name: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      created_at: now,
    };
  });

  setList(KEYS.ITEMS, storedItems);
  setList(KEYS.TRANSACTIONS, [...transactions, transaction]);
  setList(KEYS.TRANSACTION_ITEMS, [...txItems, ...newTxItems]);

  return { transactionId, totalAmount, message: 'Checkout successful' };
}

// Statistics
export function getStatistics() {
  const items = getList(KEYS.ITEMS);
  const transactions = getList(KEYS.TRANSACTIONS);
  const txItems = getList(KEYS.TRANSACTION_ITEMS);

  const today = new Date().toDateString();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const todayTxs = transactions.filter(t => new Date(t.created_at).toDateString() === today);
  const recentTxIds = new Set(
    transactions.filter(t => new Date(t.created_at) >= thirtyDaysAgo).map(t => t.transaction_id)
  );
  const todayTxIds = new Set(todayTxs.map(t => t.transaction_id));

  const todayRevenue = todayTxs.reduce((sum, t) => sum + t.total_amount, 0);

  function calcProfit(txIdSet) {
    return txItems
      .filter(ti => txIdSet.has(ti.transaction_id))
      .reduce((sum, ti) => {
        const item = items.find(i => i.id === ti.item_id);
        if (item && item.base_price) {
          return sum + (ti.unit_price - item.base_price) * ti.quantity;
        }
        return sum;
      }, 0);
  }

  return {
    stock: {
      total_items: items.length,
      in_stock: items.filter(i => i.stock > 10).length,
      out_of_stock: items.filter(i => i.stock === 0).length,
      low_stock: items.filter(i => i.stock > 0 && i.stock <= 10).length,
    },
    lowStockItems: items.filter(i => i.stock <= 10),
    today: {
      transaction_count: todayTxs.length,
      total_revenue: todayRevenue,
      avg_transaction: todayTxs.length > 0 ? todayRevenue / todayTxs.length : 0,
      total_profit: calcProfit(todayTxIds),
    },
    profit_30days: calcProfit(recentTxIds),
  };
}

// Reset transactions (keep inventory)
export function resetTransactions() {
  setList(KEYS.TRANSACTIONS, []);
  setList(KEYS.TRANSACTION_ITEMS, []);
  return { success: true, message: 'All transactions cleared. Inventory preserved.' };
}

// Export all data as a downloadable JSON file
export function exportDataAsFile() {
  const data = {
    users: getList(KEYS.USERS),
    items: getList(KEYS.ITEMS),
    categories: getList(KEYS.CATEGORIES),
    transactions: getList(KEYS.TRANSACTIONS),
    transaction_items: getList(KEYS.TRANSACTION_ITEMS),
    exported_at: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grocery_store_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
  return { success: true, message: 'Data exported successfully' };
}

// Import data from a JSON backup file
export function importDataFromObject(data) {
  if (data.users) setList(KEYS.USERS, data.users);
  if (data.items) setList(KEYS.ITEMS, data.items);
  if (data.categories) setList(KEYS.CATEGORIES, data.categories);
  if (data.transactions) setList(KEYS.TRANSACTIONS, data.transactions);
  if (data.transaction_items) setList(KEYS.TRANSACTION_ITEMS, data.transaction_items);
  return { success: true, message: 'Data imported successfully' };
}
