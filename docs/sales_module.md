## Sales Module – Overview

The Sales Module manages all **customer sales activities**, from initiating a sale to delivering goods and tracking payments. It also generates all **sales-related documents** and audit trails required for operations, finance, and compliance.

---

## 1. Sales Form

The **Sales Form** is the primary interface used to create a sale.

### Key Functions

* Select customer
* Add products/services
* Enter quantity, price, discount
* Auto-calculate VAT and totals
* Choose payment type (Cash / Credit)
* Save as Draft or Post

### System Actions

* Validates stock availability
* Prepares data for invoice generation
* Links sale to customer account

---

## 2. Invoices

The **Invoice** is the official financial document issued to a customer.

### Invoice Captures

* Invoice number & date
* Customer details
* Itemized charges
* VAT and other taxes
* Total amount payable
* Payment status (Unpaid / Part-paid / Paid)

### Accounting Impact

* Records revenue
* Creates customer receivable (for credit sales)
* Posts VAT to VAT Output account

---

## 3. Customers Trail

The **Customers Trail** provides a complete master customers profile and registration of new customer and transaction history per customer.

### Includes

* Invoices issued
* Payments received
* Credit notes
* Outstanding balances
* Aging analysis

### Purpose

* Customer reconciliation
* Credit control
* Dispute resolution
* Audit transparency

---

## 4. Sales Trail

The **Sales Trail** is a system-wide log of all sales transactions.

### Tracks

* Date and time of sale
* User who processed the sale
* Invoice references
* Amounts and tax breakdown
* Status changes (Draft → Posted → Cancelled)

### Purpose

* Internal audit
* Fraud prevention
* Management review
* Compliance

---

## 5. Waybills

The **Waybill** is a logistics and delivery document generated from a sale or invoice.

### Contains

* Customer delivery details
* Items and quantities dispatched
* Vehicle / driver information
* Dispatch date
* Delivery confirmation status

### System Role

* Confirms goods have left the warehouse
* Links sales to inventory movement
* Supports delivery tracking

---

## How They Work Together (Flow)

```
Customer → Sales Form → Invoice → Waybill → Payment
              ↓
        Sales Trail & Customer Trail
```

---

## Business Value

✔ Accurate sales recording
✔ Complete audit trail
✔ Faster invoicing & delivery
✔ Better customer account management
✔ Compliance with VAT and financial reporting
