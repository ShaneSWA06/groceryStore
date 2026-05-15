import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

function apiError(message) {
  const err = new Error(message);
  err.response = { data: { error: message } };
  return err;
}

// Auth
export async function login(username, password) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw apiError('Supabase is not configured. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY environment variables.');
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .maybeSingle();

  if (error) throw apiError(`Database error: ${error.message}`);
  if (!data) throw apiError('Invalid username or password — check credentials or contact admin');

  const token = `local_${data.id}_${Date.now()}`;
  return {
    token,
    user: { id: data.id, username: data.username, role: data.role, fullName: data.full_name },
  };
}

// Items
export async function getItems() {
  const { data, error } = await supabase.from('items').select('*').order('name');
  if (error) { console.error('getItems error:', error); throw apiError(error.message); }
  console.log('getItems returned', data?.length, 'rows');
  return data;
}

export async function getItemById(id) {
  const { data, error } = await supabase.from('items').select('*').eq('id', id).single();
  if (error || !data) throw apiError('Item not found');
  return data;
}

export async function getItemByBarcode(barcode) {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('barcode', String(barcode).trim())
    .single();
  if (error || !data) throw apiError('Item not found. Please add it in Admin section first.');
  return data;
}

export async function createItem(itemData) {
  const { data: existing } = await supabase
    .from('items')
    .select('id')
    .eq('barcode', String(itemData.barcode))
    .maybeSingle();
  if (existing) throw apiError('Barcode already exists');

  const { data, error } = await supabase
    .from('items')
    .insert({
      barcode: itemData.barcode,
      name: itemData.name,
      price: parseFloat(itemData.price),
      base_price: itemData.base_price ? parseFloat(itemData.base_price) : null,
      category: itemData.category || null,
      stock: parseInt(itemData.stock) || 0,
    })
    .select()
    .single();
  if (error) throw apiError(error.message);
  return data;
}

export async function updateItem(id, itemData) {
  const { data: existing } = await supabase
    .from('items')
    .select('id')
    .eq('barcode', String(itemData.barcode))
    .neq('id', id)
    .maybeSingle();
  if (existing) throw apiError('Barcode already exists');

  const { error } = await supabase
    .from('items')
    .update({
      barcode: itemData.barcode,
      name: itemData.name,
      price: parseFloat(itemData.price),
      base_price: itemData.base_price ? parseFloat(itemData.base_price) : null,
      category: itemData.category || null,
      stock: parseInt(itemData.stock) || 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw apiError(error.message);
  return { message: 'Item updated', changes: 1 };
}

export async function deleteItem(id) {
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) throw apiError(error.message);
  return { message: 'Item deleted' };
}

// Categories
export async function getCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw apiError(error.message);
  return data;
}

export async function createCategory(categoryData) {
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .ilike('name', categoryData.name.trim())
    .maybeSingle();
  if (existing) throw apiError('Category already exists');

  const { data, error } = await supabase
    .from('categories')
    .insert({ name: categoryData.name.trim(), description: categoryData.description || null })
    .select()
    .single();
  if (error) throw apiError(error.message);
  return { ...data, message: 'Category created' };
}

export async function deleteCategory(id) {
  const { data: cat, error: catErr } = await supabase
    .from('categories')
    .select('name')
    .eq('id', id)
    .single();
  if (catErr || !cat) throw apiError('Category not found');

  const { data: items } = await supabase
    .from('items')
    .select('id')
    .eq('category', cat.name)
    .limit(1);
  if (items && items.length > 0) throw apiError('Cannot delete category that has items assigned to it');

  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw apiError(error.message);
  return { message: 'Category deleted' };
}

// Users
export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, role, full_name, created_at')
    .order('id');
  if (error) throw apiError(error.message);
  return data;
}

export async function createUser(userData) {
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('username', userData.username)
    .maybeSingle();
  if (existing) throw apiError('Username already exists');

  const { data, error } = await supabase
    .from('users')
    .insert({
      username: userData.username,
      password: userData.password,
      role: userData.role || 'cashier',
      full_name: userData.fullName || null,
    })
    .select()
    .single();
  if (error) throw apiError(error.message);
  return { id: data.id, username: data.username, role: data.role, fullName: data.full_name, message: 'User created' };
}

export async function deleteUser(id) {
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw apiError(error.message);
  return { message: 'User deleted' };
}

// Transactions
export async function getTransactions() {
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*, transaction_items(count)')
    .order('created_at', { ascending: false });
  if (error) throw apiError(error.message);
  return transactions.map(t => ({
    ...t,
    item_count: t.transaction_items?.[0]?.count ?? 0,
  }));
}

