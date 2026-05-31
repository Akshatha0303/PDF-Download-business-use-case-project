# PDF Download — Invoice Manager

Salesforce DX project for the **PDF Download** assignment: a multi-step Lightning Web Component that creates invoices with line items in a single Apex transaction, generates a PDF via Visualforce, and navigates to the new invoice record.

## GitHub repositories

| Repository                                                                                                                    | Purpose                                   | Code on `main`?          |
| ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------ |
| [Akshatha0303/PDF-Download](https://github.com/Akshatha0303/PDF-Download)                                                     | Primary project remote (`origin`)         | Yes — full `force-app/`  |
| [Akshatha0303/PDF-Download-business-use-case-project](https://github.com/Akshatha0303/PDF-Download-business-use-case-project) | L&D submission repo (`submission` remote) | Push with commands below |

### Where to see code on GitHub `main`

1. Open **https://github.com/Akshatha0303/PDF-Download** (or the submission repo after push).
2. Select branch **`main`**.
3. Browse **`force-app/main/default/`**:
   - `lwc/invoiceGenerator/` — multi-step UI
   - `classes/InvoiceController.cls`, `InvoicePDFController.cls` — Apex
   - `objects/Invoice__c/`, `objects/Invoice_Line_Item__c/` — data model
   - `pages/InvoicePDF.page` — PDF
   - `applications/Invoice_Manager.app-meta.xml` — Lightning app

### Push to the submission repository

```bash
cd "d:\PDF Download\PDF Download"
git remote add submission https://github.com/Akshatha0303/PDF-Download-business-use-case-project.git
git push -u submission main
```

If `submission` already exists: `git push submission main`

## Solution overview

| Feature                         | Implementation                                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Step 1 — Customer / Opportunity | LDS `getRecord` on quick-action context; `lightning-combobox` + imperative Apex when launched from app page |
| Step 2 — Line items             | Template loop, add/remove rows, `grandTotal` getter                                                         |
| Save (single transaction)       | `InvoiceController.saveInvoice` with savepoint rollback                                                     |
| PDF download                    | Visualforce `InvoicePDF` (`renderAs="pdf"`) opened in new tab                                               |
| Opportunity quick action        | `Generate Invoice` screen action                                                                            |
| Post-save navigation            | `NavigationMixin` to `Invoice__c` record page                                                               |

## Prerequisites

- [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli) (`sf`) installed
- Dev Hub enabled for scratch org creation
- Node.js 18+ (for LWC Jest)

## Deploy to a scratch org

1. **Authenticate to Dev Hub**

   ```bash
   sf org login web --set-default-dev-hub --alias DevHub
   ```

2. **Create scratch org** (from project root)

   ```bash
   sf org create scratch --definition-file config/project-scratch-def.json --alias InvoiceScratch --set-default --duration-days 30
   ```

3. **Deploy metadata**

   ```bash
   sf project deploy start --source-dir force-app
   ```

4. **Assign permission set**

   ```bash
   sf org assign permset --name Invoice_App_Access
   ```

5. **Open the org**

   ```bash
   sf org open
   ```

## Test data

Run the anonymous Apex script in `scripts/apex/createInvoiceTestData.apex`:

```bash
sf apex run --file scripts/apex/createInvoiceTestData.apex
```

This creates **Acme Corporation** (Account) and **Acme Q2 Services** (Opportunity).

## Run the application

### If **Invoice Manager** is missing from App Launcher

Custom apps must be **deployed** and **assigned to your profile**:

1. **Setup** → **App Manager** → find **Invoice Manager**
   - Not listed → run `sf project deploy start --source-dir force-app`
2. Click **▼** next to **Invoice Manager** → **Edit** → enable **System Administrator** (your profile) → **Save**
3. Refresh browser → **App Launcher** → search **Invoice Manager**

Alternatively use the **Sales** app and open Opportunities from there (quick action still works on the record).

### End-user steps

1. Open **Invoice Manager** from the App Launcher.
2. Go to **Opportunities** and open a test opportunity (or any opportunity with an account).
3. Click **Generate Invoice** on the opportunity action bar (modal opens — not the full record page).
   - If missing: **Setup → Object Manager → Opportunity → Page Layouts → Opportunity Layout → Mobile & Lightning Actions**, drag **Generate Invoice** into **Salesforce Mobile and Lightning Experience Actions**, save.
4. **Step 1:** Confirm opportunity and customer (account), then click **Next**.
5. **Step 2:** Add line items, review grand total, click **Save Invoice & Download PDF**.
6. PDF opens in a new tab; you are redirected to the new **Invoice** record.

## Apex tests

```bash
sf apex run test --class-names InvoiceControllerTest,InvoicePDFControllerTest --result-format human --code-coverage --wait 10
```

## LWC unit tests

```bash
npm install
npm run test:unit
```

## Project structure

```
force-app/main/default/
  objects/Invoice__c/
  objects/Invoice_Line_Item__c/
  classes/InvoiceController.cls
  classes/InvoicePDFController.cls
  pages/InvoicePDF.page
  lwc/invoiceGenerator/
  quickActions/Opportunity.Generate_Invoice.quickAction-meta.xml
  applications/Invoice_Manager.app-meta.xml
  permissionsets/Invoice_App_Access.permissionset-meta.xml
scripts/apex/createInvoiceTestData.apex
```

## 10-minute demo script

Use this outline when recording or presenting live (~10 minutes). Have a test Opportunity ready and allow browser pop-ups for the PDF tab.

| Time     | Topic               | What to show / say                                                                                                                                                  |
| -------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–1 min  | **Introduction**    | Problem: create invoice from Opportunity, save header + lines, download PDF. Stack: LWC → Apex → VF PDF → Navigation. Briefly show GitHub `force-app/` on `main`.   |
| 1–2 min  | **Data model**      | `Invoice__c` (Customer, Opportunity, Status, Total); `Invoice_Line_Item__c` (master-detail, Product, Qty, Unit Price, formula Line Total).                          |
| 2–3 min  | **App & entry**     | App Launcher → **Invoice Manager** → **Opportunities** → open record. Point out **Generate Invoice** quick action on highlights (modal, not embedded LWC on page).  |
| 3–5 min  | **Step 1**          | LDS `@wire(getRecord)` when from quick action (read-only opp + account). Imperative `getOpportunities` on app page (combobox). Click **Next**; mention validation.  |
| 5–7 min  | **Step 2**          | Template loop, **Add Row** / **Remove**, getter **`grandTotal`**, row totals. Show invalid row → save disabled / error toast.                                       |
| 7–8 min  | **Save & PDF**      | **Save** → Apex savepoint transaction → PDF tab (`/apex/InvoicePDF?id=...`) with table layout → success toast.                                                      |
| 8–9 min  | **Navigation**      | Land on **Invoice\_\_c** record; related line items; optional **Invoices** tab.                                                                                     |
| 9–10 min | **Tests & wrap-up** | `InvoiceControllerTest`, `InvoicePDFControllerTest`; Jest for LWC. Recap: multi-step, LDS, single transaction, PDF, quick action, navigation, SLDS, error handling. |

### Demo prep checklist

- [ ] Deploy + assign `Invoice_App_Access`
- [ ] Assign **Invoice Manager** app to profile (Setup → App Manager)
- [ ] Add **Generate Invoice** to Opportunity layout actions
- [ ] Run `createInvoiceTestData.apex`
- [ ] Opportunity record page shows standard details (not full-page invoice form)
- [ ] Browser allows pop-up for PDF

## Submission checklist

- [ ] Push repository to GitHub (both remotes if required by L&D)
- [ ] Deploy to scratch org and verify quick action
- [ ] Record demo video or schedule live demo
- [ ] Email: repo link, README reference, demo link (scratch login only if required)
