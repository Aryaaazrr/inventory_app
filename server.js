const http = require("http");
const url = require("url");
const { InventoryManager, InventoryNotificationError } = require("./InventoryManager");

class APIServer {
  constructor(port = 3000) {
    this.port = port;
    this.inventoryManager = new InventoryManager({
      host: "localhost",
      user: "root",
      password: "password",
      database: "test_inventory",
    });

    this.server = http.createServer(this.handleRequest.bind(this));
  }

  // Helper method to parse JSON body
  parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (error) {
          reject(new Error("Invalid JSON"));
        }
      });
    });
  }

  // Helper method to send JSON response
  sendJSON(res, data, statusCode = 200) {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.statusCode = statusCode;
    res.end(JSON.stringify(data));
  }

  // Helper method to send error response
  sendError(res, message, statusCode = 400) {
    this.sendJSON(
      res,
      {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      statusCode
    );
  }

  async handleRequest(req, res) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const path = parsedUrl.pathname;
    const method = req.method;
    const query = Object.fromEntries(parsedUrl.searchParams.entries());

    console.log(`${method} ${path}`);

    // Handle CORS preflight
    if (method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.statusCode = 200;
      res.end();
      return;
    }

    try {
      // Route handlers
      if (path === "/products" && method === "POST") {
        await this.handleAddProduct(req, res);
      } else if (path === "/products" && method === "GET") {
        await this.handleGetProducts(req, res, query);
      } else if (path.match(/^\/products\/(.+)$/) && method === "PUT") {
        const productId = path.match(/^\/products\/(.+)$/)[1];
        await this.handleUpdateProduct(req, res, productId);
      } else if (path === "/transactions" && method === "POST") {
        await this.handleCreateTransaction(req, res);
      } else if (path === "/reports/inventory" && method === "GET") {
        await this.handleInventoryReport(req, res);
      } else if (path === "/reports/low-stock" && method === "GET") {
        await this.handleLowStockReport(req, res, query);
      } else if (path === "/reports/sales" && method === "GET") {
        await this.handleSalesReport(req, res, query);
      } else if (path === "/reports/top-products" && method === "GET") {
        await this.handleTopProductsReport(req, res, query);
      } else if (path.match(/^\/products\/(.+)\/history$/) && method === "GET") {
        const productId = path.match(/^\/products\/(.+)\/history$/)[1];
        await this.handleProductHistory(req, res, productId, query);
      } else {
        this.sendError(res, "Not Found", 404);
      }
    } catch (error) {
      console.error("Error:", error);

      if (error instanceof InventoryNotificationError) {
        this.sendError(res, error.message, 400);
      } else {
        this.sendError(res, "Internal Server Error", 500);
      }
    }
  }

  async handleAddProduct(req, res) {
    const body = await this.parseBody(req);
    const { productId, name, price, stock, category } = body;

    const result = await this.inventoryManager.addProduct(productId, name, price, stock, category);

    this.sendJSON(
      res,
      {
        success: true,
        message: "Product added successfully",
        data: result,
      },
      201
    );
  }

  async handleGetProducts(req, res, query) {
    const category = query.category;
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;

    const result = await this.inventoryManager.getProductsByCategory(category, page, limit);

    this.sendJSON(res, {
      success: true,
      data: result,
    });
  }

  async handleUpdateProduct(req, res, productId) {
    const body = await this.parseBody(req);
    const { quantity, transactionType } = body;

    const result = await this.inventoryManager.updateStock(productId, quantity, transactionType);

    this.sendJSON(res, {
      success: true,
      message: "Stock updated successfully",
      data: result,
    });
  }

  async handleCreateTransaction(req, res) {
    const body = await this.parseBody(req);
    const { transactionId, productId, quantity, type, customerId } = body;

    const result = await this.inventoryManager.createTransaction(transactionId, productId, quantity, type, customerId);

    this.sendJSON(
      res,
      {
        success: true,
        message: "Transaction created successfully",
        data: result,
      },
      201
    );
  }

  async handleInventoryReport(req, res) {
    const result = await this.inventoryManager.getInventoryValue();

    this.sendJSON(res, {
      success: true,
      data: result,
    });
  }

  async handleLowStockReport(req, res, query) {
    const threshold = parseInt(query.threshold);
    const result = await this.inventoryManager.getLowStockProducts(threshold);

    this.sendJSON(res, {
      success: true,
      data: {
        lowStockProducts: result,
        count: result.length,
      },
    });
  }

  async handleSalesReport(req, res, query) {
    const { startDate, endDate } = query;
    const result = await this.inventoryManager.getSalesReport(startDate, endDate);

    // Group data for dashboard
    const salesByMonth = {};
    const salesByCategory = {};
    let totalSales = 0;

    result.forEach((item) => {
      // Group by month
      if (!salesByMonth[item.month]) {
        salesByMonth[item.month] = 0;
      }
      salesByMonth[item.month] += parseFloat(item.total_sales);

      // Group by category
      if (!salesByCategory[item.category]) {
        salesByCategory[item.category] = 0;
      }
      salesByCategory[item.category] += parseFloat(item.total_sales);

      totalSales += parseFloat(item.total_sales);
    });

    this.sendJSON(res, {
      success: true,
      data: {
        raw: result,
        salesByMonth,
        salesByCategory,
        totalSales
      },
    });
  }

  async handleTopProductsReport(req, res, query) {
    const { startDate, endDate } = query;
    const result = await this.inventoryManager.getTop10Products(startDate, endDate);

    this.sendJSON(res, {
      success: true,
      data: result,
    });
  }

  async handleProductHistory(req, res, productId, query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;

    const result = await this.inventoryManager.getProductHistory(productId, page, limit);

    this.sendJSON(res, {
      success: true,
      data: result,
    });
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`🚀 Inventory Management API Server running on port ${this.port}`);
      console.log(`📋 Available endpoints:`);
      console.log(`   POST   /products                  - Add new product`);
      console.log(`   GET    /products                  - Get all products (with pagination & filters)`);
      console.log(`   PUT    /products/:id              - Update product stock`);
      console.log(`   POST   /transactions              - Create new transaction`);
      console.log(`   GET    /reports/inventory         - Get inventory value report`);
      console.log(`   GET    /reports/low-stock         - Get low stock products`);
      console.log(`   GET    /reports/sales             - Get sales report`);
      console.log(`   GET    /reports/top-products      - Get top 10 products`);
      console.log(`   GET    /products/:id/history      - Get product transaction history`);
    });
  }

  async stop() {
    if (this.inventoryManager) {
      await this.inventoryManager.close();
    }
    this.server.close();
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new APIServer(3000);
  server.start();

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("Shutting down server...");
    await server.stop();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("Shutting down server...");
    await server.stop();
    process.exit(0);
  });
}

module.exports = APIServer;
