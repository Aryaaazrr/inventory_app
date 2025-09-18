const mysql = require("mysql2/promise");
const EventEmitter = require("events");

class InventoryNotificationError extends Error {
  constructor(message, type = "INVENTORY_ERROR") {
    super(message);
    this.name = "InventoryNotificationError";
    this.type = type;
  }
}

class InventoryManager extends EventEmitter {
  constructor(dbConfig) {
    super();
    this.dbConfig = dbConfig;
    this.connection = null;
    this.lowStockThreshold = 10;
    this.init();
  }

  async init() {
    try {
      this.connection = await mysql.createConnection(this.dbConfig);
      console.log("Database connected successfully");

      // Setup event listeners
      this.on("lowStock", this.handleLowStockNotification);
      this.on("transactionComplete", this.logTransaction);
    } catch (error) {
      throw new InventoryNotificationError(`Database connection failed: ${error.message}`, "DB_CONNECTION_ERROR");
    }
  }

  // Custom error handling and logging
  handleLowStockNotification(product) {
    console.log(`🚨 LOW STOCK ALERT: Product ${product.name} (ID: ${product.id}) has ${product.stock} units remaining`);
    // Here you could implement email notifications, SMS, etc.
  }

  logTransaction(transaction) {
    const timestamp = new Date().toISOString();
    console.log(`📋 TRANSACTION LOG [${timestamp}]: ${transaction.type.toUpperCase()} - Product ID: ${transaction.productId}, Quantity: ${transaction.quantity}, Customer: ${transaction.customerId}`);
  }

  // Validation helper
  validateInput(data, rules) {
    for (const [field, rule] of Object.entries(rules)) {
      if (rule.required && !data[field]) {
        throw new InventoryNotificationError(`${field} is required`, "VALIDATION_ERROR");
      }
      if (rule.type && typeof data[field] !== rule.type) {
        throw new InventoryNotificationError(`${field} must be of type ${rule.type}`, "VALIDATION_ERROR");
      }
      if (rule.min && data[field] < rule.min) {
        throw new InventoryNotificationError(`${field} must be at least ${rule.min}`, "VALIDATION_ERROR");
      }
    }
  }

