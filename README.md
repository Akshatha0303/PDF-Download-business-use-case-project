# PDF Download — Invoice Manager

Salesforce DX project for the **PDF Download** assignment: a multi-step Lightning Web Component that creates invoices with line items in a single Apex transaction, generates a PDF via Visualforce, and navigates to the new invoice record.

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

1. Open the **Invoice Manager** app from the App Launcher.
2. Go to **Opportunities** and open the test opportunity (or any opportunity with an account).
3. Click **Generate Invoice** in the opportunity action menu.
   - If the action is not visible: **Setup → Object Manager → Opportunity → Page Layouts → Opportunity Layout → Mobile & Lightning Actions → Salesforce Mobile and Lightning Experience Actions**, then drag **Generate Invoice** into the actions region and save.
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

## Demo script (5–7 minutes)

1. Show **Invoice Manager** app and custom **Invoices** tab.
2. Open a test **Opportunity** → run **Generate Invoice**.
3. Walk through Step 1 (LDS-prefilled customer/opportunity) and Step 2 (line items + running total).
4. Save — show PDF tab and invoice record with related line items.
5. Briefly show Apex tests passing in VS Code or CLI.

## Submission checklist

- [ ] Push repository to GitHub (`.gitignore` excludes `.sf/`, `.sfdx/`)
- [ ] Deploy to scratch org and verify quick action
- [ ] Record demo video or schedule live demo
- [ ] Email: repo link, README reference, demo link (scratch login only if required)