export async function getTransactionById(transactionId) {
  const { data: tx, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('transaction_id', transactionId)
    .single();
  if (error || !tx) throw apiError('Transaction not found');

  const { data: items } = await supabase
    .from('transaction_items')
    .select('*')
    .eq('transaction_id', transactionId);

  return { ...tx, items: items || [] };
}

// Sales / Checkout
export async function checkout(items) {
  const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const now = new Date().toISOString();

  const { error: txError } = await supabase
    .from('transactions')
    .insert({ transaction_id: transactionId, total_amount: totalAmount, created_at: now });
  if (txError) throw apiError(txError.message);

  const txItems = items.map(item => ({
    transaction_id: transactionId,
    item_id: item.itemId,
    barcode: item.barcode,
    item_name: item.name,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
    created_at: now,
  }));

  const { error: itemsError } = await supabase.from('transaction_items').insert(txItems);
  if (itemsError) throw apiError(itemsError.message);

  // Decrement stock for each item
  await Promise.all(
    items.map(async item => {
      await supabase.rpc('decrement_stock', { item_id: item.itemId, qty: item.quantity });
    })
  );

  return { transactionId, totalAmount, message: 'Checkout successful' };
}

// Statistics
export async function getStatistics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [itemsRes, todayTxsRes, recentTxsRes] = await Promise.all([
    supabase.from('items').select('id, stock'),
    supabase.from('transactions').select('transaction_id, total_amount').gte('created_at', today.toISOString()),
    supabase.from('transactions').select('transaction_id').gte('created_at', thirtyDaysAgo.toISOString()),
  ]);

  if (itemsRes.error) console.error('items fetch error:', itemsRes.error);
  if (todayTxsRes.error) console.error('todayTxs fetch error:', todayTxsRes.error);
  if (recentTxsRes.error) console.error('recentTxs fetch error:', recentTxsRes.error);

  const allItems = itemsRes.data || [];
  const todayTransactions = todayTxsRes.data || [];
  const recentTransactions = recentTxsRes.data || [];

  const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.total_amount, 0);
  const todayTxIds = new Set(todayTransactions.map(t => t.transaction_id));
  const recentTxIds = new Set(recentTransactions.map(t => t.transaction_id));

  async function calcProfit(txIdSet) {
    if (txIdSet.size === 0) return 0;
    const { data: txItems } = await supabase
      .from('transaction_items')
      .select('transaction_id, item_id, unit_price, quantity')
      .in('transaction_id', [...txIdSet]);

    const itemIds = [...new Set((txItems || []).map(ti => ti.item_id))];
    const { data: itemPrices } = await supabase
      .from('items')
      .select('id, base_price')
      .in('id', itemIds);

    const priceMap = {};
    (itemPrices || []).forEach(i => { priceMap[i.id] = i.base_price; });

    return (txItems || []).reduce((sum, ti) => {
      const basePri = priceMap[ti.item_id];
      if (basePri != null) return sum + (ti.unit_price - basePri) * ti.quantity;
      return sum;
    }, 0);
  }

  const [todayProfit, profit30days] = await Promise.all([
    calcProfit(todayTxIds),
    calcProfit(recentTxIds),
  ]);

  return {
    stock: {
      total_items: allItems.length,
      in_stock: allItems.filter(i => i.stock > 10).length,
      out_of_stock: allItems.filter(i => i.stock === 0).length,
      low_stock: allItems.filter(i => i.stock > 0 && i.stock <= 10).length,
    },
    lowStockItems: allItems.filter(i => i.stock <= 10),
    today: {
      transaction_count: todayTransactions.length,
      total_revenue: todayRevenue,
      avg_transaction: todayTransactions.length > 0 ? todayRevenue / todayTransactions.length : 0,
      total_profit: todayProfit,
    },
    profit_30days: profit30days,
  };
}

// Reset transactions (keep inventory)
export async function resetTransactions() {
  await supabase.from('transaction_items').delete().neq('id', 0);
  await supabase.from('transactions').delete().neq('id', 0);
  return { success: true, message: 'All transactions cleared. Inventory preserved.' };
}

// Export all data as a downloadable JSON file
export async function exportDataAsFile() {
  const [{ data: users }, { data: items }, { data: categories }, { data: transactions }, { data: transaction_items }] =
    await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('items').select('*'),
      supabase.from('categories').select('*'),
      supabase.from('transactions').select('*'),
      supabase.from('transaction_items').select('*'),
    ]);

  const payload = { users, items, categories, transactions, transaction_items, exported_at: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
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

// Import data from a JSON backup file (upsert into Supabase)
export async function importDataFromObject(data) {
  if (data.categories?.length) await supabase.from('categories').upsert(data.categories, { onConflict: 'id' });
  if (data.users?.length) await supabase.from('users').upsert(data.users, { onConflict: 'id' });
  if (data.items?.length) await supabase.from('items').upsert(data.items, { onConflict: 'id' });
  if (data.transactions?.length) await supabase.from('transactions').upsert(data.transactions, { onConflict: 'id' });
  if (data.transaction_items?.length) await supabase.from('transaction_items').upsert(data.transaction_items, { onConflict: 'id' });
  return { success: true, message: 'Data imported successfully' };
}
