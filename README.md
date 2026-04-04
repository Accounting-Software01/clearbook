# ClearBook Accounting Software

ClearBook is a comprehensive, enterprise-grade accounting application designed to provide robust financial management and reporting capabilities. Built with a modern tech stack, it offers a modular, scalable, and intuitive solution for managing complex financial operations, from core accounting to inventory and production management.

## Table of Contents

1.  [About The Project](#about-the-project)
2.  [Key Features](#key-features)
3.  [Tech Stack](#tech-stack)
4.  [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Installation](#installation)
5.  [Project Structure](#project-structure)
    *   [Frontend](#frontend)
    *   [Backend](#backend)
6.  [Core Modules](#core-modules)
    *   [Dashboard](#dashboard)
    *   [General Ledger](#general-ledger)
    *   [Chart of Accounts](#chart-of-accounts)
    *   [Sales & Receivables](#sales--receivables)
    *   [Procurement & Payables](#procurement--payables)
    *   [Inventory Management](#inventory-management)
    *   [Production Module](#production-module)
    *   [Financial Reporting](#financial-reporting)
    *   [User Management & Settings](#user-management--settings)
7.  [API Reference](#api-reference)
8.  [Contributing](#contributing)
9.  [License](#license)

## About The Project

ClearBook was developed to address the need for a fully-featured, auditable, and user-friendly accounting system. Unlike off-the-shelf solutions, it provides a high degree of customization and transparency, allowing businesses to trace every transaction from its source to the financial statements. The system is designed to enforce compliance, streamline workflows, and provide actionable insights through detailed reporting.

## Key Features

*   **Full-Cycle Accounting:** Manage journal entries, accounts payable, accounts receivable, and automated bank reconciliation.
*   **Auditable Transactions:** Every entry is logged with user details, timestamps, and journal types, ensuring a complete audit trail.
*   **Advanced Reporting:** Generate real-time financial statements, including Balance Sheets, Income Statements, Cash Flow Statements, and General Ledgers.
*   **Inventory Control:** Track inventory levels across multiple categories, including raw materials, work-in-progress, and finished goods.
*   **Production Management:** Create and manage Bills of Materials (BOMs) and track production orders from start to finish.
*   **User & Access Control:** Fine-grained permissions system to control user access to different modules and features.
*   **Customizable Settings:** Configure company details, tax authorities, payment terms, and more.

## Tech Stack

*   **Frontend:**
    *   [Next.js](https://nextjs.org/) (React Framework)
    *   [TypeScript](https://www.typescriptlang.org/)
    *   [Tailwind CSS](https://tailwindcss.com/)
    *   [Shadcn/ui](https://ui.shadcn.com/) (Component Library)
*   **Backend:**
    *   [PHP](https://www.php.net/) (Server-side scripting)
    *   [MySQL](https://www.mysql.com/) (Database)
*   **Deployment:**
    *   Assumed to be a standard web server environment (e.g., Apache/Nginx with PHP support).

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   Node.js & npm (or yarn)
*   PHP 7.4+
*   MySQL 5.7+
*   A web server (e.g., Apache, Nginx)

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://your-repository-url.com/
    ```
2.  **Install Frontend Dependencies:**
    ```sh
    cd /path/to/project
    npm install
    ```
3.  **Configure Backend:**
    *   Set up a new MySQL database.
    *   Import the database schema (schema file to be created).
    *   Update the database connection details in `api/db_connect.php`.
4.  **Run the Development Server:**
    ```sh
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Project Structure

The project is organized into two main parts: a Next.js frontend and a PHP backend.

### Frontend (`src/`)

The `src/` directory contains all the React components, pages, hooks, and styles.

```
src/
├── app/                # Main application pages and layouts
│   ├── (app)/          # Authenticated routes
│   └── login/          # Login page
├── components/         # Reusable React components
├── hooks/              # Custom React hooks (e.g., useAuth)
├── lib/                # Utility functions and shared logic
└── ...
```

### Backend (`api/`)

The `api/` directory contains all the PHP scripts that serve as the backend API endpoints.

```
api/
├── clearbook/          # Core ClearBook module APIs
├── customers/          # Customer-related APIs
├── inventory/          # Inventory management APIs
├── reports/            # Reporting-related APIs
└── ...
```

## Core Modules

### Dashboard

The main landing page after login, providing a high-level overview of the company's financial health. It typically includes key metrics, recent activities, and navigation to other modules.

### General Ledger

The central repository for all financial transactions. The General Ledger provides a detailed, chronological record of all entries, complete with audit trails.

*   **Key Files:**
    *   `src/app/(app)/reports/general-ledger/page.tsx`
    *   `api/clearbook/get-general-ledger-v2.php`
*   **Features:**
    *   View transactions for any account and date range.
    *   Includes `posted_by` and `journal_type` for full auditability.
    *   Calculates opening, running, and closing balances.
    *   Export to PDF and Excel.

### Chart of Accounts

A complete listing of every account in the system, organized by type (Asset, Liability, Equity, Revenue, Expense).

*   **Key Files:**
    *   `src/components/accounting/ChartOfAccounts.tsx`
    *   `api/gl/get-chart-of-accounts.php`
*   **Features:**
    *   Create, view, and manage accounts.
    *   Defines account codes, names, types, and normal balances.

### Sales & Receivables

Manages all aspects of the sales cycle, from customer creation to invoice payment.

*   **Key Pages:**
    *   `src/app/(app)/sales/page.tsx`
    *   `src/app/(app)/customers/page.tsx`
*   **Features:**
    *   Create and manage customer profiles.
    *   Generate and send sales invoices.
    *   Track pending invoices and customer credit notes.
    *   Record customer payments.

### Procurement & Payables

Manages the purchasing cycle, from supplier registration to bill payment.

*   **Key Pages:**
    *   `src/app/(app)/procurement/page.tsx`
    *   `src/app/(app)/suppliers/page.tsx`
*   **Features:**
    *   Manage supplier information.
    *   Create and approve purchase orders.
    *   Record supplier invoices and track accounts payable.

### Inventory Management

Provides a comprehensive system for tracking all types of inventory.

*   **Key Page:** `src/app/(app)/inventory/page.tsx`
*   **Sub-modules:**
    *   Raw Materials
    *   Work-in-Progress
    *   Finished Goods
    *   Consignment Stock
    *   And more...

### Production Module

Designed for manufacturing operations, this module tracks the entire production process.

*   **Key Page:** `src/app/(app)/production/page.tsx`
*   **Features:**
    *   **Bills of Materials (BOMs):** Define the components required to produce a finished good.
    *   **Production Orders:** Issue and track production jobs.
    *   **Material Issuance:** Track the flow of raw materials into production.

### Financial Reporting

The system includes a suite of powerful reporting tools to provide financial insights.

*   **Key Reports:**
    *   **Balance Sheet:** `src/app/(app)/reports/balance-sheet/page.tsx`
    *   **Income Statement:** `src/app/(app)/reports/income-statement/page.tsx`
    *   **Cash Flow Statement:** `src/app/(app)/reports/cash-flow-statement/page.tsx`
    *   **Trial Balance:** `src/app/(app)/reports/trial-balance/page.tsx`

### User Management & Settings

Administrative controls for managing the system and its users.

*   **Key Pages:**
    *   `src/app/(app)/settings/users/page.tsx`
    *   `src/app/(app)/settings/company/page.tsx`
*   **Features:**
    *   Create users and assign roles.
    *   Manage detailed user permissions.
    *   Configure company-wide settings.

## API Reference

The backend API is a collection of PHP scripts that handle database interactions. Below are examples of key endpoints.

### Get General Ledger

*   **Endpoint:** `/api/clearbook/get-general-ledger-v2.php`
*   **Method:** `GET`
*   **Parameters:**
    *   `company_id` (string, required)
    *   `account_code` (string, required)
    *   `from_date` (string, required, `YYYY-MM-DD`)
    *   `to_date` (string, required, `YYYY-MM-DD`)
*   **Response:**
    ```json
    {
      "success": true,
      "summary": {
        "account_details": { ... },
        "opening_balance": 1000.00,
        "total_debit": 500.00,
        "total_credit": 200.00,
        "closing_balance": 1300.00
      },
      "transactions": [
        {
          "date": "2023-10-27",
          "reference": "JV-001",
          "description": "Sample transaction",
          "debit": 500.00,
          "credit": 0,
          "running_balance": 1500.00,
          "posted_by": "Admin User",
          "journal_type": "Journal Entry"
        }
      ]
    }
    ```

### Get Chart of Accounts

*   **Endpoint:** `/api/gl/get-chart-of-accounts.php`
*   **Method:** `GET`
*   **Parameters:**
    *   `company_id` (string, required)
*   **Response:**
    ```json
    [
      {
        "account_code": "1010",
        "account_name": "Cash on Hand",
        "account_type": "Asset",
        "normal_balance": "debit"
      }
    ]
    ```

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature''''`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

This project is licensed under the [MIT License](LICENSE).
