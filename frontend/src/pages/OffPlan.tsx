import { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Check,
  Calendar,
  MapPin,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../api/client';
import type { OffplanProperty, OffplanPropertyCreate, OffplanPayment, OffplanInvestmentSummary } from '../api/client';

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
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
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

  // Payment schedule state
  interface PaymentFormData {
    id?: string;  // undefined for new, has value for existing
    installment_number: number;
    milestone_name: string;
    percentage: number;
    amount: number;
    due_date: string;
  }
  const [payments, setPayments] = useState<PaymentFormData[]>([]);

  // Mark paid form
  const [markPaidData, setMarkPaidData] = useState({
    paid_date: '',
    paid_amount: 0,
    payment_method: 'bank_transfer',
    payment_reference: '',
  });

  // Document upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadPropertyId, setUploadPropertyId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [documentName, setDocumentName] = useState('');

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
    setPayments([]);
    setShowFormModal(true);
  };

  const addPayment = () => {
    const newPayment = {
      installment_number: payments.length + 1,
      milestone_name: '',
      percentage: 0,
      amount: 0,
      due_date: '',
    };
    setPayments([...payments, newPayment]);
  };

  const updatePayment = (index: number, field: string, value: any) => {
    const updatedPayments = [...payments];
    updatedPayments[index] = { ...updatedPayments[index], [field]: value };

    // Auto-calculate amount if percentage changes
    if (field === 'percentage') {
      const basePrice = Number(formData.base_price) || 0;
      updatedPayments[index].amount = (basePrice * value) / 100;
    }

    setPayments(updatedPayments);
  };

  const deletePayment = (index: number) => {
    const updatedPayments = payments.filter((_, i) => i !== index);
    // Renumber installments
    updatedPayments.forEach((p, i) => {
      p.installment_number = i + 1;
    });
    setPayments(updatedPayments);
  };

  const addStandard6040 = () => {
    const basePrice = Number(formData.base_price) || 0;
    const today = new Date().toISOString().split('T')[0];
    setPayments([
      {
        installment_number: 1,
        milestone_name: 'Booking (60%)',
        percentage: 60,
        amount: (basePrice * 60) / 100,
        due_date: today,
      },
      {
        installment_number: 2,
        milestone_name: 'Handover (40%)',
        percentage: 40,
        amount: (basePrice * 40) / 100,
        due_date: formData.expected_handover || '',
      },
    ]);
  };

  const addConstructionLinked = () => {
    const basePrice = Number(formData.base_price) || 0;
    const today = new Date().toISOString().split('T')[0];
    setPayments([
      {
        installment_number: 1,
        milestone_name: 'Booking (10%)',
        percentage: 10,
        amount: (basePrice * 10) / 100,
        due_date: today,
      },
      {
        installment_number: 2,
        milestone_name: 'SPA Signing (10%)',
        percentage: 10,
        amount: (basePrice * 10) / 100,
        due_date: '',
      },
      {
        installment_number: 3,
        milestone_name: '25% Construction (20%)',
        percentage: 20,
        amount: (basePrice * 20) / 100,
        due_date: '',
      },
      {
        installment_number: 4,
        milestone_name: '50% Construction (20%)',
        percentage: 20,
        amount: (basePrice * 20) / 100,
        due_date: '',
      },
      {
        installment_number: 5,
        milestone_name: '75% Construction (20%)',
        percentage: 20,
        amount: (basePrice * 20) / 100,
        due_date: '',
      },
      {
        installment_number: 6,
        milestone_name: 'Handover (20%)',
        percentage: 20,
        amount: (basePrice * 20) / 100,
        due_date: formData.expected_handover || '',
      },
    ]);
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
    // Load existing payments - map them to include their IDs
    setPayments(property.payments?.map(p => ({
      id: p.id,
      installment_number: p.installment_number,
      milestone_name: p.milestone_name,
      percentage: p.percentage,
      amount: p.amount,
      due_date: p.due_date || '',
    })) || []);
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
    if (isSaving) return; // Prevent double submission

    setIsSaving(true);
    try {
      const totalCost = calculateTotalCost();

      if (selectedProperty) {
        // Update existing property
        console.log('Updating property with payments:', payments);

        // First, update the property details (without payments in the update call)
        const dataToSubmit = {
          ...formData,
          total_cost: totalCost,
        };
        await api.updateOffplanProperty(selectedProperty.id, dataToSubmit);

        // Then add new payments separately (those without an 'id' field)
        const newPayments = payments.filter(p => !p.id);
        console.log('Adding new payments:', newPayments);

        for (const payment of newPayments) {
          await api.addOffplanPayment(selectedProperty.id, {
            installment_number: payment.installment_number,
            milestone_name: payment.milestone_name,
            percentage: payment.percentage,
            amount: payment.amount,
            due_date: payment.due_date || undefined,
          });
        }
      } else {
        // Create new property with all payments
        console.log('Creating property with payments:', payments);
        const dataToSubmit = {
          ...formData,
          total_cost: totalCost,
          payments: payments.length > 0 ? payments.map(p => ({
            installment_number: p.installment_number,
            milestone_name: p.milestone_name,
            percentage: p.percentage,
            amount: p.amount,
            due_date: p.due_date || undefined,
          })) : undefined,
        };
        await api.createOffplanProperty(dataToSubmit);
      }

      setShowFormModal(false);
      loadProperties();
      loadSummary();
    } catch (error) {
      console.error('Failed to save property:', error);
      alert('Failed to save property. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedProperty || isDeleting) return;

    setIsDeleting(true);
    try {
      await api.deleteOffplanProperty(selectedProperty.id);
      setShowDeleteConfirm(false);
      setSelectedProperty(null);
      loadProperties();
      loadSummary();
    } catch (error) {
      console.error('Failed to delete property:', error);
      alert('Failed to delete property. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmitMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment || isMarkingPaid) return;

    setIsMarkingPaid(true);
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
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const toggleExpand = (propertyId: string) => {
    setExpandedPropertyId(expandedPropertyId === propertyId ? null : propertyId);
  };

  const handleUploadDocument = (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadPropertyId(propertyId);
    setUploadFile(null);
    setDocumentType('');
    setDocumentName('');
    setShowUploadModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      setDocumentName(file.name);
    }
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadPropertyId || !uploadFile) return;

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1]; // Remove data:mime;base64, prefix

        await api.uploadOffplanDocument(uploadPropertyId!, {
          document_type: documentType,
          document_name: documentName,
          file_data: base64Data,
          file_size: uploadFile.size,
          mime_type: uploadFile.type,
        });

        setShowUploadModal(false);
        loadProperties();
      };
      reader.readAsDataURL(uploadFile);
    } catch (error) {
      console.error('Failed to upload document:', error);
      alert('Failed to upload document. Please try again.');
    }
  };

  const handleDownloadDocument = async (documentId: string, documentName: string) => {
    try {
      const response = await api.getOffplanDocument(documentId);
      const { file_data, mime_type } = response.data;

      // Convert base64 to blob
      const byteCharacters = atob(file_data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mime_type || 'application/octet-stream' });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = documentName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download document:', error);
      alert('Failed to download document. Please try again.');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await api.deleteOffplanDocument(documentId);
      loadProperties();
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  const handleExportExcel = () => {
    // Prepare data for Excel export
    const exportData: any[] = [];

    properties.forEach((property) => {
      if (property.payments && property.payments.length > 0) {
        property.payments.forEach((payment) => {
          exportData.push({
            Developer: property.developer,
            Project: property.project_name,
            Unit: property.unit_number,
            Emirate: property.emirate.replace('_', ' '),
            'Installment #': payment.installment_number,
            Milestone: payment.milestone_name,
            'Percentage %': payment.percentage,
            'Amount AED': payment.amount,
            'Due Date': payment.due_date || 'TBD',
            Status: payment.status,
            'Paid Date': payment.paid_date || '-',
            'Paid Amount': payment.paid_amount || '-',
          });
        });
      } else {
        // Property without payments
        exportData.push({
          Developer: property.developer,
          Project: property.project_name,
          Unit: property.unit_number,
          Emirate: property.emirate.replace('_', ' '),
          'Installment #': '-',
          Milestone: 'No payment schedule',
          'Percentage %': '-',
          'Amount AED': property.total_cost || 0,
          'Due Date': '-',
          Status: '-',
          'Paid Date': '-',
          'Paid Amount': '-',
        });
      }
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payment Schedule');

    // Download file
    XLSX.writeFile(wb, `OffPlan_Payment_Schedule_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportSummary = () => {
    // Export investment summary
    const summaryData = [{
      'Total Properties': summary?.total_properties || 0,
      'Total Investment AED': summary?.total_investment || 0,
      'Total Paid AED': summary?.total_paid || 0,
      'Remaining AED': (summary?.total_investment || 0) - (summary?.total_paid || 0),
      'Paid Percentage': summary?.total_investment ? ((summary.total_paid / summary.total_investment) * 100).toFixed(2) + '%' : '0%',
    }];

    // Property breakdown
    const propertyData = properties.map((property) => ({
      Developer: property.developer,
      Project: property.project_name,
      Unit: property.unit_number,
      Emirate: property.emirate.replace('_', ' '),
      'Total Cost AED': property.total_cost || 0,
      'Total Paid AED': property.payments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.paid_amount || p.amount), 0) || 0,
      'Remaining AED': (property.total_cost || 0) - (property.payments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.paid_amount || p.amount), 0) || 0),
      Status: property.status,
      'Purchase Date': property.purchase_date || '-',
      'Expected Handover': property.expected_handover || '-',
    }));

    const wb = XLSX.utils.book_new();

    // Add summary sheet
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Add properties sheet
    const wsProperties = XLSX.utils.json_to_sheet(propertyData);
    XLSX.utils.book_append_sheet(wb, wsProperties, 'Properties');

    XLSX.writeFile(wb, `OffPlan_Investment_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
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
        <div className="flex gap-2">
          <div className="relative group">
            <button
              className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 flex items-center gap-2"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Export
              <ChevronDown className="w-4 h-4" />
            </button>
            <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-stone-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={handleExportExcel}
                className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 rounded-t-lg flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Payment Schedule (Excel)
              </button>
              <button
                onClick={handleExportSummary}
                className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 rounded-b-lg flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Investment Summary (Excel)
              </button>
            </div>
          </div>
          <button
            onClick={handleCreateProperty}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Property
          </button>
        </div>
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
              AED {formatCurrency(summary.total_investment - summary.total_paid)}
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

                      {/* Expanded Cost Breakdown, Payment Schedule and Documents */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="px-4 py-4 bg-stone-50">
                            <div className="space-y-4">
                              {/* Cost Breakdown Section */}
                              <div className="bg-white rounded-lg p-4 border border-stone-200">
                                <h4 className="font-semibold text-stone-900 mb-3">Cost Breakdown</h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-stone-600">Base Price</span>
                                    <span className="font-medium text-stone-900">AED {(property.base_price || 0).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-stone-600">Land Dept Fee ({property.land_dept_fee_percent || 4}%)</span>
                                    <span className="font-medium text-stone-900">AED {(property.land_dept_fee || 0).toLocaleString()}</span>
                                  </div>
                                  {(property.admin_fees || 0) > 0 && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-stone-600">Admin Fees</span>
                                      <span className="font-medium text-stone-900">AED {(property.admin_fees || 0).toLocaleString()}</span>
                                    </div>
                                  )}
                                  {(property.other_fees || 0) > 0 && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-stone-600">Other Fees</span>
                                      <span className="font-medium text-stone-900">AED {(property.other_fees || 0).toLocaleString()}</span>
                                    </div>
                                  )}
                                  <div className="border-t border-stone-200 pt-2 mt-2">
                                    <div className="flex justify-between items-center">
                                      <span className="font-semibold text-stone-900">Total Cost</span>
                                      <span className="font-bold text-lg text-sky-600">AED {(property.total_cost || 0).toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                                <p className="text-xs text-stone-500 mt-3">* Land Dept Fee and Admin Fees are typically paid at booking/SPA signing</p>
                              </div>

                              {/* Payment Schedule Section */}
                              <div>
                                <div className="flex justify-between items-center mb-3">
                                  <h4 className="text-sm font-medium text-stone-900">Payment Schedule</h4>
                                </div>
                                {property.payments && property.payments.length > 0 ? (
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
                                            <span className="text-stone-400 mr-1">{payment.percentage}%</span>
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
                                ) : (
                                  <div className="text-sm text-stone-500 bg-white p-3 rounded-lg border border-stone-200">
                                    No payment schedule added
                                  </div>
                                )}
                              </div>

                              {/* Documents Section */}
                              <div>
                                <div className="flex justify-between items-center mb-3">
                                  <h4 className="text-sm font-medium text-stone-900">Documents</h4>
                                  <button
                                    onClick={(e) => handleUploadDocument(property.id, e)}
                                    className="px-3 py-1.5 text-xs bg-sky-600 text-white rounded-lg hover:bg-sky-700 flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" />
                                    Upload
                                  </button>
                                </div>
                                {property.documents && property.documents.length > 0 ? (
                                  <div className="grid grid-cols-1 gap-2">
                                    {property.documents.map((doc) => (
                                      <div
                                        key={doc.id}
                                        className="flex items-center justify-between bg-white p-3 rounded-lg border border-stone-200"
                                      >
                                        <div className="flex items-center gap-3">
                                          <FileText className="w-4 h-4 text-stone-400" />
                                          <div>
                                            <div className="text-sm font-medium text-stone-900">{doc.document_name}</div>
                                            <div className="text-xs text-stone-500 capitalize">{doc.document_type.replace('_', ' ')}</div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => handleDownloadDocument(doc.id, doc.document_name)}
                                            className="p-1.5 text-stone-400 hover:text-sky-600"
                                            title="Download"
                                          >
                                            <Download className="w-4 h-4" />
                                          </button>                                          <button
                                            onClick={() => handleDeleteDocument(doc.id)}
                                            className="p-1.5 text-stone-400 hover:text-red-600"
                                            title="Delete"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-sm text-stone-500 bg-white p-3 rounded-lg border border-stone-200">
                                    No documents uploaded
                                  </div>
                                )}
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

                {/* Payment Schedule Section */}
                <div className="border-t border-stone-200 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-stone-900">Payment Schedule</h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={addStandard6040}
                        className="px-3 py-1.5 text-sm border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50"
                      >
                        Add Standard 60/40
                      </button>
                      <button
                        type="button"
                        onClick={addConstructionLinked}
                        className="px-3 py-1.5 text-sm border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50"
                      >
                        Add Construction Linked
                      </button>
                      <button
                        type="button"
                        onClick={addPayment}
                        className="px-3 py-1.5 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700 flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Payment
                      </button>
                    </div>
                  </div>

                  {payments.length > 0 ? (
                    <div className="border border-stone-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-stone-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-stone-600">#</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-stone-600">Milestone</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-stone-600">%</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-stone-600">Amount AED</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-stone-600">Due Date</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-stone-600"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200">
                          {payments.map((payment, index) => (
                            <tr key={index}>
                              <td className="px-3 py-2 text-sm text-stone-600">{payment.installment_number}</td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={payment.milestone_name}
                                  onChange={(e) => updatePayment(index, 'milestone_name', e.target.value)}
                                  placeholder="e.g., Booking, SPA, Handover"
                                  className="w-full px-2 py-1 text-sm border border-stone-300 rounded focus:ring-1 focus:ring-sky-500"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={payment.percentage}
                                  onChange={(e) => updatePayment(index, 'percentage', parseFloat(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 text-sm border border-stone-300 rounded focus:ring-1 focus:ring-sky-500"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={payment.amount}
                                  onChange={(e) => updatePayment(index, 'amount', parseFloat(e.target.value) || 0)}
                                  className="w-32 px-2 py-1 text-sm border border-stone-300 rounded focus:ring-1 focus:ring-sky-500"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="date"
                                  value={payment.due_date}
                                  onChange={(e) => updatePayment(index, 'due_date', e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-stone-300 rounded focus:ring-1 focus:ring-sky-500"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => deletePayment(index)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-stone-500 bg-stone-50 rounded-lg border border-stone-200">
                      No payment schedule added. Use quick actions or add payments manually.
                    </div>
                  )}
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
                    disabled={isSaving}
                    className={`px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={`px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isSaving ? 'Saving...' : (selectedProperty ? 'Update Property' : 'Create Property')}
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
                disabled={isDeleting}
                className={`px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className={`px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && uploadPropertyId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-stone-900">Upload Document</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Document Type *
                </label>
                <select
                  required
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                >
                  <option value="">Select type...</option>
                  <option value="spa">SPA</option>
                  <option value="offer_letter">Offer Letter</option>
                  <option value="payment_receipt">Payment Receipt</option>
                  <option value="oqood">Oqood</option>
                  <option value="noc">NOC</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Document Name
                </label>
                <input
                  type="text"
                  required
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Enter document name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  File *
                </label>
                <input
                  type="file"
                  required
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
                <p className="text-xs text-stone-500 mt-1">PDF, images, or Word documents</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
                >
                  Upload
                </button>
              </div>
            </form>
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
                <select
                  required
                  value={markPaidData.payment_method}
                  onChange={(e) => setMarkPaidData({ ...markPaidData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                </select>
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
                  disabled={isMarkingPaid}
                  className={`px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 ${isMarkingPaid ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMarkingPaid}
                  className={`px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 ${isMarkingPaid ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Check className="w-4 h-4" />
                  {isMarkingPaid ? 'Saving...' : 'Mark as Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
