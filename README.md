# Grocery Billing System

A fully offline POS-style Grocery Billing System built with React and Node.js. This system allows cashiers to scan items using a barcode scanner and process sales, while admins can manage inventory items.

## Features

### Security & Authentication
- **User Login System**: Secure authentication with JWT tokens
- **Role-Based Access Control**: 
  - Admin: Full access to all features including item management
  - Cashier: Access to sales/checkout only
- **Password Protection**: Bcrypt password hashing
- **Session Management**: Token-based authentication with automatic logout

### Cashier/Sales Module
- **Multiple Barcode Scanning Methods**:
  - **USB Barcode Scanner**: Works as keyboard input (just scan and press Enter)
  - **Camera Scanner**: Use device camera to scan barcodes (html5-qrcode)
  - **Manual Entry**: Type barcode manually
- **Automatic Item Retrieval**: Instantly displays item name and price when scanned
- **Cart Management**: 
  - View all scanned items in a table
  - Automatic quantity tracking (scanning same item multiple times increases quantity)
  - Individual item price calculation
  - Real-time total bill calculation
- **Checkout & Receipt**: Process transactions and print receipts

### Admin Module
- **Item Management**:
  - Add new items by scanning barcode
  - Auto-generate item ID from barcode
  - Enter item details: name, price, category, stock
  - Edit existing items
  - Delete items (admin only)
- **Inventory Tracking**: View all items with stock levels
- **User Management**: Create new users (admin only)

### Database
- **Items Table**: Stores barcode, name, price, category, stock
- **Transactions Table**: Records all sales transactions
- **Transaction Items Table**: Detailed breakdown of items sold in each transaction

## Technology Stack

- **Frontend**: React 18, React Router
- **Backend**: Node.js, Express
- **Database**: SQLite (fully offline, no setup required)
- **API**: RESTful API

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Step 1: Install Dependencies

From the root directory, run:

```bash
npm run install-all
```

This will install dependencies for:
- Root project (concurrently for running both servers)
- Server (Express, SQLite, etc.)
- Client (React and dependencies)

### Step 2: Start the Application

Run both server and client simultaneously:

```bash
npm run dev
```

Or run them separately:

**Terminal 1 - Backend Server:**
```bash
npm run server
```

**Terminal 2 - Frontend Client:**
```bash
npm run client
```

### Step 3: Access the Application

