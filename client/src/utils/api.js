import * as ds from '../services/dataService';

function ok(data) {
  return Promise.resolve({ data });
}

function parseTrailingId(url, prefix) {
  return url.slice(prefix.length);
}

const api = {
  get(url) {
    if (url === '/items') return ok(ds.getItems());
    if (url.startsWith('/items/barcode/')) return ok(ds.getItemByBarcode(parseTrailingId(url, '/items/barcode/')));
    if (url.startsWith('/items/')) return ok(ds.getItemById(parseTrailingId(url, '/items/')));
    if (url === '/categories') return ok(ds.getCategories());
    if (url === '/users') return ok(ds.getUsers());
    if (url === '/statistics') return ok(ds.getStatistics());
    if (url.startsWith('/sales/scan/')) return ok(ds.getItemByBarcode(parseTrailingId(url, '/sales/scan/')));
    if (url === '/backup/list') return ok({ backups: [] });
    return Promise.reject(new Error(`Unknown GET: ${url}`));
  },

  post(url, data) {
    if (url === '/auth/login') return ok(ds.login(data.username, data.password));
    if (url === '/items') return ok(ds.createItem(data));
    if (url === '/categories') return ok(ds.createCategory(data));
    if (url === '/users') return ok(ds.createUser(data));
    if (url === '/sales/checkout') return ok(ds.checkout(data.items));
    if (url === '/backup/create') { ds.exportDataAsFile(); return ok({ success: true, backup: { filename: `backup_${new Date().toISOString().split('T')[0]}.json` } }); }
    if (url === '/backup/cleanup') return ok({ success: true, message: 'Cleanup complete' });
    if (url === '/database/reset-transactions') return ok(ds.resetTransactions());
    return Promise.reject(new Error(`Unknown POST: ${url}`));
  },

  put(url, data) {
    if (url.startsWith('/items/')) return ok(ds.updateItem(parseTrailingId(url, '/items/'), data));
    return Promise.reject(new Error(`Unknown PUT: ${url}`));
  },

  delete(url) {
    if (url.startsWith('/items/')) return ok(ds.deleteItem(parseTrailingId(url, '/items/')));
    if (url.startsWith('/categories/')) return ok(ds.deleteCategory(parseTrailingId(url, '/categories/')));
    if (url.startsWith('/users/')) return ok(ds.deleteUser(parseTrailingId(url, '/users/')));
    return Promise.reject(new Error(`Unknown DELETE: ${url}`));
  },
};

export default api;
