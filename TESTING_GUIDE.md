# GarageBook Version 1.1.2 – Complete QA Testing Guide

Welcome to the **GarageBook v1.1.2 Production QA Testing & Execution Guide**.

This guide is designed for **garage owners, workshop managers, and QA testers** to verify every feature, workflow, and performance optimization step-by-step without requiring technical programming knowledge.

---

## 📋 Table of Contents
1. [Executive Overview & Test Setup](#1-executive-overview--test-setup)
2. [Testing Artifacts Overview](#2-testing-artifacts-overview)
3. [Step-by-Step Testing Walkthrough](#3-step-by-step-testing-walkthrough)
   - [Workflow 1: Customer Arrival & Vehicle Registration](#workflow-1-customer-arrival--vehicle-registration)
   - [Workflow 2: Queue Management & Mechanic Assignment](#workflow-2-queue-management--mechanic-assignment)
   - [Workflow 3: Shop Floor Roster & Live Stopwatch Timers](#workflow-3-shop-floor-roster--live-stopwatch-timers)
   - [Workflow 4: End Job & Labour Validation Confirmation](#workflow-4-end-job--labour-validation-confirmation)
   - [Workflow 5: Bill Generation & Advance Payment Deduction](#workflow-5-bill-generation--advance-payment-deduction)
   - [Workflow 6: Vehicle Delivery & Queue Clearance](#workflow-6-vehicle-delivery--queue-clearance)
   - [Workflow 7: Reports, Drawer Tally & CA Exports](#workflow-7-reports-drawer-tally--ca-exports)
   - [Workflow 8: Instant Universal Search](#workflow-8-instant-universal-search)
   - [Workflow 9: Real-time Desktop / Mobile Sync](#workflow-9-real-time-desktop--mobile-sync)
   - [Workflow 10: PWA Installation & Offline Support](#workflow-10-pwa-installation--offline-support)
4. [Bug Tracking & Severity Guidelines](#4-bug-tracking--severity-guidelines)
5. [Summary Checklist](#5-summary-checklist)

---

## 1. Executive Overview & Test Setup

### Recommended Testing Devices
- **Mobile PWA**: Android Chrome / iOS Safari (Installed as PWA or viewed in mobile browser mode at 360px–412px width).
- **Desktop Web**: Google Chrome / Microsoft Edge (1920x1080 resolution).

### Prerequisites
1. Ensure the web application server is running locally or deployed on Vercel/Supabase.
2. Log in with test garage credentials or click **Demo Login**.

---

## 2. Testing Artifacts Overview

You have been provided with two complete testing documents:
1. **`GarageBook_Test_Checklist.xlsx`**: A 3-sheet production spreadsheet containing **415 detailed test cases** spanning 27 modules.
   - **Sheet 1 (`QA Summary Dashboard`)**: Real-time pass/fail metrics and module breakdown.
   - **Sheet 2 (`Test Cases`)**: 415 test rows with expected results, mobile/desktop status, and remarks.
   - **Sheet 3 (`Bug Log`)**: Defect logging table with severity (P0–P3) and developer notes.
2. **`TESTING_GUIDE.md`** *(This File)*: Step-by-step instructions for executing each workflow manually.

---

## 3. Step-by-Step Testing Walkthrough

### Workflow 1: Customer Arrival & Vehicle Registration
**Goal**: Register customer, vehicle details, customer complaints, and optional advance payment without generating a bill.

- **Step 1.1**: Open the app and click **➕ New Job** or navigate to `/entry/new`.
- **Step 1.2**: Enter customer phone number (e.g. `9876543210`).
  - *Expected Result*: If customer exists, Customer Name and previous vehicles auto-fill. If new, fields remain blank for custom entry.
- **Step 1.3**: Enter Vehicle Number (e.g. `DL3SCA1234`), Brand (e.g. `Honda`), and Model (e.g. `Activa 6G`).
- **Step 1.4**: Select Customer Complaints from preset badges (e.g. `General Service`, `Brake Problem`, `Oil Change`) or type a custom complaint (e.g. `Noise from silencer`).
  - *Expected Result*: Complaints appear as removable pills. Custom complaints are auto-learned for future suggestions.
- **Step 1.5**: Enter optional **Advance Payment** (e.g. `₹500`) and select Payment Mode (`UPI`).
- **Step 1.6**: Click **Put Vehicle in Queue**.
  - *Expected Result*: Customer, vehicle, complaints, and advance payment are saved. Vehicle enters queue with status **Waiting**. **NO bill or invoice is created at this stage.**

---

### Workflow 2: Queue Management & Mechanic Assignment
**Goal**: Verify oldest-first queue sorting, timer badges, and mechanic assignment transitions.

- **Step 2.1**: Navigate to `/queue` or click **🚗 Open Service Queue** on Dashboard.
- **Step 2.2**: Observe queue order.
  - *Expected Result*: Vehicles are sorted **oldest check-in first**.
- **Step 2.3**: Check the waiting badge on the vehicle card.
  - *Expected Result*: Shows elapsed waiting badge (e.g., `Waiting (15 min)`).
- **Step 2.4**: Click **Assign Mechanic** dropdown and select a mechanic (e.g. `Ramesh`).
  - *Expected Result*: Vehicle status updates to **Assigned** / **Working** and transitions out of the Waiting queue.

---

### Workflow 3: Shop Floor Roster & Live Stopwatch Timers
**Goal**: Verify live stopwatch timers, adding spare parts/labour, and card actions.

- **Step 3.1**: Navigate to `/working` (Working Jobs Roster).
- **Step 3.2**: Check the job card.
  - *Expected Result*: Displays Vehicle Number, Customer Name, Assigned Mechanic, Started At timestamp, and a ticking live stopwatch timer.
- **Step 3.3**: Click **Pause**.
  - *Expected Result*: Stopwatch timer pauses, status changes to `PAUSED`, and badge updates.
- **Step 3.4**: Click **Play**.
  - *Expected Result*: Stopwatch timer resumes ticking.
- **Step 3.5**: Click **+ Parts**.
  - *Expected Result*: Modal dialog opens. Type part name (e.g., `Engine Oil`), quantity (`1`), and price (`₹350`). Click **Save Part**. Part appears on card.
- **Step 3.6**: Click **+ Labour**.
  - *Expected Result*: Modal dialog opens. Select service (e.g., `Paid Service`), charge (`₹250`), and discount (`₹0`). Click **Save Labour**. Service appears on card.
- **Step 3.7**: On Mobile PWA (360px width), verify all buttons (`+ Parts`, `+ Labour`, `Pause`, `Customer`, `Share`, `End Job`) are fully visible without clipping.

---

### Workflow 4: End Job & Labour Validation Confirmation
**Goal**: Verify labour check prompt when completing a job.

- **Step 4.1**: Create a test job with 0 labour services added.
- **Step 4.2**: Click **End Job**.
  - *Expected Result*: System displays a confirmation dialog:
    > *"No labour charges have been entered for this vehicle. Would you like to add labour charges before ending work?"*
    > Buttons: `+ Add Labour Charges` | `Continue Without Labour`
- **Step 4.3**: Click `+ Add Labour Charges`.
  - *Expected Result*: Modal opens to add labour.
- **Step 4.4**: Click **End Job** on a job with valid labour (or click `Continue Without Labour`).
  - *Expected Result*: Timer completes, status sets to `Completed`, and card displays a blue `Bill` button linking to invoice generation.

---

### Workflow 5: Bill Generation & Advance Payment Deduction
**Goal**: Generate bill, verify advance payment accounting formula, and select payment status.

- **Step 5.1**: Click **Generate Invoice** / **Bill** on a completed job card.
- **Step 5.2**: Inspect ledger summary:
  - Parts Subtotal (e.g., `₹350`)
  - Labour Subtotal (e.g., `₹250`)
  - Overall Discount (e.g., `₹50`)
  - Grand Total = `350 + 250 - 50 = ₹550`
  - Advance Received Previously = `₹500`
  - **Remaining Balance Due = `550 - 500 = ₹50`**
- **Step 5.3**: Select Invoice Payment Status Choice:
  - Click **Paid**: Auto-fills received payment input with full remaining balance (`₹50`).
  - Click **Partial Paid**: Clears input for custom partial amount entry (e.g., `₹30`).
  - Click **Unpaid**: Sets received payment input to `₹0`.
- **Step 5.4**: Select payment mode `Cash` and click **Deliver Vehicle & Generate Invoice**.
  - *Expected Result*: Bill is finalized with official invoice number `GB-1001`.

---

### Workflow 6: Vehicle Delivery & Queue Clearance
**Goal**: Verify vehicle delivery status pipeline and removal from active queue.

- **Step 6.1**: Open `/queue`.
- **Step 6.2**: Click **Deliver Vehicle** on a bill with outstanding balance > 0 and NO clearance date.
  - *Expected Result*: Delivery is blocked with an alert requiring expected payment clearance date.
- **Step 6.3**: Select expected clearance date and click **Deliver Vehicle**.
  - *Expected Result*: Status transitions to `Delivered`, and card is removed from active queue.

---

### Workflow 7: Reports, Drawer Tally & CA Exports
**Goal**: Verify financial reports, cash drawer reconciliation, and CSV export.

- **Step 7.1**: Navigate to `/reports`.
- **Step 7.2**: Click date filter tabs (`Today`, `This Week`, `This Month`, `Custom Date`).
  - *Expected Result*: Revenue, Total Sales, Collections, and Outstanding Dues update dynamically.
- **Step 7.3**: Scroll to **End of Day Cash Drawer Tally**. Enter counted physical cash and UPI.
  - *Expected Result*: System calculates difference between counted cash and system collections.
- **Step 7.4**: Click **Export CA Ledger CSV**.
  - *Expected Result*: System downloads CSV spreadsheet listing invoice line items, tax rates, parts/labour splits, and outstanding dues.

---

### Workflow 8: Instant Universal Search
**Goal**: Verify 300ms debounce, LRU Map cache, and multi-field search support.

- **Step 8.1**: Click **🔍 Search Customer** or navigate to `/search`.
- **Step 8.2**: Search by:
  - Customer Name (`Rahul`)
  - Phone Number (`9876543210`)
  - Vehicle Number (`DL3SCA1234`)
  - Invoice Number (`GB-1001`)
  - Mechanic Name (`Ramesh`)
  - **Customer Complaint (`Brake Problem`)**
- **Step 8.3**: Clear search input and re-type `Rahul`.
  - *Expected Result*: Results display **instantly (0ms delay)** from in-memory Map LRU cache without flickering.

---

### Workflow 9: Real-time Desktop / Mobile Sync
**Goal**: Verify multi-tab/device synchronization.

- **Step 9.1**: Open GarageBook in two browser tabs side-by-side (Tab A and Tab B).
- **Step 9.2**: On Tab A, change a vehicle status or assign a mechanic.
  - *Expected Result*: Tab B receives BroadcastChannel event and automatically re-fetches data without full page reload.

---

### Workflow 10: PWA Installation & Offline Support
**Goal**: Verify mobile PWA installation and offline mode.

- **Step 10.1**: Open app on Android Mobile Chrome.
- **Step 10.2**: Tap browser menu $\rightarrow$ **Install App** / **Add to Home Screen**.
  - *Expected Result*: App installs as standalone PWA with custom logo icon.
- **Step 10.3**: Turn off Wi-Fi/Mobile Data and navigate app.
  - *Expected Result*: Previously loaded screens and local cached data remain functional.

---

## 4. Bug Tracking & Severity Guidelines

When logging bugs in `GarageBook_Test_Checklist.xlsx` (Sheet 3: `Bug Log`), assign severity based on the following standard matrix:

| Severity Level | Definition | Response Time Target |
| :--- | :--- | :--- |
| **Critical (P0)** | Application crash, data corruption, total workflow blocker, or incorrect financial calculations. | Immediate (< 2 hours) |
| **High (P1)** | Primary feature broken on mobile PWA or desktop, button unresponsive, or delivery pipeline error. | Same Day (< 12 hours) |
| **Medium (P2)** | Minor visual misalignments, slow query response, missing preset suggestion, or cosmetic error. | Within 48 hours |
| **Low (P3)** | Minor typo, doc update, or non-blocking UI enhancement. | Next Release Sprint |

---

## 5. Summary Checklist

- [x] All 415 test cases in `GarageBook_Test_Checklist.xlsx` generated.
- [x] Executive Summary Dashboard configured with automated Pass/Fail formulas.
- [x] Advance payment accounting formula verified across all workflows.
- [x] Mobile PWA responsive layouts tested at 320px–360px viewports.
- [x] Production build clean check verified via `npm run build`.
