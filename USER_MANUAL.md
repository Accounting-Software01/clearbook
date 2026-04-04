# ClearBook Accounting Software - User Manual

## Part 1: Introduction

### 1.1 Welcome to ClearBook

Welcome! ClearBook is your company's new hub for all financial activities. From sending invoices to running detailed financial reports, this software is designed to make managing your company's finances clear and straightforward. 

This manual will guide you through the essential features and day-to-day operations.

### 1.2 Logging In

To begin, navigate to the ClearBook login page provided by your system administrator and enter your assigned username and password.

### 1.3 Navigating the Dashboard

After logging in, you will land on the **Dashboard**. Think of this as your financial command center. Here you will find:

*   **Key Metrics:** At-a-glance numbers like total sales, expenses, and cash balances.
*   **Sales Charts:** A visual representation of your company's sales performance over time.
*   **Recent Activities:** A list of the latest transactions and activities entered into the system.
*   **Sidebar Navigation:** On the left side of the screen is the main menu you will use to access all other modules like Sales, Procurement, and Reports.

---

## Part 2: Initial Setup

Before you begin daily operations, a few one-time setup steps are required to ensure the system reflects your business accurately.

### 2.1 Configuring Your Company Details

This section allows you to set your company's name, address, tax ID, and logo, which will appear on official documents like invoices.

1.  Navigate to **Settings > Company** from the sidebar.
2.  Fill in all the required fields.
3.  Upload your company logo.
4.  Click **Save Changes**.

### 2.2 Understanding the Chart of Accounts

The **Chart of Accounts (CoA)** is the complete list of all financial accounts for your business. It is the backbone of your accounting system. You can view it by navigating to **Accounting > Chart of Accounts**.

*   **Account Types:** Accounts are organized into types: **Assets** (what you own), **Liabilities** (what you owe), **Equity** (net worth), **Revenue** (what you earn), and **Expenses** (what you spend).

Your system administrator will typically pre-load a standard Chart of Accounts for you.

### 2.3 Entering Opening Balances

To ensure your reports are accurate from day one, you must enter the closing balances from your previous accounting system as the **Opening Balances** in ClearBook.

1.  Navigate to **Accounting > Opening Balances**.
2.  You will see a list of all your accounts.
3.  Carefully enter the closing balance for each account as of your transition date.
4.  Save your changes. **This is a critical one-time step.**

---

## Part 3: The Sales Cycle (Money In)

This section covers how to manage sales and receive payments from customers.

### 3.1 Adding a New Customer

1.  From the sidebar, go to **Sales > Customers**.
2.  Click the **Add New Customer** button.
3.  Fill in the customer's details, including their name, contact information, and any credit terms.
4.  Click **Save Customer**.

### 3.2 Creating and Sending a Sales Invoice

1.  Navigate to **Sales > Invoices**.
2.  Click **New Invoice**.
3.  Select the customer from the dropdown list.
4.  Enter the invoice date and payment due date.
5.  Add line items for the products or services you sold, including a description, quantity, and price.
6.  The system will automatically calculate totals and taxes.
7.  Review the invoice and click **Save and Send** to email it directly to the customer.

### 3.3 Recording Customer Payments (Receipts)

When a customer pays an invoice, you must record it in ClearBook.

1.  Go to **Sales > Receipts**.
2.  Click **New Receipt**.
3.  Select the customer who paid.
4.  The system will show a list of their unpaid invoices. Check the box next to the invoice(s) being paid.
5.  Enter the amount received and the date of payment.
6.  Select the bank account where the money was deposited.
7.  Click **Record Payment**.

### 3.4 Managing Customer Refunds (Credit Notes)

Use a Credit Note if you need to refund a customer or reduce the amount they owe on an invoice.

1.  Navigate to **Sales > Credit Notes**.
2.  Click **New Credit Note**.
3.  Select the customer and the original invoice you are crediting.
4.  Enter the amount to be credited and a reason.
5.  Save the Credit Note. You can then apply it to another invoice or record a cash refund.

---

## Part 4: The Expense Cycle (Money Out)

This section covers how to manage purchases and make payments to suppliers.

### 4.1 Adding a New Supplier

