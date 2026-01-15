import { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Check,
  Calendar,
  MapPin,
  CreditCard,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api, OffplanProperty, OffplanPropertyCreate, OffplanPayment, OffplanInvestmentSummary } from '../api/client';

// Status badge colors
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    active: 'bg-green-50 text-green-700 border border-green-200',
    handed_over: 'bg-blue-50 text-blue-700 border border-blue-200',
    cancelled: 'bg-red-50 text-red-700 border border-red-200',
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    paid: 'bg-green-50 text-green-700 border border-green-200',
    overdue: 'bg-red-50 text-red-700 border border-red-200',
  };
  return colors[status.toLowerCase()] || 'bg-stone-100 text-stone-600 border border-stone-200';
};

const EMIRATE_OPTIONS = [
  { value: 'dubai', label: 'Dubai' },
  { value: 'abu_dhabi', label: 'Abu Dhabi' },
  { value: 'sharjah', label: 'Sharjah' },
  { value: 'ajman', label: 'Ajman' },
  { value: 'ras_al_khaimah', label: 'Ras Al Khaimah' },
  { value: 'fujairah', label: 'Fujairah' },
  { value: 'umm_al_quwain', label: 'Umm Al Quwain' },
];

export default function OffPlan() {
  const [properties, setProperties] = useState<OffplanProperty[]>([]);
  const [summary, setSummary] = useState<OffplanInvestmentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);

  // Selected property and payment
  const [selectedProperty, setSelectedProperty] = useState<OffplanProperty | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<OffplanPayment | null>(null);

  // Form state
  const [formData, setFormData] = useState<OffplanPropertyCreate>({
    developer: '',
    project_name: '',
    unit_number: '',
    reference_number: '',
    unit_type: '',
    bedrooms: 0,
    bathrooms: 0,
    parking_spots: 0,
    emirate: 'dubai',
    area: '',
    community: '',
    base_price: 0,
    land_dept_fee_percent: 4,
    admin_fees: 0,
    other_fees: 0,
    purchase_date: '',
    expected_handover: '',
    promotion_name: '',
    amc_waiver_years: 0,
    dlp_waiver_years: 0,
    notes: '',
  });

  // Mark paid form
  const [markPaidData, setMarkPaidData] = useState({
    paid_date: '',
    paid_amount: 0,
    payment_method: 'bank_transfer',
    payment_reference: '',
  });

  useEffect(() => {
    loadProperties();
    loadSummary();
  }, []);

  const loadProperties = async () => {
    setIsLoading(true);
    try {
      const response = await api.getOffplanProperties();
      setProperties(response.data);
    } catch (error) {
      console.error('Failed to load off-plan properties:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await api.getOffplanInvestmentSummary();
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const calculateTotalCost = () => {
    const basePrice = Number(formData.base_price) || 0;
    const landFeePercent = Number(formData.land_dept_fee_percent) || 0;
    const landFee = (basePrice * landFeePercent) / 100;
    const adminFees = Number(formData.admin_fees) || 0;
    const otherFees = Number(formData.other_fees) || 0;
    return basePrice + landFee + adminFees + otherFees;
  };

  const handleCreateProperty = () => {
    setSelectedProperty(null);
    setFormData({
      developer: '',
      project_name: '',
      unit_number: '',
      reference_number: '',
      unit_type: '',
      bedrooms: 0,
      bathrooms: 0,
      parking_spots: 0,
      emirate: 'dubai',
      area: '',
      community: '',
      base_price: 0,
      land_dept_fee_percent: 4,
      admin_fees: 0,
      other_fees: 0,
      purchase_date: '',
      expected_handover: '',
      promotion_name: '',
      amc_waiver_years: 0,
      dlp_waiver_years: 0,
      notes: '',
    });
    setShowFormModal(true);
  };

  const handleEditProperty = (property: OffplanProperty, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProperty(property);
    setFormData({
      developer: property.developer,
      project_name: property.project_name,
      unit_number: property.unit_number,
      reference_number: property.reference_number || '',
      unit_type: property.unit_type || '',
      bedrooms: property.bedrooms || 0,
      bathrooms: property.bathrooms || 0,
      parking_spots: property.parking_spots || 0,
      emirate: property.emirate,
      area: property.area || '',
      community: property.community || '',
      base_price: property.base_price,
      land_dept_fee_percent: property.land_dept_fee_percent || 4,
      admin_fees: property.admin_fees,
      other_fees: property.other_fees,
      purchase_date: property.purchase_date || '',
      expected_handover: property.expected_handover || '',
      promotion_name: property.promotion_name || '',
      amc_waiver_years: property.amc_waiver_years || 0,
      dlp_waiver_years: property.dlp_waiver_years || 0,
      notes: property.notes || '',
    });
    setShowFormModal(true);
  };

  const handleDeleteProperty = (property: OffplanProperty, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProperty(property);
    setShowDeleteConfirm(true);
  };

  const handleMarkPaymentPaid = (payment: OffplanPayment, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPayment(payment);
    setMarkPaidData({
      paid_date: new Date().toISOString().split('T')[0],
      paid_amount: payment.amount,
      payment_method: 'bank_transfer',
      payment_reference: '',
    });
    setShowMarkPaidModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const totalCost = calculateTotalCost();
      const dataToSubmit = {
        ...formData,
        total_cost: totalCost,
      };

      if (selectedProperty) {
        await api.updateOffplanProperty(selectedProperty.id, dataToSubmit);
      } else {
        await api.createOffplanProperty(dataToSubmit);
      }

      setShowFormModal(false);
      loadProperties();
      loadSummary();
    } catch (error) {
      console.error('Failed to save property:', error);
      alert('Failed to save property. Please try again.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedProperty) return;
    try {
      await api.deleteOffplanProperty(selectedProperty.id);
      setShowDeleteConfirm(false);
      setSelectedProperty(null);
      loadProperties();
      loadSummary();
    } catch (error) {
      console.error('Failed to delete property:', error);
      alert('Failed to delete property. Please try again.');
    }
  };

  const handleSubmitMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    try {
      await api.markOffplanPaymentPaid(selectedPayment.id, {
        paid_date: markPaidData.paid_date,
        paid_amount: markPaidData.paid_amount,
        payment_method: markPaidData.payment_method,
        payment_reference: markPaidData.payment_reference,
      });
      setShowMarkPaidModal(false);
      setSelectedPayment(null);
      loadProperties();
      loadSummary();
    } catch (error) {
      console.error('Failed to mark payment as paid:', error);
      alert('Failed to mark payment as paid. Please try again.');
    }
  };

  const toggleExpand = (propertyId: string) => {
    setExpandedPropertyId(expandedPropertyId === propertyId ? null : propertyId);
  };

  const getPaidPercentage = (property: OffplanProperty) => {
    if (!property.payments || property.payments.length === 0) return 0;
    const totalAmount = property.payments.reduce((sum, p) => sum + p.amount, 0);
    const paidAmount = property.payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.paid_amount || p.amount), 0);
    return totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  };

  const getNextPayment = (property: OffplanProperty) => {
    if (!property.payments || property.payments.length === 0) return null;
    const pendingPayments = property.payments
      .filter(p => p.status === 'pending')
      .sort((a, b) => new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime());
    return pendingPayments[0] || null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Off-Plan Properties</h1>
          <p className="mt-1 text-sm text-stone-500">Manage your off-plan property investments</p>
        </div>
        <button
          onClick={handleCreateProperty}
          className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Property
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-stone-200 p-4">
            <div className="text-sm text-stone-500 mb-1">Total Investment</div>
            <div className="text-2xl font-semibold text-stone-900">
              AED {formatCurrency(summary.total_investment)}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-stone-200 p-4">
            <div className="text-sm text-stone-500 mb-1">Total Paid</div>
            <div className="text-2xl font-semibold text-green-600">
              AED {formatCurrency(summary.total_paid)}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-stone-200 p-4">
            <div className="text-sm text-stone-500 mb-1">Remaining</div>
            <div className="text-2xl font-semibold text-amber-600">
              AED {formatCurrency(summary.total_pending + summary.total_overdue)}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-stone-200 p-4">
            <div className="text-sm text-stone-500 mb-1">Paid %</div>
            <div className="text-2xl font-semibold text-sky-600">
              {summary.total_investment > 0
                ? ((summary.total_paid / summary.total_investment) * 100).toFixed(1)
                : 0}%
            </div>
          </div>
        </div>
      )}

      {/* Properties Table */}
      <div className="bg-white rounded-lg border border-stone-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Developer / Project
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Emirate
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Paid %
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Next Payment
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-stone-500">
                    Loading...
                  </td>
                </tr>
              ) : properties.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-stone-500">
                    No off-plan properties found
                  </td>
                </tr>
              ) : (
                properties.map((property) => {
                  const paidPercentage = getPaidPercentage(property);
                  const nextPayment = getNextPayment(property);
                  const isExpanded = expandedPropertyId === property.id;

                  return (
                    <>
                      <tr
                        key={property.id}
                        className="hover:bg-stone-50 cursor-pointer"
                        onClick={() => toggleExpand(property.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                            <div>
                              <div className="font-medium text-stone-900">{property.developer}</div>
                              <div className="text-sm text-stone-500">{property.project_name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-stone-900">{property.unit_number}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-stone-600">
                            <MapPin className="w-4 h-4" />
                            <span className="capitalize">{property.emirate.replace('_', ' ')}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-stone-900">
                          AED {formatCurrency(property.total_cost || 0)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center">
                            <div className="w-full max-w-[100px]">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-stone-600">
                                  {paidPercentage.toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full bg-stone-200 rounded-full h-2">
                                <div
                                  className="bg-sky-600 h-2 rounded-full"
                                  style={{ width: `${paidPercentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {nextPayment ? (
                            <div className="text-sm">
                              <div className="font-medium text-stone-900">
                                AED {formatCurrency(nextPayment.amount)}
                              </div>
                              <div className="text-stone-500">{formatDate(nextPayment.due_date)}</div>
                            </div>
                          ) : (
                            <span className="text-stone-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusColor(property.status)}`}>
                              {property.status.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={(e) => handleEditProperty(property, e)}
                              className="p-1 text-stone-400 hover:text-sky-600"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteProperty(property, e)}
                              className="p-1 text-stone-400 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Payment Schedule */}
                      {isExpanded && property.payments && property.payments.length > 0 && (
                        <tr>
                          <td colSpan={8} className="px-4 py-4 bg-stone-50">
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-stone-900 mb-3">Payment Schedule</h4>
                              <div className="grid grid-cols-1 gap-2">
                                {property.payments.map((payment) => (
                                  <div
                                    key={payment.id}
                                    className="flex items-center justify-between bg-white p-3 rounded-lg border border-stone-200"
                                  >
                                    <div className="flex items-center gap-4">
                                      <div className="text-sm">
                                        <span className="font-medium text-stone-900">
                                          #{payment.installment_number}
                                        </span>
                                        <span className="text-stone-500 ml-2">{payment.milestone_name}</span>
                                      </div>
                                      <div className="text-sm text-stone-600">
                                        <Calendar className="w-4 h-4 inline mr-1" />
                                        {formatDate(payment.due_date)}
                                      </div>
                                      <div className="text-sm font-medium text-stone-900">
                                        AED {formatCurrency(payment.amount)}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusColor(payment.status)}`}>
                                        {payment.status}
                                      </span>
                                      {payment.status === 'pending' && (
                                        <button
                                          onClick={(e) => handleMarkPaymentPaid(payment, e)}
                                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 flex items-center gap-1"
                                        >
                                          <Check className="w-3 h-3" />
                                          Mark Paid
                                        </button>
                                      )}
                                      {payment.status === 'paid' && payment.paid_date && (
                                        <div className="text-xs text-stone-500">
                                          Paid: {formatDate(payment.paid_date)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-stone-900">
                  {selectedProperty ? 'Edit Property' : 'Add Off-Plan Property'}
                </h2>
                <button
                  onClick={() => setShowFormModal(false)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmitForm} className="space-y-6">
                {/* Developer & Project */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Developer *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.developer}
                      onChange={(e) => setFormData({ ...formData, developer: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.project_name}
                      onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Unit Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Unit Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.unit_number}
                      onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      value={formData.reference_number}
                      onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Emirate *
                    </label>
                    <select
                      required
                      value={formData.emirate}
                      onChange={(e) => setFormData({ ...formData, emirate: e.target.value as any })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    >
                      {EMIRATE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Area
                    </label>
                    <input
                      type="text"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Community
                    </label>
                    <input
                      type="text"
                      value={formData.community}
                      onChange={(e) => setFormData({ ...formData, community: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Property Specs */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Bedrooms
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.bedrooms}
                      onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Bathrooms
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.bathrooms}
                      onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Parking Spots
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.parking_spots}
                      onChange={(e) => setFormData({ ...formData, parking_spots: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Financial Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Base Price (AED) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.base_price}
                      onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Land Dept Fee %
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.land_dept_fee_percent}
                      onChange={(e) => setFormData({ ...formData, land_dept_fee_percent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Admin Fees (AED)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.admin_fees}
                      onChange={(e) => setFormData({ ...formData, admin_fees: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Other Fees (AED)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.other_fees}
                      onChange={(e) => setFormData({ ...formData, other_fees: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Total Cost Display */}
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
                  <div className="text-sm text-stone-600 mb-1">Total Cost</div>
                  <div className="text-2xl font-semibold text-stone-900">
                    AED {formatCurrency(calculateTotalCost())}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Purchase Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Expected Handover
                    </label>
                    <input
                      type="date"
                      value={formData.expected_handover}
                      onChange={(e) => setFormData({ ...formData, expected_handover: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
                  >
                    {selectedProperty ? 'Update Property' : 'Create Property'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-stone-900">Delete Property</h3>
            </div>
            <p className="text-stone-600 mb-6">
              Are you sure you want to delete {selectedProperty.project_name} - {selectedProperty.unit_number}?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Payment as Paid Modal */}
      {showMarkPaidModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-stone-900">Mark Payment as Paid</h3>
              <button
                onClick={() => setShowMarkPaidModal(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitMarkPaid} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Paid Date *
                </label>
                <input
                  type="date"
                  required
                  value={markPaidData.paid_date}
                  onChange={(e) => setMarkPaidData({ ...markPaidData, paid_date: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Paid Amount (AED) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={markPaidData.paid_amount}
                  onChange={(e) => setMarkPaidData({ ...markPaidData, paid_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Payment Method *
                </label>
                <input
                  type="text"
                  required
                  value={markPaidData.payment_method}
                  onChange={(e) => setMarkPaidData({ ...markPaidData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="e.g., Bank Transfer, Cheque"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Payment Reference
                </label>
                <input
                  type="text"
                  value={markPaidData.payment_reference}
                  onChange={(e) => setMarkPaidData({ ...markPaidData, payment_reference: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Reference number or transaction ID"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowMarkPaidModal(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Mark as Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
