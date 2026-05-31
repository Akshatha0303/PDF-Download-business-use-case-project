public with sharing class InvoicePDFController {
  public Invoice__c invoice { get; private set; }
  public List<Invoice_Line_Item__c> lineItems { get; private set; }
  public Boolean hasInvoice { get; private set; }

  public InvoicePDFController() {
    lineItems = new List<Invoice_Line_Item__c>();
    hasInvoice = false;

    String invoiceIdParam = ApexPages.currentPage().getParameters().get('id');
    if (String.isBlank(invoiceIdParam)) {
      return;
    }

    Id invoiceId;
    try {
      invoiceId = Id.valueOf(invoiceIdParam);
    } catch (Exception e) {
      return;
    }

    List<Invoice__c> invoices = [
      SELECT
        Id,
        Name,
        Status__c,
        Total_Amount__c,
        Customer__r.Name,
        Opportunity__r.Name,
        (
          SELECT Product_Name__c, Quantity__c, Unit_Price__c, Line_Total__c
          FROM Invoice_Line_Items__r
          ORDER BY Name ASC
        )
      FROM Invoice__c
      WHERE Id = :invoiceId
      LIMIT 1
    ];

    if (invoices.isEmpty()) {
      return;
    }

    invoice = invoices[0];
    lineItems = invoice.Invoice_Line_Items__r;
    hasInvoice = true;
  }
}
