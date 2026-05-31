import { LightningElement, api, wire } from "lwc";
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import { NavigationMixin } from "lightning/navigation";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import OPPORTUNITY_NAME from "@salesforce/schema/Opportunity.Name";
import OPPORTUNITY_ACCOUNT_ID from "@salesforce/schema/Opportunity.AccountId";
import OPPORTUNITY_ACCOUNT_NAME from "@salesforce/schema/Opportunity.Account.Name";
import getOpportunities from "@salesforce/apex/InvoiceController.getOpportunities";
import saveInvoice from "@salesforce/apex/InvoiceController.saveInvoice";

const OPPORTUNITY_FIELDS = [
  OPPORTUNITY_NAME,
  OPPORTUNITY_ACCOUNT_ID,
  OPPORTUNITY_ACCOUNT_NAME
];

let rowCounter = 1;

function createLineItemRow() {
  rowCounter += 1;
  return {
    id: `row-${rowCounter}`,
    productName: "",
    quantity: 1,
    unitPrice: 0
  };
}

function reduceErrors(error) {
  if (!error) {
    return "Unknown error";
  }
  if (Array.isArray(error.body)) {
    return error.body.map((e) => e.message).join(", ");
  }
  if (typeof error.body?.message === "string") {
    return error.body.message;
  }
  if (typeof error.message === "string") {
    return error.message;
  }
  return "Unknown error";
}

export default class InvoiceGenerator extends NavigationMixin(
  LightningElement
) {
  @api recordId;

  currentStep = "1";
  isLoading = false;

  selectedOpportunityId;
  selectedCustomerId;
  customerName = "";
  opportunityName = "";

  opportunityOptions = [];
  opportunitiesLoaded = false;

  lineItems = [createLineItemRow()];

  @wire(getRecord, { recordId: "$recordId", fields: OPPORTUNITY_FIELDS })
  wiredOpportunity({ data, error }) {
    if (data) {
      this.applyOpportunitySelection(
        this.recordId,
        getFieldValue(data, OPPORTUNITY_NAME),
        getFieldValue(data, OPPORTUNITY_ACCOUNT_ID),
        getFieldValue(data, OPPORTUNITY_ACCOUNT_NAME)
      );
    } else if (error) {
      this.showErrorToast("Unable to load opportunity", reduceErrors(error));
    }
  }

  connectedCallback() {
    this.loadOpportunityOptions();
  }

  get isStep1() {
    return this.currentStep === "1";
  }

  get isStep2() {
    return this.currentStep === "2";
  }

  get step1Variant() {
    return this.isStep1 ? "shade" : "base";
  }

  get step2Variant() {
    return this.isStep2 ? "shade" : "base";
  }

  get launchedFromOpportunity() {
    return Boolean(this.recordId);
  }

  get isOpportunityReadOnly() {
    return this.launchedFromOpportunity;
  }

  get isNextDisabled() {
    return !this.selectedOpportunityId || !this.selectedCustomerId;
  }

  get grandTotal() {
    return this.lineItems.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      return sum + quantity * unitPrice;
    }, 0);
  }

  get formattedGrandTotal() {
    return this.grandTotal.toFixed(2);
  }

  get isSaveDisabled() {
    if (this.isLoading) {
      return true;
    }
    if (!this.lineItems.length) {
      return true;
    }
    return this.lineItems.some((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      return (
        !item.productName ||
        !quantity ||
        quantity < 1 ||
        unitPrice < 0 ||
        Number.isNaN(unitPrice)
      );
    });
  }

  get lineItemsWithTotals() {
    return this.lineItems.map((item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      return {
        ...item,
        rowTotal: (quantity * unitPrice).toFixed(2)
      };
    });
  }

  async loadOpportunityOptions() {
    try {
      const opportunities = await getOpportunities();
      this.opportunityOptions = opportunities.map((opp) => ({
        label: `${opp.Name} — ${opp.Account?.Name || "No Account"}`,
        value: opp.Id,
        accountId: opp.AccountId,
        accountName: opp.Account?.Name,
        opportunityName: opp.Name
      }));
    } catch (error) {
      this.showErrorToast("Unable to load opportunities", reduceErrors(error));
    } finally {
      this.opportunitiesLoaded = true;
    }
  }

  handleOpportunityChange(event) {
    const opportunityId = event.detail.value;
    const selected = this.opportunityOptions.find(
      (opt) => opt.value === opportunityId
    );
    if (!selected) {
      return;
    }
    this.applyOpportunitySelection(
      selected.value,
      selected.opportunityName,
      selected.accountId,
      selected.accountName
    );
  }

  applyOpportunitySelection(opportunityId, oppName, accountId, accountName) {
    this.selectedOpportunityId = opportunityId;
    this.opportunityName = oppName || "";
    this.selectedCustomerId = accountId;
    this.customerName = accountName || "";
  }

  handleNext() {
    if (this.isNextDisabled) {
      this.showErrorToast(
        "Validation",
        "Select an opportunity with a related customer account."
      );
      return;
    }
    this.currentStep = "2";
  }

  handleBack() {
    this.currentStep = "1";
  }

  handleAddRow() {
    this.lineItems = [...this.lineItems, createLineItemRow()];
  }

  handleRemoveRow(event) {
    const rowId = event.target.dataset.id;
    if (this.lineItems.length === 1) {
      this.showErrorToast("Validation", "At least one line item is required.");
      return;
    }
    this.lineItems = this.lineItems.filter((item) => item.id !== rowId);
  }

  handleInputChange(event) {
    const rowId = event.target.dataset.id;
    const field = event.target.dataset.field;
    let value = event.target.value;

    if (field === "quantity" || field === "unitPrice") {
      value = value === "" ? "" : Number(value);
    }

    this.lineItems = this.lineItems.map((row) =>
      row.id === rowId ? { ...row, [field]: value } : row
    );
  }

  async handleSave() {
    if (this.isSaveDisabled) {
      this.showErrorToast(
        "Validation",
        "Complete all line items before saving."
      );
      return;
    }

    this.isLoading = true;
    const invoiceRecord = {
      Customer__c: this.selectedCustomerId,
      Opportunity__c: this.selectedOpportunityId,
      Status__c: "Draft",
      Total_Amount__c: this.grandTotal
    };

    const lineItemRecords = this.lineItems.map((item) => ({
      Product_Name__c: item.productName,
      Quantity__c: Number(item.quantity),
      Unit_Price__c: Number(item.unitPrice)
    }));

    try {
      const invoiceId = await saveInvoice({
        invoice: invoiceRecord,
        lineItems: lineItemRecords
      });

      window.open(`/apex/InvoicePDF?id=${invoiceId}`, "_blank");

      this.dispatchEvent(
        new ShowToastEvent({
          title: "Success",
          message: "Invoice created and PDF opened in a new tab.",
          variant: "success"
        })
      );

      this[NavigationMixin.Navigate]({
        type: "standard__recordPage",
        attributes: {
          recordId: invoiceId,
          objectApiName: "Invoice__c",
          actionName: "view"
        }
      });
    } catch (error) {
      this.showErrorToast("Save failed", reduceErrors(error));
    } finally {
      this.isLoading = false;
    }
  }

  showErrorToast(title, message) {
    this.dispatchEvent(
      new ShowToastEvent({
        title,
        message,
        variant: "error"
      })
    );
  }
}
