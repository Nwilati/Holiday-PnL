import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';
import { api } from '../api/client';

interface TourismDirhamRow {
  month: number;
  year: number;
  property_id: string;
  property_name: string;
  bedrooms: number;
  occupied_nights: number;
  rate: number;
  collected: number;
  paid: number;
  outstanding: number;
  status: 'paid' | 'partial' | 'unpaid' | 'zero';
}

interface DTCMPayment {
  id: string;
  payment_date: string;
  period_month: number;
  period_year: number;
  property_id: string | null;
  property_name?: string;
  amount: number;
  reference: string | null;
  payment_method: string | null;
}

interface Property {
  id: string;
  name: string;
}

interface Report {
  year: number;
  month: number | null;
  total_collected: number;
  total_paid: number;
  total_outstanding: number;
  properties: TourismDirhamRow[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, { bg: string; text: string; Icon: typeof CheckCircle | null }> = {
    paid: { bg: 'bg-green-50', text: 'text-green-700', Icon: CheckCircle },
    partial: { bg: 'bg-amber-50', text: 'text-amber-700', Icon: Clock },
    unpaid: { bg: 'bg-red-50', text: 'text-red-700', Icon: AlertTriangle },
    zero: { bg: 'bg-stone-100', text: 'text-stone-500', Icon: null },
  };

  const style = styles[status] || styles.zero;
  const Icon = style.Icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${style.bg} ${style.text}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {status === 'zero' ? 'No bookings' : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default function TaxReports() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | null>(currentMonth);
  const [report, setReport] = useState<Report | null>(null);
  const [payments, setPayments] = useState<DTCMPayment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    period_month: currentMonth,
    period_year: currentYear,
    property_id: '',
    amount: '',
    reference: '',
    payment_method: 'bank_transfer',
  });

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reportRes, paymentsRes, propertiesRes] = await Promise.all([
        api.get(`/tax/tourism-dirham/report?year=${year}${month ? `&month=${month}` : ''}`),
        api.get(`/tax/tourism-dirham/payments?year=${year}`),
        api.getProperties(),
      ]);
      setReport(reportRes.data);
      setPayments(paymentsRes.data);
      setProperties(propertiesRes.data);
    } catch (error) {
      console.error('Failed to fetch tax report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    try {
      await api.post('/tax/tourism-dirham/payments', {
        ...paymentForm,
        property_id: paymentForm.property_id || null,
        amount: parseFloat(paymentForm.amount),
      });
      setShowPaymentModal(false);
      setPaymentForm({
        payment_date: new Date().toISOString().split('T')[0],
        period_month: currentMonth,
        period_year: currentYear,
        property_id: '',
        amount: '',
        reference: '',
        payment_method: 'bank_transfer',
      });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to record payment');
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm('Delete this DTCM payment record?')) return;
    try {
      await api.delete(`/tax/tourism-dirham/payments/${id}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete payment:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Tax Reports</h1>
          <p className="text-sm text-stone-500">Tourism Dirham collection and remittance</p>
        </div>
        <button
          onClick={() => setShowPaymentModal(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-600 text-white text-sm font-medium rounded hover:bg-sky-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Record DTCM Payment
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="text-sm border border-stone-300 rounded px-3 py-1.5 bg-white"
        >
          {[currentYear, currentYear - 1, currentYear - 2].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          value={month || ''}
          onChange={(e) => setMonth(e.target.value ? parseInt(e.target.value) : null)}
          className="text-sm border border-stone-300 rounded px-3 py-1.5 bg-white"
        >
          <option value="">Full Year</option>
          {MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      {report && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <div className="text-xs text-stone-500 uppercase tracking-wide">Collected</div>
            <div className="mt-1 text-xl font-semibold text-stone-900 tabular-nums">
              AED {formatCurrency(report.total_collected)}
            </div>
            <div className="text-xs text-stone-500 mt-1">From guest bookings</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <div className="text-xs text-stone-500 uppercase tracking-wide">Paid to DTCM</div>
            <div className="mt-1 text-xl font-semibold text-green-700 tabular-nums">
              AED {formatCurrency(report.total_paid)}
            </div>
            <div className="text-xs text-stone-500 mt-1">Remitted</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <div className="text-xs text-stone-500 uppercase tracking-wide">Outstanding</div>
            <div className={`mt-1 text-xl font-semibold tabular-nums ${report.total_outstanding > 0 ? 'text-red-700' : 'text-stone-900'}`}>
              AED {formatCurrency(report.total_outstanding)}
            </div>
            <div className="text-xs text-stone-500 mt-1">Liability balance</div>
          </div>
        </div>
      )}

      {/* Detail Table */}
      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100">
          <h2 className="text-sm font-medium text-stone-700">Tourism Dirham by Property</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Period</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Property</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">Bedrooms</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">Nights</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">Rate</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">Collected</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">Paid</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">Outstanding</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-stone-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-stone-500">Loading...</td>
              </tr>
            ) : report?.properties?.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-stone-500">No data for this period</td>
              </tr>
            ) : (
              report?.properties?.map((row: TourismDirhamRow, index: number) => (
                <tr key={index} className="hover:bg-stone-50">
                  <td className="px-4 py-2.5 text-sm text-stone-600">{MONTHS[row.month - 1]} {row.year}</td>
                  <td className="px-4 py-2.5 text-sm font-medium text-stone-900">{row.property_name}</td>
                  <td className="px-4 py-2.5 text-sm text-stone-600 text-right tabular-nums">{row.bedrooms}</td>
                  <td className="px-4 py-2.5 text-sm text-stone-600 text-right tabular-nums">{row.occupied_nights}</td>
                  <td className="px-4 py-2.5 text-sm text-stone-600 text-right tabular-nums">AED {row.rate}</td>
                  <td className="px-4 py-2.5 text-sm font-medium text-stone-900 text-right tabular-nums">
                    AED {formatCurrency(row.collected)}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-green-700 text-right tabular-nums">
                    AED {formatCurrency(row.paid)}
                  </td>
                  <td className={`px-4 py-2.5 text-sm font-medium text-right tabular-nums ${row.outstanding > 0 ? 'text-red-700' : 'text-stone-600'}`}>
                    AED {formatCurrency(row.outstanding)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payment History */}
      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100">
          <h2 className="text-sm font-medium text-stone-700">DTCM Payment History</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Payment Date</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Period</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Property</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">Amount</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Reference</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Method</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-stone-500">No payments recorded</td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-stone-50">
                  <td className="px-4 py-2.5 text-sm text-stone-600">{payment.payment_date}</td>
                  <td className="px-4 py-2.5 text-sm text-stone-600">{MONTHS[payment.period_month - 1]} {payment.period_year}</td>
                  <td className="px-4 py-2.5 text-sm text-stone-900">{payment.property_name || 'All Properties'}</td>
                  <td className="px-4 py-2.5 text-sm font-medium text-stone-900 text-right tabular-nums">
                    AED {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-stone-600">{payment.reference || '-'}</td>
                  <td className="px-4 py-2.5 text-sm text-stone-600">{payment.payment_method || '-'}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => handleDeletePayment(payment.id)}
                      className="p-1 text-stone-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30" onClick={() => setShowPaymentModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                <h2 className="text-base font-semibold text-stone-900">Record DTCM Payment</h2>
                <button onClick={() => setShowPaymentModal(false)} className="p-1 text-stone-400 hover:text-stone-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Period Month</label>
                    <select
                      value={paymentForm.period_month}
                      onChange={(e) => setPaymentForm({ ...paymentForm, period_month: parseInt(e.target.value) })}
                      className="w-full text-sm border border-stone-300 rounded px-3 py-1.5"
                    >
                      {MONTHS.map((m, i) => (
                        <option key={i + 1} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Period Year</label>
                    <select
                      value={paymentForm.period_year}
                      onChange={(e) => setPaymentForm({ ...paymentForm, period_year: parseInt(e.target.value) })}
                      className="w-full text-sm border border-stone-300 rounded px-3 py-1.5"
                    >
                      {[currentYear, currentYear - 1].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Property</label>
                  <select
                    value={paymentForm.property_id}
                    onChange={(e) => setPaymentForm({ ...paymentForm, property_id: e.target.value })}
                    className="w-full text-sm border border-stone-300 rounded px-3 py-1.5"
                  >
                    <option value="">All Properties (Combined)</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    className="w-full text-sm border border-stone-300 rounded px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Amount (AED)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full text-sm border border-stone-300 rounded px-3 py-1.5"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Reference (Optional)</label>
                  <input
                    type="text"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    className="w-full text-sm border border-stone-300 rounded px-3 py-1.5"
                    placeholder="Receipt or transaction number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Payment Method</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    className="w-full text-sm border border-stone-300 rounded px-3 py-1.5"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="portal_payment">Portal Payment</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded transition-colors"
                >
                  Save Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