  async addProduct(productId, name, price, stock, category) {
    try {
      this.validateInput(
        { productId, name, price, stock, category },
        {
          productId: { required: true, type: "string" },
          name: { required: true, type: "string" },
          price: { required: true, type: "number", min: 0 },
          stock: { required: true, type: "number", min: 0 },
          category: { required: true, type: "string" },
        }
      );

      const [result] = await this.connection.execute("INSERT INTO products (product_id, name, price, stock, category, created_at) VALUES (?, ?, ?, ?, ?, NOW())", [productId, name, price, stock, category]);

      console.log(`✅ Product added: ${name} with ${stock} units`);
      return { success: true, id: result.insertId };
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw new InventoryNotificationError(`Product with ID ${productId} already exists`, "DUPLICATE_PRODUCT");
      }
      throw error;
    }
  }

  async updateStock(productId, quantity, transactionType) {
    try {
      this.validateInput(
        { productId, quantity, transactionType },
        {
          productId: { required: true, type: "string" },
          quantity: { required: true, type: "number", min: 1 },
          transactionType: { required: true, type: "string" },
        }
      );

      const [products] = await this.connection.execute("SELECT * FROM products WHERE product_id = ?", [productId]);

      if (products.length === 0) {
        throw new InventoryNotificationError(`Product with ID ${productId} not found`, "PRODUCT_NOT_FOUND");
      }

      const product = products[0];
      let newStock;

      if (transactionType === "purchase" || transactionType === "restock") {
        newStock = product.stock + quantity;
      } else if (transactionType === "sale") {
        if (product.stock < quantity) {
          throw new InventoryNotificationError(`Insufficient stock. Available: ${product.stock}, Requested: ${quantity}`, "INSUFFICIENT_STOCK");
        }
        newStock = product.stock - quantity;
      } else {
        throw new InventoryNotificationError(`Invalid transaction type: ${transactionType}`, "INVALID_TRANSACTION_TYPE");
      }

      await this.connection.execute("UPDATE products SET stock = ?, updated_at = NOW() WHERE product_id = ?", [newStock, productId]);

      // Check for low stock and emit event
      if (newStock <= this.lowStockThreshold) {
        this.emit("lowStock", { ...product, stock: newStock });
      }

      return { success: true, oldStock: product.stock, newStock };
    } catch (error) {
      throw error;
    }
  }

  async createTransaction(transactionId, productId, quantity, type, customerId) {
    try {
      this.validateInput(
        { transactionId, productId, quantity, type, customerId },
        {
          transactionId: { required: true, type: "string" },
          productId: { required: true, type: "string" },
          quantity: { required: true, type: "number", min: 1 },
          type: { required: true, type: "string" },
          customerId: { required: true, type: "string" },
        }
      );

      // Get product details for price calculation
      const [products] = await this.connection.execute("SELECT * FROM products WHERE product_id = ?", [productId]);

      if (products.length === 0) {
        throw new InventoryNotificationError(`Product with ID ${productId} not found`, "PRODUCT_NOT_FOUND");
      }

      const product = products[0];
      const totalAmount = product.price * quantity;

      // Create transaction record
      await this.connection.execute("INSERT INTO transactions (transaction_id, product_id, quantity, type, customer_id, unit_price, total_amount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())", [
        transactionId,
        productId,
        quantity,
        type,
        customerId,
        product.price,
        totalAmount,
      ]);

      // Update stock
      await this.updateStock(productId, quantity, type);

      // Emit transaction complete event
      this.emit("transactionComplete", {
        transactionId,
        productId,
        quantity,
        type,
        customerId,
        totalAmount,
      });

      return { success: true, totalAmount };
    } catch (error) {
      throw error;
    }
  }

  async getProductsByCategory(category, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      let query = "SELECT * FROM products";
      let countQuery = "SELECT COUNT(*) as total FROM products";
      let params = [];

      if (category) {
        query += " WHERE category = ?";
        countQuery += " WHERE category = ?";
        params.push(category);
      }

      query += " ORDER BY name LIMIT ? OFFSET ?";
      params.push(limit, offset);

      const [products] = await this.connection.execute(query, params);
      const [countResult] = await this.connection.execute(countQuery, category ? [category] : []);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      return {
        products,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getInventoryValue() {
    try {
      const [result] = await this.connection.execute("SELECT SUM(price * stock) as totalValue, COUNT(*) as totalProducts, SUM(stock) as totalStock FROM products");

      return {
        totalValue: result[0].totalValue || 0,
        totalProducts: result[0].totalProducts || 0,
        totalStock: result[0].totalStock || 0,
      };
    } catch (error) {
      throw error;
    }
  }

  async getProductHistory(productId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const [transactions] = await this.connection.execute(
        `SELECT t.*, p.name as product_name 
         FROM transactions t 
         JOIN products p ON t.product_id = p.product_id 
         WHERE t.product_id = ? 
         ORDER BY t.created_at DESC 
         LIMIT ? OFFSET ?`,
        [productId, limit, offset]
      );

      const [countResult] = await this.connection.execute("SELECT COUNT(*) as total FROM transactions WHERE product_id = ?", [productId]);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      return {
        transactions,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getLowStockProducts(threshold = null) {
    try {
      const stockThreshold = threshold || this.lowStockThreshold;
      const [products] = await this.connection.execute("SELECT * FROM products WHERE stock <= ? ORDER BY stock ASC", [stockThreshold]);

      return products;
    } catch (error) {
      throw error;
    }
  }

  async getSalesReport(startDate = null, endDate = null) {
    try {
      let query = `
        SELECT 
          DATE_FORMAT(t.created_at, '%Y-%m') as month,
          p.category,
          p.product_id,
          p.name as product_name,
          SUM(t.quantity) as total_quantity,
          SUM(t.total_amount) as total_sales
        FROM transactions t
        JOIN products p ON t.product_id = p.product_id
        WHERE t.type = 'sale'
      `;

      let params = [];

      if (startDate && endDate) {
        query += " AND t.created_at BETWEEN ? AND ?";
        params.push(startDate, endDate);
      }

      query += " GROUP BY month, p.category, p.product_id ORDER BY total_sales DESC";

      const [results] = await this.connection.execute(query, params);

      return results;
    } catch (error) {
      throw error;
    }
  }

  async getTop10Products(startDate = null, endDate = null) {
    try {
      let query = `
        SELECT 
          p.product_id,
          p.name as product_name,
          p.category,
          SUM(t.quantity) as total_quantity,
          SUM(t.total_amount) as total_sales
        FROM transactions t
        JOIN products p ON t.product_id = p.product_id
        WHERE t.type = 'sale'
      `;

      let params = [];

      if (startDate && endDate) {
        query += " AND t.created_at BETWEEN ? AND ?";
        params.push(startDate, endDate);
      }

      query += " GROUP BY p.product_id ORDER BY total_sales DESC LIMIT 10";

      const [results] = await this.connection.execute(query, params);

      return results;
    } catch (error) {
      throw error;
    }
  }

  async close() {
    if (this.connection) {
      await this.connection.end();
      console.log("Database connection closed");
    }
  }
}

module.exports = { InventoryManager, InventoryNotificationError };