1.  From the sidebar, go to **Procurement > Suppliers**.
2.  Click **Add New Supplier**.
3.  Fill in the supplier's name, contact details, and payment terms.
4.  Click **Save Supplier**.

### 4.2 Creating a Purchase Order (PO)

A Purchase Order is a formal request to a supplier for goods or services.

1.  Navigate to **Procurement > Purchase Orders**.
2.  Click **New Purchase Order**.
3.  Select the supplier and enter the items you wish to order.
4.  Save and send the PO to your supplier for confirmation.

### 4.3 Recording a Supplier Bill

When you receive a bill from a supplier, you must enter it into the system to track what you owe.

1.  Go to **Procurement > Bills**.
2.  Click **New Bill**.
3.  Select the supplier from the dropdown.
4.  Enter the bill date and the payment due date.
5.  Add the line items from the supplier's bill. If you created a PO, you can often convert it directly into a bill.
6.  Assign each line item to an appropriate expense account (e.g., "Office Supplies").
7.  Click **Save Bill**.

### 4.4 Making Payments to Suppliers

1.  Navigate to **Payments > Payment Workbench**.
2.  The system will display all outstanding bills that are due for payment.
3.  Select the bills you wish to pay.
4.  Choose the bank account you are paying from.
5.  The system will generate a payment voucher. Review it and click **Approve and Record Payment**.

---

## Part 5: Advanced Operations

### 5.1 Manual Journal Entries

Journal Entries are used for special accounting adjustments, such as correcting errors or recording non-cash transactions like depreciation.

*   **Note:** Only make Journal Entries if you have accounting knowledge or are instructed to do so by your accountant.

1.  Go to **Accounting > Journal**.
2.  Click **New Journal Entry**.
3.  Enter a date and a clear narration explaining the purpose of the entry.
4.  In the lines below, enter the accounts, debits, and credits. **Total debits must always equal total credits.**
5.  Save the journal entry.

### 5.2 Inventory Management

ClearBook can track the quantity and value of your inventory items.

1.  Navigate to **Inventory > Items**.
2.  Here you can view your stock levels for Raw Materials, Finished Goods, and more.
3.  When you purchase inventory, it is added through the **Supplier Bill** process. When you sell it, it is removed through the **Sales Invoice** process.

### 5.3 Production & Bills of Materials (BOMs)

For manufacturing companies, ClearBook can manage the production process.

1.  **Bill of Materials (BOM):** First, define the recipe for your finished product by going to **Production > BOMs**. Here, you list all the raw materials needed to create one finished good.
2.  **Production Order:** When you want to manufacture items, create a **Production Order** from **Production > Manage Production**. The system will use the BOM to automatically allocate the required raw materials and create the finished goods in your inventory.

---

## Part 6: Financial Reporting

Reports are the most valuable output of your accounting system. They show you the financial performance and position of your business.

### 6.1 How to Run a Report

1.  Navigate to the **Reports** section in the sidebar.
2.  Select the report you want to view (e.g., "Income Statement").
3.  Choose the date range for the report.
4.  Click **Generate Report**.
5.  Most reports can be exported to **PDF** or **Excel** using the export buttons.

### 6.2 Key Financial Reports Explained

*   **General Ledger Report:** Shows every single transaction for a specific account over a period. This is perfect for auditing or understanding exactly what makes up a balance.
*   **Income Statement (Profit & Loss):** Shows your company's financial performance. It answers the question: "Are we profitable?" by subtracting your Expenses from your Revenue.
*   **Balance Sheet:** Provides a snapshot of your company's financial health at a single point in time. It shows what you own (Assets) and what you owe (Liabilities).
*   **Trial Balance:** A list of all accounts and their debit or credit balances. Accountants use this to ensure the books are in balance.

---

## Part 7: Settings & Administration

This section is typically for system administrators.

### 7.1 Managing Users and Permissions

1.  Navigate to **Settings > Users**.
2.  Here you can add new users and assign them roles.
3.  Roles define what a user can see and do in the system, ensuring staff only have access to the information they need for their job.

### 7.2 System Preferences

Navigate to **Settings > Preferences** to configure system-wide settings, such as the default date format or other operational parameters.
