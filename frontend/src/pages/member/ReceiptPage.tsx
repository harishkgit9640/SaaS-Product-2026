import { useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiArrowDownTray, HiArrowLeft, HiCheckCircle } from 'react-icons/hi2';
import { useInvoiceStore, usePaymentStore, useAuthStore } from '@/stores';
import { Button, Card, LoadingScreen, ErrorState } from '@/components/ui';
import { formatCurrency, formatDate } from '@/utils/format';

export default function ReceiptPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const receiptRef = useRef<HTMLDivElement>(null);

  const { user, tenant } = useAuthStore();
  const { invoices, fetchInvoices, isLoading: invLoading, error: invError } = useInvoiceStore();
  const { payments, fetchPayments, isLoading: payLoading } = usePaymentStore();

  useEffect(() => {
    fetchInvoices();
    if (invoiceId) fetchPayments(invoiceId);
  }, [fetchInvoices, fetchPayments, invoiceId]);

  const invoice = useMemo(
    () => invoices.find((i) => i.id === invoiceId),
    [invoices, invoiceId],
  );

  const paidPayment = useMemo(
    () => payments.find((p) => p.status === 'paid'),
    [payments],
  );

  const handleDownload = () => {
    if (!receiptRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${invoice?.invoiceNumber}</title>
        <style>
          body { font-family: Inter, system-ui, sans-serif; margin: 0; padding: 40px; color: #111; }
          .receipt { max-width: 600px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 32px; }
          .header h1 { font-size: 24px; color: #4f46e5; margin: 0; }
          .header p { color: #666; margin: 4px 0 0; }
          .badge { display: inline-block; padding: 4px 12px; background: #d1fae5; color: #065f46; border-radius: 999px; font-size: 12px; font-weight: 600; }
          .details { margin: 24px 0; }
          .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
          .row .label { color: #6b7280; }
          .row .value { font-weight: 500; }
          .total { font-size: 20px; font-weight: 700; text-align: center; margin: 24px 0; padding: 16px; background: #f9fafb; border-radius: 8px; }
          .footer { text-align: center; margin-top: 32px; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        ${receiptRef.current.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  if ((invLoading || payLoading) && invoices.length === 0) return <LoadingScreen />;
  if (invError) return <ErrorState message={invError} onRetry={fetchInvoices} />;
  if (!invoice) return <ErrorState message="Invoice not found" />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)} leftIcon={<HiArrowLeft className="h-4 w-4" />}>
          Back
        </Button>
        <Button
          variant="secondary"
          onClick={handleDownload}
          leftIcon={<HiArrowDownTray className="h-4 w-4" />}
        >
          Download Receipt
        </Button>
      </div>

      <div className="mx-auto max-w-lg">
        <Card>
          <div ref={receiptRef} className="receipt">
            <div className="header mb-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-lg font-bold text-white">
                F
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {tenant?.name || 'FeeAutomate'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Payment Receipt</p>
            </div>

            <div className="mb-6 flex justify-center">
              <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 dark:bg-emerald-900/20">
                <HiCheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="badge text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  Paid
                </span>
              </div>
            </div>

            <div className="details space-y-0 divide-y divide-gray-100 dark:divide-gray-800">
              <div className="row flex justify-between py-3">
                <span className="label text-sm text-gray-500 dark:text-gray-400">Invoice Number</span>
                <span className="value text-sm font-medium text-gray-900 dark:text-gray-100">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <div className="row flex justify-between py-3">
                <span className="label text-sm text-gray-500 dark:text-gray-400">Issue Date</span>
                <span className="value text-sm text-gray-900 dark:text-gray-100">
                  {formatDate(invoice.issuedAt)}
                </span>
              </div>
              <div className="row flex justify-between py-3">
                <span className="label text-sm text-gray-500 dark:text-gray-400">Due Date</span>
                <span className="value text-sm text-gray-900 dark:text-gray-100">
                  {formatDate(invoice.dueDate)}
                </span>
              </div>
              {invoice.paidAt && (
                <div className="row flex justify-between py-3">
                  <span className="label text-sm text-gray-500 dark:text-gray-400">Paid Date</span>
                  <span className="value text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(invoice.paidAt)}
                  </span>
                </div>
              )}
              {paidPayment?.method && (
                <div className="row flex justify-between py-3">
                  <span className="label text-sm text-gray-500 dark:text-gray-400">Payment Method</span>
                  <span className="value text-sm capitalize text-gray-900 dark:text-gray-100">
                    {paidPayment.method}
                  </span>
                </div>
              )}
              {paidPayment?.transactionRef && (
                <div className="row flex justify-between py-3">
                  <span className="label text-sm text-gray-500 dark:text-gray-400">Transaction Ref</span>
                  <span className="value text-sm font-mono text-gray-900 dark:text-gray-100">
                    {paidPayment.transactionRef}
                  </span>
                </div>
              )}
              <div className="row flex justify-between py-3">
                <span className="label text-sm text-gray-500 dark:text-gray-400">Paid By</span>
                <span className="value text-sm text-gray-900 dark:text-gray-100">
                  {user?.email}
                </span>
              </div>
            </div>

            <div className="total mt-6 rounded-xl bg-gray-50 p-4 text-center dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Amount Paid</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(invoice.amountCents)}
              </p>
            </div>

            <div className="footer mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
              <p>This is a computer-generated receipt. No signature required.</p>
              <p className="mt-1">Powered by FeeAutomate</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
