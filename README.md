 # 🚀 SUPPLIERA ERP

**Food Products Distribution & Supply Chain Management System**

SUPPLIERA is a full-stack ERP system designed to manage and connect core business operations for food product distribution companies.

The main goal is to bring **Sales, Purchases, Inventory, Warehouses, Customers, Suppliers, and Business Intelligence** into one connected platform.

> **Business Operations → Real Data → Analytics → Better Decisions**

---

## 📌 Project Overview

SUPPLIERA was developed to simulate a real-world business environment where different departments work with the same centralized data.

Instead of managing sales, purchases, inventory, and suppliers separately, SUPPLIERA connects these processes together.

For example:

**Purchase → Inventory → Warehouse → Sales → Customer → Analytics**

This allows business data to flow through the system and become useful information for decision-making.

---

## ✨ Key Features

### 🛒 Sales Management

* Create and manage sales invoices
* Add products and quantities
* Customer management
* Sales totals and calculations
* Discount management
* Discount approval workflow
* Invoice details and status tracking
* Sales analytics

### 📦 Purchase Management

* Create and manage purchase invoices
* Supplier management
* Purchase items and quantities
* Purchase totals
* Purchase history
* Purchase analytics
* Integration with inventory

### 🏭 Inventory Management

* Product management
* Categories
* Stock quantities
* Inventory batches
* Production dates
* Expiry dates
* Batch tracking
* Stock movement
* Warehouse management
* Expiry monitoring

### 🧾 Invoice Management

SUPPLIERA supports both:

* Sales Invoices
* Purchase Invoices

Invoices are connected with customers, suppliers, products, quantities, prices, discounts, and totals.

Reports can also be exported to:

* **Excel**
* **PDF**

---

## 👥 Customers & Suppliers

The system provides dedicated management for:

### Customers

* Add customers
* Edit customer information
* Delete customers
* View customer details
* Track customer activity

### Suppliers

* Supplier information
* Address & location
* Supplier transactions
* Purchase history
* Products supplied

---

## 🏢 Warehouse Management

SUPPLIERA supports multiple warehouses and inventory locations.

Warehouse management includes:

* Warehouse creation
* Warehouse information
* Stock management
* Inventory batches
* Product availability
* Warehouse-level inventory tracking

---

# 📊 Business Intelligence Dashboard

One of the main parts of SUPPLIERA is the **BI & Analytics Dashboard**.

The dashboard transforms transactional data into business insights.

### 📈 Sales Analytics

* Total Sales
* Number of Sales Invoices
* Sales Trends
* Best-Selling Products
* Customer Insights
* Sales Performance

### 💰 Profit Analytics

* Revenue
* Costs
* Profit
* Profit trends
* Business performance

### 🛒 Purchase Analytics

* Total Purchases
* Number of Purchase Invoices
* Purchase Trends
* Supplier-related insights
* Purchase performance

### 📦 Inventory Insights

* Current Stock
* Inventory Movement
* Low Stock Items
* Expiring Batches
* Product-level insights

---

## 📅 Dynamic Date Filtering

The analytics system supports different time periods:

* **Last 7 Days**
* **Last 30 Days**
* **This Month**
* **Custom Date Range**

The selected date range dynamically affects the displayed KPIs and charts.

This makes it easier to compare business performance across different periods.

---

# 🔐 Security & Access Control

Security was an important part of the project.

SUPPLIERA uses:

### RBAC — Role-Based Access Control

Different users can have different permissions based on their roles.

For example:

* Admin
* Manager
* Sales Manager
* Purchasing Manager
* Warehouse Manager

### RLS — Row-Level Security

**Supabase Row-Level Security** is used to control access to database records.

The goal is to ensure that users can only access the data they are authorized to access.

---

# 🗄️ Database

The backend is powered by:

**Supabase + PostgreSQL**

The database handles the main business entities and relationships between them.

Core entities include:

* Users
* Roles
* Products
* Categories
* Customers
* Suppliers
* Warehouses
* Inventory
* Inventory Batches
* Sales
* Sale Items
* Purchases
* Purchase Items
* Payments
* Discount Approvals

The database structure was designed around real business relationships rather than using static or mock data.