- **Frontend**: Open [http://localhost:3000](http://localhost:3000) in your browser
- **Backend API**: Running on [http://localhost:5000](http://localhost:5000)

## Usage Guide

### First Time Setup

1. **Login**:
   - Default admin credentials:
     - Username: `admin`
     - Password: `admin123`
   - **Important**: Change the default password in production!

2. **Add Items (Admin Section)**:
   - Login as admin
   - Navigate to Admin section
   - Click "Add New Item"
   - Scan or type barcode and press Enter
   - Fill in item details (name, price, category, stock)
   - Click "Add Item"

3. **Create Additional Users (Admin Only)**:
   - Login as admin
   - Use the API endpoint `/api/auth/register` to create new users
   - Or add users directly to the database

### Cashier Workflow

1. Login with cashier or admin credentials
2. Navigate to Cashier section
3. **Choose scanning method**:
   - **USB Scanner**: Just scan items directly (scanner acts as keyboard)
   - **Camera Scanner**: Click "Start Camera Scanner" and point camera at barcode
   - **Manual**: Type barcode and press Enter
4. Items automatically appear in cart with quantity
5. Adjust quantities using +/- buttons if needed
6. Review total amount
7. Click "Checkout" to complete transaction
8. Print receipt if needed
9. Click "New Sale" to start next transaction

### Admin Workflow

1. Login with admin credentials
2. Navigate to Admin section
3. View all items in inventory
4. Add new items by clicking "Add New Item"
5. Edit items by clicking "Edit" button
6. Delete items by clicking "Delete" button (with confirmation)
7. Create new users via API (see API endpoints)

## Barcode Scanner Setup

### USB Barcode Scanner (Keyboard Input)
Most USB barcode scanners work as keyboard input devices. When you scan a barcode:
1. The scanner types the barcode number
2. Automatically presses Enter
3. The system recognizes this and processes the item

**Note**: Make sure the barcode input field is focused when scanning.

### Camera-Based Scanner
The system includes a camera-based barcode scanner using html5-qrcode:
1. Click "Start Camera Scanner" button
2. Grant camera permissions when prompted
3. Point camera at barcode
4. System automatically detects and processes the barcode
5. Click "Stop Camera Scanner" when done

**Mobile Phone Support:**
- **Works great on mobile phones!** Open the app in your phone's browser
- Mobile browsers often have better camera and barcode detection support
- Use your phone's camera to scan barcodes directly
- The app is fully responsive and optimized for mobile use

**Note**: Camera scanner requires HTTPS in production (or localhost for development)

## Database

The database file (`grocery_store.db`) is automatically created in the `server/` directory on first run. It uses SQLite, which requires no additional setup.

### Database Schema

**users**
- `id` (INTEGER, PRIMARY KEY)
- `username` (TEXT, UNIQUE)
- `password` (TEXT, hashed with bcrypt)
- `role` (TEXT, 'admin' or 'cashier')
- `full_name` (TEXT)
- `created_at` (DATETIME)

**items**
- `id` (INTEGER, PRIMARY KEY)
- `barcode` (TEXT, UNIQUE)
- `name` (TEXT)
- `price` (REAL)
- `category` (TEXT)
- `stock` (INTEGER)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

**transactions**
- `id` (INTEGER, PRIMARY KEY)
- `transaction_id` (TEXT, UNIQUE)
- `total_amount` (REAL)
- `created_at` (DATETIME)

**transaction_items**
- `id` (INTEGER, PRIMARY KEY)
- `transaction_id` (TEXT)
- `item_id` (INTEGER)
- `barcode` (TEXT)
- `item_name` (TEXT)
- `quantity` (INTEGER)
- `unit_price` (REAL)
- `total_price` (REAL)

## API Endpoints

### Authentication (Public)
- `POST /api/auth/login` - Login (returns JWT token)
  ```json
  { "username": "admin", "password": "admin123" }
  ```
- `GET /api/auth/me` - Get current user info (requires token)

### Authentication (Admin Only - Requires Token)
- `POST /api/auth/register` - Create new user
  ```json
  { "username": "cashier1", "password": "pass123", "role": "cashier", "fullName": "John Doe" }
  ```
- `GET /api/auth/users` - Get all users

### Items (Requires Token)
- `GET /api/items` - Get all items
- `GET /api/items/:id` - Get item by ID
- `GET /api/items/barcode/:barcode` - Get item by barcode
- `POST /api/items` - Create new item (Admin only)
- `PUT /api/items/:id` - Update item (Admin only)
- `DELETE /api/items/:id` - Delete item (Admin only)

### Sales (Requires Token)
- `GET /api/sales/scan/:barcode` - Scan item by barcode
- `POST /api/sales/checkout` - Process checkout

### Transactions (Requires Token)
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/:transactionId` - Get transaction details

**Note**: All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Project Structure

```
groceryStore/
├── server/
│   ├── index.js           # Express server
│   ├── database.js        # Database setup
│   ├── routes/
│   │   ├── items.js      # Item management routes
│   │   ├── sales.js      # Sales/checkout routes
│   │   └── transactions.js # Transaction routes
│   └── grocery_store.db  # SQLite database (auto-created)
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Admin.js   # Admin interface
│   │   │   └── Cashier.js # Cashier interface
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── package.json
└── README.md
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt with salt rounds
- **Role-Based Access**: Admin and Cashier roles with different permissions
- **Protected Routes**: All API endpoints require authentication
- **Automatic Logout**: Token expiration and invalid token handling

**Security Recommendations for Production**:
1. Change default admin password immediately
2. Set a strong `JWT_SECRET` environment variable
3. Use HTTPS in production
4. Regularly update dependencies
5. Implement rate limiting
6. Add input validation and sanitization
7. Consider adding audit logging

## Troubleshooting

### Port Already in Use
If port 3000 or 5000 is already in use:
- Backend: Set `PORT` environment variable (e.g., `PORT=5001 npm run server`)
- Frontend: React will prompt to use a different port

### Database Errors
- Delete `server/grocery_store.db` and restart the server to recreate the database
- Default admin user will be recreated automatically

### Barcode Scanner Not Working

**USB Barcode Scanner Issues:**
1. **Input field not focused**: Click the barcode input field before scanning
2. **Scanner not recognized**: 
   - Check if scanner works in Notepad (it should type the barcode)
   - Some scanners need configuration - check scanner manual
   - Try unplugging and replugging the scanner
3. **Scanner adds extra characters**: The system handles Enter, Tab, and newline automatically
4. **Test manually**: Type a barcode number and press Enter - if this works, the scanner should too
5. **Check browser console**: Open Developer Tools (F12) and look for error messages or scan logs

**Camera Scanner Issues:**
1. **Permission denied**: Grant camera permissions when prompted
2. **No camera found**: Ensure camera is connected and not used by another app
3. **HTTPS required**: Camera scanner needs HTTPS in production (localhost works in development)
4. **Poor lighting**: Ensure good lighting for barcode scanning
5. **Wrong barcode format**: Camera scanner works best with QR codes and common barcode formats (EAN, UPC)

**General Troubleshooting:**
- Open browser console (F12) to see debug messages
- Check if items exist in database (Admin section)
- Verify you're logged in with valid token
- Try refreshing the page
- Clear browser cache and localStorage if issues persist

### Authentication Issues
- Clear browser localStorage and login again
- Check that token hasn't expired (24 hour default)
- Verify username and password are correct
- Default admin: username `admin`, password `admin123`

## License

MIT
