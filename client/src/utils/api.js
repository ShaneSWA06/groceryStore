import * as ds from '../services/dataService';

function wrap(promise) {
  return promise.then(data => ({ data }));
}

function parseTrailingId(url, prefix) {
  return url.slice(prefix.length);
}

const api = {
  get(url) {
    if (url === '/items') return wrap(ds.getItems());
    if (url.startsWith('/items/barcode/')) return wrap(ds.getItemByBarcode(parseTrailingId(url, '/items/barcode/')));
    if (url.startsWith('/items/')) return wrap(ds.getItemById(parseTrailingId(url, '/items/')));
    if (url === '/categories') return wrap(ds.getCategories());
    if (url === '/users') return wrap(ds.getUsers());
    if (url === '/statistics') return wrap(ds.getStatistics());
    if (url.startsWith('/sales/scan/')) return wrap(ds.getItemByBarcode(parseTrailingId(url, '/sales/scan/')));
    if (url === '/transactions') return wrap(ds.getTransactions());
    if (url.startsWith('/transactions/')) return wrap(ds.getTransactionById(parseTrailingId(url, '/transactions/')));
    if (url === '/backup/list') return Promise.resolve({ data: { backups: [] } });
    return Promise.reject(new Error(`Unknown GET: ${url}`));
  },

  post(url, data) {
    if (url === '/auth/login') return wrap(ds.login(data.username, data.password));
    if (url === '/items') return wrap(ds.createItem(data));
    if (url === '/categories') return wrap(ds.createCategory(data));
    if (url === '/users') return wrap(ds.createUser(data));
    if (url === '/sales/checkout') return wrap(ds.checkout(data.items));
    if (url === '/backup/create') return wrap(ds.exportDataAsFile());
    if (url === '/backup/cleanup') return Promise.resolve({ data: { success: true, message: 'Cleanup complete' } });
    if (url === '/database/reset-transactions') return wrap(ds.resetTransactions());
    return Promise.reject(new Error(`Unknown POST: ${url}`));
  },

  put(url, data) {
    if (url.startsWith('/items/')) return wrap(ds.updateItem(parseTrailingId(url, '/items/'), data));
    if (url.startsWith('/categories/')) return wrap(ds.updateCategory(parseTrailingId(url, '/categories/'), data));
    return Promise.reject(new Error(`Unknown PUT: ${url}`));
  },

  delete(url) {
    if (url.startsWith('/items/')) return wrap(ds.deleteItem(parseTrailingId(url, '/items/')));
    if (url.startsWith('/categories/')) return wrap(ds.deleteCategory(parseTrailingId(url, '/categories/')));
    if (url.startsWith('/users/')) return wrap(ds.deleteUser(parseTrailingId(url, '/users/')));
    return Promise.reject(new Error(`Unknown DELETE: ${url}`));
  },
};

export default api;
