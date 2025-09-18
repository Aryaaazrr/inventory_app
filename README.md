# Inventory Management System API

A comprehensive REST API for managing inventory, products, transactions, and generating reports. Built with Node.js and MySQL without using any frameworks like Express.

## Features

### Core Features
- ✅ **Product Management**: Add, update, and track products with categories
- ✅ **Stock Management**: Real-time stock updates with validation
- ✅ **Transaction Management**: Record sales, purchases, and returns
- ✅ **Customer & Supplier Management**: Track business relationships
- ✅ **Inventory Reports**: Value calculations and analytics
- ✅ **Low Stock Alerts**: Automatic notifications via Event Emitters

### Advanced Features
- 🔔 **Event-Driven Notifications**: Real-time alerts for low stock
- 🚨 **Custom Error Handling**: Specific error types for better debugging
- 📊 **Comprehensive Logging**: Transaction and system activity logs
- 📄 **Pagination**: Efficient data retrieval for large datasets
- 🔍 **Advanced Filtering**: Category-based and date-range filtering

## Prerequisites

- **Node.js** (v16.0.0 or higher)
- **MySQL** (v5.7 or higher) or **MariaDB** (v10.2 or higher)
- **npm** (comes with Node.js)

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Aryaaazrr/inventory_app.git
cd inventory-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup

#### Option A: Using MySQL CLI
```bash
# Login to MySQL
mysql -u root -p

# Run the database script
source database.sql
```

#### Option B: Using npm script
```bash
# Make sure MySQL is running and accessible
npm run setup-db
```

### 4. Configure Database Connection

Edit the database configuration in `server.js`:

```javascript
this.inventoryManager = new InventoryManager({
  host: 'localhost',
  user: 'root',           // Your MySQL username
  password: 'password',   // Your MySQL password
  database: 'test_inventory'
});
```

### 5. Start the Server

#### Production Mode
```bash
npm start
```

#### Development Mode (with auto-restart)
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### Products

#### Add New Product
```http
POST /products
Content-Type: application/json

{
  "productId": "PROD011",
  "name": "Gaming Mouse",
  "price": 450000,
  "stock": 25,
  "category": "Electronics"
}
```

#### Get All Products (with pagination and filtering)
```http
GET /products?page=1&limit=10&category=Electronics
```

#### Update Product Stock
```http
PUT /products/PROD001
Content-Type: application/json

{
  "quantity": 5,
  "transactionType": "restock"
}
```

### Transactions

#### Create New Transaction
```http
POST /transactions
Content-Type: application/json

{
  "transactionId": "TXN021",
  "productId": "PROD001",
  "quantity": 2,
  "type": "sale",
  "customerId": "CUST001"
}
```

### Reports

#### Get Inventory Value Report
```http
GET /reports/inventory
```

#### Get Low Stock Products
```http
GET /reports/low-stock?threshold=15
```

#### Get Sales Report
```http
GET /reports/sales?startDate=2024-01-01&endDate=2024-12-31
```

#### Get Top 10 Products
```http
GET /reports/top-products?startDate=2024-01-01&endDate=2024-12-31
```

#### Get Product Transaction History
```http
GET /products/PROD001/history?page=1&limit=10
```

## Example API Requests

### 1. Add a New Product
```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PROD011",
    "name": "Gaming Headset",
    "price": 850000,
    "stock": 15,
    "category": "Electronics"
  }'
```

### 2. Create a Sales Transaction
```bash
curl -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "TXN021",
    "productId": "PROD001",
    "quantity": 1,
    "type": "sale",
    "customerId": "CUST001"
  }'
```

### 3. Get Products by Category
```bash
curl "http://localhost:3000/products?category=Electronics&page=1&limit=5"
```

### 4. Get Inventory Report
```bash
curl http://localhost:3000/reports/inventory
```

### 5. Get Low Stock Alert
```bash
curl "http://localhost:3000/reports/low-stock?threshold=10"
```

## Response Examples

### Successful Product Addition
```json
{
  "success": true,
  "message": "Product added successfully",
  "data": {
    "success": true,
    "id": 11
  }
}
```

### Products List with Pagination
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "product_id": "PROD001",
        "name": "Laptop ASUS X550",
        "price": 8500000,
        "stock": 8,
        "category": "Electronics"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 10,
      "itemsPerPage": 5
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Product with ID PROD001 already exists",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

## Event System

The system uses Node.js EventEmitters for real-time notifications:

### Low Stock Alerts
```javascript
// Automatically triggered when stock ≤ threshold
inventoryManager.on('lowStock', (product) => {
  console.log(`🚨 LOW STOCK: ${product.name} has ${product.stock} units left`);
});
```

### Transaction Logging
```javascript
// Automatically logs all transactions
inventoryManager.on('transactionComplete', (transaction) => {
  console.log(`📋 Transaction ${transaction.transactionId} completed`);
});
```

## Error Handling

The system includes custom error classes:

- `InventoryNotificationError`: Custom application errors
- `VALIDATION_ERROR`: Input validation failures  
- `INSUFFICIENT_STOCK`: Stock level violations
- `PRODUCT_NOT_FOUND`: Missing product references
- `DUPLICATE_PRODUCT`: Unique constraint violations

## Testing

```bash
# Run tests
npm test

# Test specific endpoint
curl -X GET http://localhost:3000/products
```

## Monitoring and Logs

The application provides comprehensive logging:

- ✅ Transaction logs with timestamps
- ✅ Stock level notifications
- ✅ Error tracking with specific error types
- ✅ API request logging

## Security Considerations

- Input validation for all endpoints
- SQL injection prevention using parameterized queries
- Stock level validation to prevent negative values
- Transaction type validation

## Performance Features

- Database indexing for faster queries
- Pagination to handle large datasets
- Optimized SQL queries with JOINs
- Connection pooling support

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   ```
   Error: Database connection failed: ER_ACCESS_DENIED_ERROR
   ```
   **Solution**: Check MySQL credentials in `server.js`

2. **Port Already in Use**
   ```
   Error: listen EADDRINUSE: address already in use :::3000
   ```
   **Solution**: Kill process on port 3000 or change port in `server.js`

3. **MySQL Service Not Running**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:3306
   ```
   **Solution**: Start MySQL service
   ```bash
   # Ubuntu/Debian
   sudo systemctl start mysql
   
   # macOS with Homebrew
   brew services start mysql
   
   # Windows
   net start mysql
   ```

### Debug Mode
Enable detailed logging by setting environment variables:
```bash
DEBUG=inventory:* npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

**System Requirements Met:**
- ✅ ES6 Class Implementation
- ✅ MySQL Database Integration  
- ✅ Input Validation & Error Handling
- ✅ Pagination Support
- ✅ REST API without Express Framework
- ✅ Event Emitter Notifications
- ✅ Custom Error Classes
- ✅ Comprehensive Logging
- ✅ Transaction Management
- ✅ Inventory Reports

## 📄 Lisensi

Proyek ini bersifat **open-source**.
Silakan digunakan, dimodifikasi, dan dikembangkan sesuai kebutuhan.

---

✦ Dibuat dengan 💻 dan ☕ oleh [Aryaaazrr](https://github.com/Aryaaazrr)