-- Database Setup Script for Inventory Management System
-- Compatible with MySQL 5.7+ or MariaDB 10.2+

-- Create database
CREATE DATABASE IF NOT EXISTS inventory_db;
USE inventory_db;

-- Drop tables if they exist (for fresh installation)
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS products;

-- Create products table
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    category VARCHAR(100) NOT NULL,
    description TEXT,
    supplier_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_product_id (product_id),
    INDEX idx_category (category),
    INDEX idx_stock (stock)
);

-- Create customers table
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    customer_type ENUM('regular', 'premium', 'wholesale') DEFAULT 'regular',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_customer_id (customer_id),
    INDEX idx_customer_type (customer_type)
);

-- Create suppliers table
CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    contact_person VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_supplier_id (supplier_id)
);

-- Create transactions table
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(50) UNIQUE NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    customer_id VARCHAR(50),
    supplier_id VARCHAR(50),
    quantity INT NOT NULL CHECK (quantity > 0),
    type ENUM('sale', 'purchase', 'restock', 'return', 'adjustment') NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(5, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_product_id (product_id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Add foreign key constraints
ALTER TABLE products ADD CONSTRAINT fk_products_supplier 
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE transactions ADD CONSTRAINT fk_transactions_customers 
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE transactions ADD CONSTRAINT fk_transactions_suppliers 
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Create views for reporting
CREATE VIEW product_summary AS
SELECT 
    p.product_id,
    p.name,
    p.category,
    p.price,
    p.stock,
    p.stock * p.price as stock_value,
    COALESCE(sales.total_sold, 0) as total_sold,
    COALESCE(sales.total_revenue, 0) as total_revenue,
    p.created_at
FROM products p
LEFT JOIN (
    SELECT 
        product_id,
        SUM(quantity) as total_sold,
        SUM(total_amount) as total_revenue
    FROM transactions 
    WHERE type = 'sale'
    GROUP BY product_id
) sales ON p.product_id = sales.product_id;

-- Create view for low stock products
CREATE VIEW product_low_stock AS
SELECT 
    product_id,
    name,
    category,
    stock,
    price,
    stock * price as stock_value
FROM products 
WHERE stock <= 10
ORDER BY stock ASC;

-- Insert sample data

-- Insert suppliers
INSERT INTO suppliers (supplier_id, name, email, phone, contact_person) VALUES
('SUP001', 'Supplier 1.', 'supplier1@inventory.com', '088878678927', 'Supplier 1'),
('SUP002', 'Supplier 2', 'supplier2@inventory.com', '088878678928', 'Supplier 2'),
('SUP003', 'Supplier 3', 'supplier3@inventory.com', '088878678929', 'Supplier 3');

-- Insert customers
INSERT INTO customers (customer_id, name, email, phone, customer_type) VALUES
('CUST001', 'Customer 1', 'customer1@inventory.com', '088878678000', 'regular'),
('CUST002', 'Customer 2', 'customer2@inventory.com', '088878678100', 'premium'),
('CUST003', 'Customer 3', 'customer3@inventory.com', '088878678200', 'standard'),
('CUST004', 'Customer 4', 'customer4@inventory.com', '088878678300', 'regular'),
('CUST005', 'Customer 5', 'customer5@inventory.com', '088878678400', 'standard');

-- Insert sample products
INSERT INTO products (product_id, name, price, stock, category, description, supplier_id) VALUES
('PROD001', 'Laptop ASUS X550', 8500000.00, 15, 'Electronics', 'ASUS X550 Laptop with Intel i5 processor', 'SUP001'),
('PROD002', 'Mouse Wireless Logitech', 250000.00, 50, 'Electronics', 'Wireless optical mouse', 'SUP002'),
('PROD003', 'Keyboard Mechanical', 450000.00, 25, 'Electronics', 'RGB Mechanical Keyboard', 'SUP002'),
('PROD004', 'Monitor LED 24 inch', 1800000.00, 8, 'Electronics', '24 inch Full HD LED Monitor', 'SUP001'),
('PROD005', 'Printer Canon MP280', 650000.00, 12, 'Electronics', 'All-in-one printer scanner', 'SUP003'),
('PROD006', 'External HDD 1TB', 750000.00, 20, 'Storage', 'Portable External Hard Drive 1TB', 'SUP001'),
('PROD007', 'USB Flash Drive 32GB', 85000.00, 100, 'Storage', 'High-speed USB 3.0 Flash Drive', 'SUP002'),
('PROD008', 'Webcam HD 1080p', 350000.00, 30, 'Electronics', 'Full HD Web Camera with Microphone', 'SUP002'),
('PROD009', 'Speaker Bluetooth', 280000.00, 45, 'Electronics', 'Portable Bluetooth Speaker', 'SUP003'),
('PROD010', 'Power Bank 10000mAh', 180000.00, 5, 'Electronics', 'Portable Power Bank with fast charging', 'SUP001');

-- Insert sample transactions
INSERT INTO transactions (transaction_id, product_id, customer_id, quantity, type, unit_price, total_amount, created_at) VALUES
('TXN001', 'PROD001', 'CUST001', 2, 'sale', 8500000.00, 17000000.00, '2024-01-15 10:30:00'),
('TXN002', 'PROD002', 'CUST002', 5, 'sale', 250000.00, 1250000.00, '2024-01-16 14:15:00'),
('TXN003', 'PROD003', 'CUST003', 10, 'sale', 450000.00, 4500000.00, '2024-01-18 09:45:00'),
('TXN004', 'PROD004', 'CUST001', 1, 'sale', 1800000.00, 1800000.00, '2024-01-20 16:20:00'),
('TXN005', 'PROD005', 'CUST004', 3, 'sale', 650000.00, 1950000.00, '2024-01-22 11:10:00'),
('TXN006', 'PROD006', 'CUST002', 2, 'sale', 750000.00, 1500000.00, '2024-02-01 13:30:00'),
('TXN007', 'PROD007', 'CUST005', 20, 'sale', 85000.00, 1700000.00, '2024-02-03 08:45:00'),
('TXN008', 'PROD008', 'CUST001', 4, 'sale', 350000.00, 1400000.00, '2024-02-05 15:25:00'),
('TXN009', 'PROD009', 'CUST003', 8, 'sale', 280000.00, 2240000.00, '2024-02-08 12:15:00'),
('TXN010', 'PROD010', 'CUST002', 3, 'sale', 180000.00, 540000.00, '2024-02-10 17:40:00'),
('TXN011', 'PROD001', 'CUST004', 1, 'sale', 8500000.00, 8500000.00, '2024-02-12 10:20:00'),
('TXN012', 'PROD002', 'CUST005', 15, 'sale', 250000.00, 3750000.00, '2024-02-15 14:50:00'),
('TXN013', 'PROD003', 'CUST001', 2, 'sale', 450000.00, 900000.00, '2024-02-18 09:30:00'),
('TXN014', 'PROD007', 'CUST002', 10, 'sale', 85000.00, 850000.00, '2024-02-20 16:45:00'),
('TXN015', 'PROD009', 'CUST003', 5, 'sale', 280000.00, 1400000.00, '2024-02-22 11:35:00'),
('TXN016', 'PROD001', 'CUST005', 3, 'sale', 8500000.00, 25500000.00, '2024-03-01 13:20:00'),
('TXN017', 'PROD004', 'CUST002', 2, 'sale', 1800000.00, 3600000.00, '2024-03-03 08:15:00'),
('TXN018', 'PROD006', 'CUST004', 4, 'sale', 750000.00, 3000000.00, '2024-03-05 15:40:00'),
('TXN019', 'PROD008', 'CUST001', 6, 'sale', 350000.00, 2100000.00, '2024-03-08 12:25:00'),
('TXN020', 'PROD010', 'CUST003', 2, 'sale', 180000.00, 360000.00, '2024-03-10 17:10:00');

-- Insert purchase transactions (restocking)
INSERT INTO transactions (transaction_id, product_id, supplier_id, quantity, type, unit_price, total_amount, created_at) VALUES
('PUR001', 'PROD001', 'SUP001', 10, 'purchase', 7500000.00, 75000000.00, '2024-01-05 09:00:00'),
('PUR002', 'PROD002', 'SUP002', 100, 'purchase', 200000.00, 20000000.00, '2024-01-08 10:30:00'),
('PUR003', 'PROD003', 'SUP002', 50, 'purchase', 350000.00, 17500000.00, '2024-01-10 14:15:00'),
('PUR004', 'PROD004', 'SUP001', 20, 'purchase', 1500000.00, 30000000.00, '2024-01-12 11:45:00'),
('PUR005', 'PROD005', 'SUP003', 25, 'purchase', 500000.00, 12500000.00, '2024-01-15 16:20:00');

-- Create indexes for better performance
CREATE INDEX idx_transactions_date_type ON transactions(created_at, type);
CREATE INDEX idx_transactions_product_date ON transactions(product_id, created_at);
CREATE INDEX idx_products_category_stock ON products(category, stock);

-- Create stored procedures for common operations

DELIMITER //

-- Procedure to get sales report by date range
CREATE PROCEDURE GetSalesReport(
    IN start_date DATE,
    IN end_date DATE
)
BEGIN
    SELECT 
        DATE_FORMAT(t.created_at, '%Y-%m') as month,
        p.category,
        p.product_id,
        p.name as product_name,
        SUM(t.quantity) as total_quantity,
        SUM(t.total_amount) as total_sales,
        AVG(t.unit_price) as avg_price
    FROM transactions t
    JOIN products p ON t.product_id = p.product_id
    WHERE t.type = 'sale'
    AND DATE(t.created_at) BETWEEN start_date AND end_date
    GROUP BY month, p.category, p.product_id
    ORDER BY total_sales DESC;
END //

-- Procedure to get top selling products
CREATE PROCEDURE GetTopProducts(
    IN start_date DATE,
    IN end_date DATE,
    IN limit_count INT
)
BEGIN
    SELECT 
        p.product_id,
        p.name as product_name,
        p.category,
        SUM(t.quantity) as total_quantity,
        SUM(t.total_amount) as total_sales,
        COUNT(t.id) as transaction_count
    FROM transactions t
    JOIN products p ON t.product_id = p.product_id
    WHERE t.type = 'sale'
    AND DATE(t.created_at) BETWEEN start_date AND end_date
    GROUP BY p.product_id
    ORDER BY total_sales DESC
    LIMIT limit_count;
END //

-- Procedure to update product stock
CREATE PROCEDURE UpdateProductStock(
    IN p_product_id VARCHAR(50),
    IN p_quantity INT,
    IN p_transaction_type VARCHAR(20)
)
BEGIN
    DECLARE current_stock INT;
    DECLARE new_stock INT;
    
    -- Get current stock
    SELECT stock INTO current_stock 
    FROM products 
    WHERE product_id = p_product_id;
    
    -- Calculate new stock
    IF p_transaction_type = 'sale' THEN
        SET new_stock = current_stock - p_quantity;
    ELSE
        SET new_stock = current_stock + p_quantity;
    END IF;
    
    -- Validate stock
    IF new_stock < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock';
    END IF;
    
    -- Update stock
    UPDATE products 
    SET stock = new_stock, updated_at = NOW()
    WHERE product_id = p_product_id;
    
    SELECT new_stock as updated_stock;
END //

DELIMITER ;

-- Create triggers for automatic stock updates
DELIMITER //

CREATE TRIGGER trg_transaction_after_insert
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
    IF NEW.type = 'sale' THEN
        UPDATE products 
        SET stock = stock - NEW.quantity, updated_at = NOW()
        WHERE product_id = NEW.product_id;
    ELSEIF NEW.type IN ('purchase', 'restock') THEN
        UPDATE products 
        SET stock = stock + NEW.quantity, updated_at = NOW()
        WHERE product_id = NEW.product_id;
    END IF;
END //

DELIMITER ;

-- Grant privileges (adjust username and password as needed)
-- CREATE USER IF NOT EXISTS 'inventory_user'@'localhost' IDENTIFIED BY 'inventory_password';
-- GRANT ALL PRIVILEGES ON inventory_db.* TO 'inventory_user'@'localhost';
-- FLUSH PRIVILEGES;

-- Display initial data summary
SELECT 'Database setup completed successfully!' as Status;

SELECT 
    'Products' as Entity,
    COUNT(*) as Count
FROM products

UNION ALL

SELECT 
    'Customers' as Entity,
    COUNT(*) as Count
FROM customers

UNION ALL

SELECT 
    'Suppliers' as Entity,
    COUNT(*) as Count
FROM suppliers

UNION ALL

SELECT 
    'Transactions' as Entity,
    COUNT(*) as Count
FROM transactions;