---

# 🔄 Business Workflow

SUPPLIERA connects different business processes together.

### Purchase Workflow

**Supplier**

↓

**Purchase Invoice**

↓

**Purchase Items**

↓

**Inventory**

↓

**Warehouse Stock**

---

### Sales Workflow

**Customer**

↓

**Sales Invoice**

↓

**Sale Items**

↓

**Stock Deduction**

↓

**Sales Analytics**

---

### Analytics Workflow

**Business Transactions**

↓

**PostgreSQL Database**

↓

**Data Processing**

↓

**KPIs & Charts**

↓

**Business Insights**

↓

**Better Decisions**

---

# 🛠️ Technology Stack

### Frontend

* **React**
* **TypeScript**
* **Vite**
* **Tailwind CSS**
* **shadcn/ui**
* **Lucide Icons**
* **Recharts**

### Backend & Database

* **Supabase**
* **PostgreSQL**
* **Supabase Authentication**
* **Row-Level Security (RLS)**

### Data & Analytics

* SQL
* Business KPIs
* Data aggregation
* Interactive dashboards
* Dynamic date filtering
* Sales & purchase analytics

### Reporting

* Excel Export
* PDF Export
* Invoice reporting

### AI-Assisted Development

* **Google Gemini**
* **Antigravity**

---

# 🤖 AI-Assisted Engineering

AI tools were used throughout the development process.

They helped with:

* Code generation
* Debugging
* Error analysis
* Testing
* UI/UX improvements
* Refactoring
* Problem solving
* Development acceleration

However, AI was treated as a **development assistant**, not as a replacement for engineering decisions.

The important part was still:

**Understanding the Business Requirements**

↓

**Designing the System**

↓

**Designing the Database**

↓

**Implementing the Workflow**

↓

**Testing Real Data**

↓

**Validating the Results**

↓

**Improving the Solution**

---

# 🎯 Project Goals

The main goals of SUPPLIERA were to build a system that demonstrates how different technical disciplines can work together.

### Business Analysis

Understanding real business processes and translating them into system workflows.

### Software Engineering

Building a structured, scalable and maintainable application.

### Database Engineering

Designing relational data structures and business relationships using PostgreSQL.

### Data Analytics

Transforming transactional data into meaningful KPIs and insights.

### Business Intelligence

Helping decision-makers understand business performance through dashboards.

### AI-Assisted Development

Using modern AI tools to improve development speed and problem-solving.

---

# 🌍 Real-World Use Case

SUPPLIERA is designed around a realistic **Food Products Distribution** scenario.

A typical business process could look like:

**Supplier → Purchase → Warehouse → Inventory → Sale → Customer → Analytics**

This creates a connected data flow across the entire business.

Instead of looking at each department separately, management can see the bigger picture.

---

# 📈 What I Learned

Building SUPPLIERA helped me strengthen my experience across multiple areas:

* ERP Systems
* Business Analysis
* Data Analytics
* Business Intelligence
* SQL & PostgreSQL
* Database Design
* React & TypeScript
* Supabase
* Authentication & Authorization
* RLS Security
* Dashboard Development
* AI-Assisted Engineering

The biggest lesson was that building an ERP system is not only about writing code.

It is about understanding **how the business works**, how data moves through the organization, and how that data can support better decisions.

---

# 🚀 Future Improvements

SUPPLIERA can continue to evolve with additional features such as:

* Advanced BI dashboards
* More financial reports
* Automated notifications
* Advanced inventory forecasting
* Supplier performance analytics
* Customer segmentation
* Advanced audit logs
* Automated workflows
* AI-powered business insights
* More integrations with external systems

---

# 👨‍💻 Project Focus

SUPPLIERA combines:

**ERP + Data Analytics + Business Intelligence + SQL + Software Engineering + AI**

into one practical business application.

The project represents my approach to building solutions where **technology is connected to business value**, not just functionality.

---


## ⭐ If you find this project interesting

Feel free to explore the repository, review the architecture, and share your feedback.

I’m continuously improving SUPPLIERA and expanding its capabilities as a real-world business solution.

**Business Operations → Data → Analytics → Decisions 🚀**
