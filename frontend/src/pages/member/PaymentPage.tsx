import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiCreditCard, HiCheckCircle } from 'react-icons/hi2';
import { useInvoiceStore, usePaymentStore } from '@/stores';
import { PageHeader, Card, Button, LoadingScreen, ErrorState, Badge } from '@/components/ui';
import { formatCurrency, formatDate, getStatusColor } from '@/utils/format';

const statusColor = (s: string) => getStatusColor(s) as 'green' | 'yellow' | 'red' | 'gray';

export default function PaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const invoiceId = searchParams.get('invoiceId');

  const { invoices, fetchInvoices, isLoading: invLoading, error: invError } = useInvoiceStore();
  const { payments, fetchPayments, createPayment, isLoading: payLoading } = usePaymentStore();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    if (invoiceId) {
      fetchPayments(invoiceId);
    }
  }, [invoiceId, fetchPayments]);

  const invoice = useMemo(
    () => invoices.find((i) => i.id === invoiceId),
    [invoices, invoiceId],
  );

  const handlePay = async () => {
    if (!invoice) return;
    setProcessing(true);
    try {
      await createPayment({
        invoiceId: invoice.id,
        amountCents: invoice.amountCents,
        method: 'online',
        status: 'paid',
      });
      toast.success('Payment successful!');
      await fetchInvoices();
      navigate(`/member/receipt/${invoice.id}`);
    } catch {
      // handled
    } finally {
      setProcessing(false);
    }
  };

  if (invLoading && invoices.length === 0) return <LoadingScreen />;
  if (invError) return <ErrorState message={invError} onRetry={fetchInvoices} />;

  if (!invoiceId) {
    const unpaid = invoices.filter((i) => i.status !== 'paid');
    return (
      <div>
        <PageHeader title="Payments" description="Select an invoice to pay" />
        {unpaid.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <HiCheckCircle className="h-12 w-12 text-emerald-500" />
              <p className="font-medium text-gray-900 dark:text-gray-100">All caught up!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                You have no outstanding invoices
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {unpaid.map((inv) => (
              <Card key={inv.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {inv.invoiceNumber}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Due: {formatDate(inv.dueDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(inv.amountCents)}
                      </p>
                      <Badge color={statusColor(inv.status)}>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/member/payments?invoiceId=${inv.id}`)}
                    >
                      Pay
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!invoice) {
    return <ErrorState message="Invoice not found" />;
  }

  return (
    <div>
      <PageHeader title="Make Payment" description={`Invoice: ${invoice.invoiceNumber}`} />

      <div className="mx-auto max-w-lg">
        <Card>
          <div className="space-y-6">
            <div className="rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
              <p className="text-sm opacity-80">Amount Due</p>
              <p className="mt-1 text-3xl font-bold">{formatCurrency(invoice.amountCents)}</p>
              <p className="mt-2 text-sm opacity-80">
                Due: {formatDate(invoice.dueDate)}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Invoice Number</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                <Badge color={statusColor(invoice.status)}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Issued Date</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatDate(invoice.issuedAt)}
                </span>
              </div>
            </div>

            {invoice.status === 'paid' ? (
              <div className="rounded-lg bg-emerald-50 p-4 text-center dark:bg-emerald-900/20">
                <HiCheckCircle className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                <p className="mt-2 font-medium text-emerald-700 dark:text-emerald-300">
                  Already Paid
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate(`/member/receipt/${invoice.id}`)}
                >
                  View Receipt
                </Button>
              </div>
            ) : (
              <Button
                className="w-full"
                isLoading={processing || payLoading}
                onClick={handlePay}
                leftIcon={<HiCreditCard className="h-5 w-5" />}
              >
                Pay {formatCurrency(invoice.amountCents)}
              </Button>
            )}

            {payments.length > 0 && (
              <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Payment History
                </h4>
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800"
                    >
                      <div>
                        <p className="text-gray-900 dark:text-gray-100">
                          {formatCurrency(p.amountCents)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {p.method || 'N/A'} &middot; {p.createdAt ? formatDate(p.createdAt) : ''}
                        </p>
                      </div>
                      <Badge color={statusColor(p.status)}>
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
