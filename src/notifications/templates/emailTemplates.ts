interface InvoiceCreationTemplateInput {
  memberName: string;
  invoiceNumber: string;
  amountCents: number;
  dueDate: string;
}

interface PaymentReminderTemplateInput {
  memberName: string;
  invoiceNumber: string;
  dueDate: string;
  stage: "before_due" | "on_due" | "after_due";
}

interface PaymentReceiptTemplateInput {
  memberName: string;
  invoiceNumber: string;
  amountCents: number;
  receiptNumber: string;
}

const formatAmount = (amountCents: number): string => `INR ${(amountCents / 100).toFixed(2)}`;

export const getInvoiceCreationEmail = (input: InvoiceCreationTemplateInput) => ({
  subject: `Invoice ${input.invoiceNumber} generated`,
  html: `
    <p>Hi ${input.memberName},</p>
    <p>Your invoice <strong>${input.invoiceNumber}</strong> has been generated.</p>
    <p>Amount: <strong>${formatAmount(input.amountCents)}</strong></p>
    <p>Due Date: <strong>${input.dueDate}</strong></p>
    <p>Thanks,<br/>FeeAutomate</p>
  `,
});

export const getPaymentReminderEmail = (input: PaymentReminderTemplateInput) => {
  const prefix =
    input.stage === "before_due"
      ? "upcoming"
      : input.stage === "on_due"
        ? "due today"
        : "overdue";

  return {
    subject: `Payment reminder: Invoice ${input.invoiceNumber}`,
    html: `
      <p>Hi ${input.memberName},</p>
      <p>Your invoice <strong>${input.invoiceNumber}</strong> is ${prefix}.</p>
      <p>Due Date: <strong>${input.dueDate}</strong></p>
      <p>Please complete payment to avoid service interruptions.</p>
      <p>Thanks,<br/>FeeAutomate</p>
    `,
  };
};

export const getPaymentReceiptEmail = (input: PaymentReceiptTemplateInput) => ({
  subject: `Payment received for invoice ${input.invoiceNumber}`,
  html: `
    <p>Hi ${input.memberName},</p>
    <p>We have received your payment for invoice <strong>${input.invoiceNumber}</strong>.</p>
    <p>Amount Paid: <strong>${formatAmount(input.amountCents)}</strong></p>
    <p>Receipt Number: <strong>${input.receiptNumber}</strong></p>
    <p>Thanks,<br/>FeeAutomate</p>
  `,
});
