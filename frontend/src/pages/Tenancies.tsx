import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  XCircle,
  FileText,
  X,
  AlertTriangle,
  Banknote,
  Eye,
} from 'lucide-react';
import { api } from '../api/client';
import type { DepositTransaction } from '../api/client';

interface Property {
  id: string;
  name: string;
}

interface Cheque {
  id: string;
  tenancy_id: string;
  payment_method?: 'cheque' | 'bank_transfer' | 'cash';
  cheque_number?: string;
  bank_name?: string;
  reference_number?: string;
  amount: number;
  due_date: string;
  status: string;
  deposited_date?: string;
  cleared_date?: string;
  bounce_reason?: string;
  notes?: string;
}

interface Document {
  id: string;
  tenancy_id: string;
  document_type: string;
  filename: string;
  file_size?: number;
  mime_type?: string;
  uploaded_at: string;
}


interface Tenancy {
  id: string;
  property_id: string;
  tenant_name: string;
  tenant_email: string;
  tenant_phone: string;
  contract_start: string;
  contract_end: string;
  annual_rent: number;
  contract_value: number;
  security_deposit: number;
  num_cheques: number;
  ejari_number?: string;
  status: string;
  previous_tenancy_id?: string;
  termination_date?: string;
  termination_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  cheques?: Cheque[];
  documents?: Document[];
  property_name?: string;
}

// SAP-style status badge colors
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    active: 'bg-green-50 text-green-700 border border-green-200',
    confirmed: 'bg-green-50 text-green-700 border border-green-200',
    cleared: 'bg-green-50 text-green-700 border border-green-200',
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    deposited: 'bg-sky-50 text-sky-700 border border-sky-200',
    expired: 'bg-stone-100 text-stone-600 border border-stone-200',
    terminated: 'bg-red-50 text-red-700 border border-red-200',
    bounced: 'bg-red-50 text-red-700 border border-red-200',
    renewed: 'bg-sky-50 text-sky-700 border border-sky-200',
  };
  return colors[status.toLowerCase()] || 'bg-stone-100 text-stone-600 border border-stone-200';
};

// Payment method configuration
const PAYMENT_METHOD_CONFIG = {
  cheque: { label: 'Cheque', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  bank_transfer: { label: 'Bank Transfer', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  cash: { label: 'Cash', color: 'bg-green-50 text-green-700 border-green-200' },
};

// Payment method badge component
const PaymentMethodBadge = ({ method }: { method?: string }) => {
  const config = PAYMENT_METHOD_CONFIG[method as keyof typeof PAYMENT_METHOD_CONFIG] || PAYMENT_METHOD_CONFIG.cheque;
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${config.color}`}>
      {config.label}
    </span>
  );
};

const DOCUMENT_TYPES = [
  { value: 'contract', label: 'Contract' },
  { value: 'emirates_id', label: 'Emirates ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'trade_license', label: 'Trade License' },
  { value: 'other', label: 'Other' },
];

export default function Tenancies() {
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkFilter = searchParams.get('filter') || '';

  const [properties, setProperties] = useState<Property[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Selected tenancy for operations
  const [selectedTenancy, setSelectedTenancy] = useState<Tenancy | null>(null);
  const [detailsTab, setDetailsTab] = useState<'cheques' | 'documents' | 'deposit'>('cheques');

  // Deposit tab state
  const [depositTransactions, setDepositTransactions] = useState<DepositTransaction[]>([]);
  const [loadingDeposits, setLoadingDeposits] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositForm, setDepositForm] = useState({
    transaction_type: 'received' as 'received' | 'deduction' | 'refund',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    deduction_reason: 'damages',
  });

  // Form state
  const [formData, setFormData] = useState({
    property_id: '',
    tenant_name: '',
    tenant_email: '',
    tenant_phone: '',
    contract_start: '',
    contract_end: '',
    annual_rent: 0,
    contract_value: 0,
    security_deposit: 0,
    num_cheques: 1,
    ejari_number: '',
    notes: '',
    auto_split_cheques: true,
  });

  // Renewal form
  const [renewalData, setRenewalData] = useState({
    contract_start: '',
    contract_end: '',
    annual_rent: 0,
    num_cheques: 1,
  });

  // Termination form
  const [terminationData, setTerminationData] = useState({
    termination_date: '',
    termination_reason: '',
  });

  // Document upload
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docType, setDocType] = useState('contract');

  // Cheque editing
  const [editingChequeId, setEditingChequeId] = useState<string | null>(null);
  const [editChequeData, setEditChequeData] = useState({
    payment_method: 'cheque' as 'cheque' | 'bank_transfer' | 'cash',
    cheque_number: '',
    bank_name: '',
    reference_number: '',
    due_date: '',
    amount: 0,
  });

  // Add payment
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [newPaymentData, setNewPaymentData] = useState({
    payment_method: 'bank_transfer' as 'cheque' | 'bank_transfer' | 'cash',
    amount: '',
    due_date: '',
    cheque_number: '',
    bank_name: '',
    reference_number: '',
    status: 'pending',
  });

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    loadTenancies();
  }, [selectedProperty, statusFilter]);

  const loadProperties = async () => {
    try {
      const response = await api.getProperties();
      setProperties(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load properties:', error);
      setIsLoading(false);
    }
  };

  const loadTenancies = async () => {
    setIsLoading(true);
    try {
      const params: { property_id?: string; status?: string } = {};
      if (selectedProperty) params.property_id = selectedProperty;
      if (statusFilter) params.status = statusFilter;

      const response = await api.getTenancies(params);
      setTenancies(response.data as any);
    } catch (error) {
      console.error('Failed to load tenancies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredTenancies = tenancies.filter((t) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matches =
        t.tenant_name.toLowerCase().includes(query) ||
        t.tenant_email.toLowerCase().includes(query) ||
        (t.ejari_number && t.ejari_number.toLowerCase().includes(query));
      if (!matches) return false;
    }

    // Deep-link filters from dashboard alerts (string-based date comparison)
    if (deepLinkFilter) {
      const todayStr = new Date().toISOString().split('T')[0];
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekEndStr = weekEnd.toISOString().split('T')[0];
      const monthEnd = new Date();
      monthEnd.setDate(monthEnd.getDate() + 30);
      const monthEndStr = monthEnd.toISOString().split('T')[0];

      const statusLower = (t.status || '').toLowerCase();

      if (deepLinkFilter === 'expiring') {
        if (statusLower !== 'active') return false;
        if (!t.contract_end) return false;
        const endStr = t.contract_end.split('T')[0];
        if (endStr < todayStr || endStr > monthEndStr) return false;
      } else if (deepLinkFilter === 'overdue_cheques') {
        if (statusLower !== 'active') return false;
        const hasOverdue = (t.cheques || []).some((c) => {
          if ((c.status || '').toLowerCase() !== 'pending') return false;
          const dueStr = (c.due_date || '').split('T')[0];
          return dueStr && dueStr < todayStr;
        });
        if (!hasOverdue) return false;
      } else if (deepLinkFilter === 'due_this_week') {
        if (statusLower !== 'active') return false;
        const hasDue = (t.cheques || []).some((c) => {
          if ((c.status || '').toLowerCase() !== 'pending') return false;
          const dueStr = (c.due_date || '').split('T')[0];
          return dueStr && dueStr >= todayStr && dueStr <= weekEndStr;
        });
        if (!hasDue) return false;
      }
    }

    return true;
  });

  const clearDeepLinkFilter = () => {
    searchParams.delete('filter');
    setSearchParams(searchParams);
  };

  const filterLabels: Record<string, string> = {
    expiring: 'Contracts expiring within 30 days',
    overdue_cheques: 'Tenancies with overdue cheques',
    due_this_week: 'Cheques due this week',
  };

  const resetFormData = () => {
    setFormData({
      property_id: selectedProperty,
      tenant_name: '',
      tenant_email: '',
      tenant_phone: '',
      contract_start: '',
      contract_end: '',
      annual_rent: 0,
      contract_value: 0,
      security_deposit: 0,
      num_cheques: 1,
      ejari_number: '',
      notes: '',
      auto_split_cheques: true,
    });
  };

  const handleCreateTenancy = () => {
    resetFormData();
    setSelectedTenancy(null);
    setShowFormModal(true);
  };

  const handleEditTenancy = (tenancy: Tenancy, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTenancy(tenancy);
    setFormData({
      property_id: tenancy.property_id,
      tenant_name: tenancy.tenant_name,
      tenant_email: tenancy.tenant_email,
      tenant_phone: tenancy.tenant_phone,
      contract_start: tenancy.contract_start,
      contract_end: tenancy.contract_end,
      annual_rent: tenancy.annual_rent,
      contract_value: tenancy.contract_value,
      security_deposit: tenancy.security_deposit,
      num_cheques: tenancy.num_cheques,
      ejari_number: tenancy.ejari_number || '',
      notes: tenancy.notes || '',
      auto_split_cheques: false,
    });
    setShowFormModal(true);
  };

  const handleViewDetails = async (tenancy: Tenancy) => {
    try {
      const response = await api.getTenancy(tenancy.id);
      setSelectedTenancy(response.data as any);
      setDetailsTab('cheques');
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Failed to load tenancy details:', error);
    }
  };

  const loadDepositTransactions = async (tenancyId: string) => {
    setLoadingDeposits(true);
    try {
      const response = await api.getDepositTransactions(tenancyId);
      setDepositTransactions(response.data);
    } catch (error) {
      console.error('Failed to load deposit transactions:', error);
      setDepositTransactions([]);
    } finally {
      setLoadingDeposits(false);
    }
  };

  const handleSubmitDeposit = async () => {
    if (!selectedTenancy) return;
    const amount = parseFloat(depositForm.amount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    try {
      await api.createDepositTransaction({
        tenancy_id: selectedTenancy.id,
        transaction_type: depositForm.transaction_type,
        amount,
        transaction_date: depositForm.transaction_date,
        description: depositForm.description || undefined,
        deduction_reason: depositForm.transaction_type === 'deduction' ? depositForm.deduction_reason : undefined,
      });
      setShowDepositModal(false);
      setDepositForm({
        transaction_type: 'received',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        description: '',
        deduction_reason: 'damages',
      });
      await loadDepositTransactions(selectedTenancy.id);
    } catch (error: any) {
      console.error('Failed to record deposit transaction:', error);
      const detail = error?.response?.data?.detail || error?.message || 'Please try again.';
      alert(`Failed to record deposit transaction:\n${detail}`);
    }
  };

  const handleSubmitForm = async () => {
    if (!formData.property_id) {
      alert('Please select a property');
      return;
    }

    try {
      const payload = {
        property_id: formData.property_id,
        tenant_name: formData.tenant_name,
        tenant_email: formData.tenant_email,
        tenant_phone: formData.tenant_phone,
        contract_start: formData.contract_start,
        contract_end: formData.contract_end,
        annual_rent: Number(formData.annual_rent),
        contract_value: Number(formData.contract_value),
        security_deposit: Number(formData.security_deposit),
        num_cheques: Number(formData.num_cheques) as 0 | 1 | 2 | 3 | 4 | 6 | 12,
        ejari_number: formData.ejari_number || null,
        notes: formData.notes || null,
        auto_split_cheques: formData.auto_split_cheques,
      };

      if (selectedTenancy) {
        await api.updateTenancy(selectedTenancy.id, payload as any);
      } else {
        await api.createTenancy(payload as any);
      }

      setShowFormModal(false);
      loadTenancies();
    } catch (error: any) {
      console.error('Failed to save tenancy:', error);
      console.error('Error response:', error?.response?.data);
      const detail = error?.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map((d: any) => `${d.loc?.join('.')}: ${d.msg}`).join('\n')
        : detail || error?.message || 'Please try again.';
      alert(`Failed to save tenancy:\n${message}`);
    }
  };

  const handleRenew = (tenancy: Tenancy, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTenancy(tenancy);
    const endDate = new Date(tenancy.contract_end);
    const newStart = new Date(endDate);
    newStart.setDate(newStart.getDate() + 1);
    const newEnd = new Date(newStart);
    newEnd.setFullYear(newEnd.getFullYear() + 1);

    setRenewalData({
      contract_start: newStart.toISOString().split('T')[0],
      contract_end: newEnd.toISOString().split('T')[0],
      annual_rent: tenancy.annual_rent,
      num_cheques: tenancy.num_cheques,
    });
    setShowRenewalModal(true);
  };

  const handleSubmitRenewal = async () => {
    if (!selectedTenancy) return;

    try {
      await api.renewTenancy(selectedTenancy.id, {
        ...renewalData,
        annual_rent: Number(renewalData.annual_rent),
        contract_value: Number(renewalData.annual_rent),
        num_cheques: Number(renewalData.num_cheques) as 0 | 1 | 2 | 3 | 4 | 6 | 12,
        auto_split_cheques: true,
        security_deposit: selectedTenancy.security_deposit,
        ejari_number: selectedTenancy.ejari_number || undefined,
        notes: selectedTenancy.notes || undefined,
      });
      setShowRenewalModal(false);
      loadTenancies();
    } catch (error) {
      console.error('Failed to renew tenancy:', error);
      alert('Failed to renew tenancy. Please try again.');
    }
  };

  const handleTerminate = (tenancy: Tenancy, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTenancy(tenancy);
    setTerminationData({
      termination_date: new Date().toISOString().split('T')[0],
      termination_reason: '',
    });
    setShowTerminateModal(true);
  };

  const handleSubmitTermination = async () => {
    if (!selectedTenancy) return;

    try {
      await api.terminateTenancy(selectedTenancy.id, terminationData);
      setShowTerminateModal(false);
      loadTenancies();
    } catch (error) {
      console.error('Failed to terminate tenancy:', error);
      alert('Failed to terminate tenancy. Please try again.');
    }
  };

  const handleDelete = (tenancy: Tenancy, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTenancy(tenancy);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedTenancy) return;

    try {
      await api.deleteTenancy(selectedTenancy.id);
      setShowDeleteConfirm(false);
      loadTenancies();
    } catch (error) {
      console.error('Failed to delete tenancy:', error);
      alert('Failed to delete tenancy. Only tenancies with no cleared cheques can be deleted.');
    }
  };

  // Cheque operations
  const handleDepositCheque = async (chequeId: string) => {
    try {
      await api.depositCheque(chequeId, { deposited_date: new Date().toISOString().split('T')[0] });
      if (selectedTenancy) {
        const response = await api.getTenancy(selectedTenancy.id);
        setSelectedTenancy(response.data as any);
      }
    } catch (error) {
      console.error('Failed to deposit cheque:', error);
    }
  };

  const handleClearCheque = async (chequeId: string) => {
    try {
      await api.clearCheque(chequeId, { cleared_date: new Date().toISOString().split('T')[0] });
      if (selectedTenancy) {
        const response = await api.getTenancy(selectedTenancy.id);
        setSelectedTenancy(response.data as any);
      }
    } catch (error) {
      console.error('Failed to clear cheque:', error);
    }
  };

  const handleBounceCheque = async (chequeId: string) => {
    const reason = prompt('Enter bounce reason:');
    if (!reason) return;

    try {
      await api.bounceCheque(chequeId, { bounce_reason: reason });
      if (selectedTenancy) {
        const response = await api.getTenancy(selectedTenancy.id);
        setSelectedTenancy(response.data as any);
      }
    } catch (error) {
      console.error('Failed to mark cheque as bounced:', error);
    }
  };

  const handleEditCheque = (cheque: Cheque) => {
    setEditingChequeId(cheque.id);
    setEditChequeData({
      payment_method: cheque.payment_method || 'cheque',
      cheque_number: cheque.cheque_number || '',
      bank_name: cheque.bank_name || '',
      reference_number: cheque.reference_number || '',
      due_date: cheque.due_date,
      amount: cheque.amount,
    });
  };

  const handleCancelEditCheque = () => {
    setEditingChequeId(null);
    setEditChequeData({
      payment_method: 'cheque',
      cheque_number: '',
      bank_name: '',
      reference_number: '',
      due_date: '',
      amount: 0,
    });
  };

  const handleSaveCheque = async () => {
    if (!selectedTenancy || !editingChequeId) return;

    try {
      await api.updateCheque(selectedTenancy.id, editingChequeId, {
        payment_method: editChequeData.payment_method,
        cheque_number: editChequeData.payment_method === 'cheque' ? editChequeData.cheque_number : undefined,
        bank_name: editChequeData.payment_method === 'cheque' ? editChequeData.bank_name : undefined,
        reference_number: editChequeData.payment_method === 'bank_transfer' ? editChequeData.reference_number : undefined,
        due_date: editChequeData.due_date,
        amount: Number(editChequeData.amount),
      });

      const response = await api.getTenancy(selectedTenancy.id);
      setSelectedTenancy(response.data as any);
      handleCancelEditCheque();
    } catch (error) {
      console.error('Failed to update cheque:', error);
      alert('Failed to update cheque. Please try again.');
    }
  };

  // Document operations
  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0] || !selectedTenancy) return;

    const file = event.target.files[0];
    setUploadingDoc(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        await api.uploadTenancyDocument(selectedTenancy.id, {
          document_type: docType as any,
          filename: file.name,
          file_data: base64,
          file_size: file.size,
          mime_type: file.type,
        });

        const response = await api.getTenancy(selectedTenancy.id);
        setSelectedTenancy(response.data as any);
        setUploadingDoc(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload document:', error);
      setUploadingDoc(false);
    }
  };

  const handleDownloadDocument = async (docId: string, filename: string) => {
    try {
      const response = await api.getDocument(docId);
      const doc = response.data;

      const link = document.createElement('a');
      link.href = `data:${doc.mime_type};base64,${doc.file_data}`;
      link.download = filename;
      link.click();
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Delete this document?')) return;

    try {
      await api.deleteDocument(docId);
      if (selectedTenancy) {
        const response = await api.getTenancy(selectedTenancy.id);
        setSelectedTenancy(response.data as any);
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  // Add payment
  const handleAddPayment = async () => {
    if (!selectedTenancy || !newPaymentData.amount || !newPaymentData.due_date) {
      alert('Please fill in required fields');
      return;
    }

    try {
      await api.post(`/tenancies/${selectedTenancy.id}/cheques`, {
        payment_method: newPaymentData.payment_method,
        amount: parseFloat(newPaymentData.amount),
        due_date: newPaymentData.due_date,
        cheque_number: newPaymentData.payment_method === 'cheque' ? newPaymentData.cheque_number || null : null,
        bank_name: newPaymentData.payment_method === 'cheque' ? newPaymentData.bank_name || null : null,
        reference_number: newPaymentData.payment_method === 'bank_transfer' ? newPaymentData.reference_number || null : null,
        status: newPaymentData.status,
      });

      // Reset form
      setNewPaymentData({
        payment_method: 'bank_transfer',
        amount: '',
        due_date: '',
        cheque_number: '',
        bank_name: '',
        reference_number: '',
        status: 'pending',
      });
      setShowAddPaymentModal(false);

      // Refresh tenancy data
      const response = await api.getTenancy(selectedTenancy.id);
      setSelectedTenancy(response.data as any);
      loadTenancies();
    } catch (error) {
      console.error('Failed to add payment:', error);
      alert('Failed to add payment. Please try again.');
    }
  };

  if (isLoading && properties.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Building2 className="w-12 h-12 text-stone-300 mb-4" />
        <h2 className="text-lg font-semibold text-stone-800 mb-2">No Properties Yet</h2>
        <p className="text-stone-500 text-sm">Add a property first to manage annual tenancies.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Tenancies</h1>
          <p className="text-sm text-stone-500">{filteredTenancies.length} tenancies</p>
        </div>
        <button
          onClick={handleCreateTenancy}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-600 text-white text-sm font-medium rounded hover:bg-sky-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Tenancy
        </button>
      </div>

      {/* Deep-link filter banner */}
      {deepLinkFilter && filterLabels[deepLinkFilter] && (
        <div className="flex items-center justify-between px-3 py-2 bg-sky-50 border border-sky-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-sky-800">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Filtered:</span>
            <span>{filterLabels[deepLinkFilter]}</span>
            <span className="text-sky-600">({filteredTenancies.length})</span>
          </div>
          <button
            onClick={clearDeepLinkFilter}
            className="flex items-center gap-1 text-xs text-sky-700 hover:text-sky-900"
          >
            <X className="w-3.5 h-3.5" />
            Clear filter
          </button>
        </div>
      )}

      {/* Filters bar */}
      <div className="flex items-center gap-3 py-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search tenant, email, Ejari..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
        </div>
        <select
          value={selectedProperty}
          onChange={(e) => setSelectedProperty(e.target.value)}
          className="text-sm border border-stone-300 rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">All Properties</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-stone-300 rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="terminated">Terminated</option>
          <option value="renewed">Renewed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Tenant</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Property</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Contract Period</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">Annual Rent</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-stone-500 uppercase tracking-wide">Cheques</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto"></div>
                </td>
              </tr>
            ) : filteredTenancies.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-stone-500">
                  <Banknote className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <p className="text-sm">No tenancies match your filters</p>
                  {deepLinkFilter && (
                    <button
                      onClick={clearDeepLinkFilter}
                      className="mt-2 text-xs text-sky-600 hover:text-sky-800 underline"
                    >
                      Clear active filter to see all tenancies
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredTenancies.map((tenancy) => (
                <tr
                  key={tenancy.id}
                  className="hover:bg-stone-50 cursor-pointer"
                  onClick={() => handleViewDetails(tenancy)}
                >
                  <td className="px-4 py-2.5">
                    <div className="text-sm font-medium text-stone-900">{tenancy.tenant_name}</div>
                    <div className="text-xs text-stone-500">{tenancy.tenant_email}</div>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-stone-600">
                    {tenancy.property_name || properties.find(p => p.id === tenancy.property_id)?.name || '-'}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-stone-600 tabular-nums">
                    {formatDate(tenancy.contract_start)} – {formatDate(tenancy.contract_end)}
                  </td>
                  <td className="px-4 py-2.5 text-sm font-medium text-stone-900 text-right tabular-nums">
                    AED {formatCurrency(tenancy.annual_rent)}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-stone-600 text-center tabular-nums">
                    {tenancy.cheques?.length || 0}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(tenancy.status)}`}>
                      {tenancy.status.charAt(0).toUpperCase() + tenancy.status.slice(1)}
                    </span>
                    {tenancy.previous_tenancy_id && (
                      <span className="ml-1 text-xs text-sky-600">↻</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewDetails(tenancy); }}
                        className="p-1 text-stone-400 hover:text-stone-600"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {tenancy.status === 'active' && (
                        <>
                          <button
                            onClick={(e) => handleEditTenancy(tenancy, e)}
                            className="p-1 text-stone-400 hover:text-sky-600"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleRenew(tenancy, e)}
                            className="p-1 text-stone-400 hover:text-green-600"
                            title="Renew"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleTerminate(tenancy, e)}
                            className="p-1 text-stone-400 hover:text-red-600"
                            title="Terminate"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={(e) => handleDelete(tenancy, e)}
                        className="p-1 text-stone-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30" onClick={() => setShowFormModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                <h2 className="text-base font-semibold text-stone-900">
                  {selectedTenancy ? 'Edit Tenancy' : 'New Tenancy'}
                </h2>
                <button onClick={() => setShowFormModal(false)} className="p-1 text-stone-400 hover:text-stone-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Property Selection */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Property *</label>
                  <select
                    value={formData.property_id}
                    onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  >
                    <option value="">Select property...</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Tenant Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-stone-700 mb-1">Tenant Name *</label>
                    <input
                      type="text"
                      value={formData.tenant_name}
                      onChange={(e) => setFormData({ ...formData, tenant_name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={formData.tenant_email}
                      onChange={(e) => setFormData({ ...formData, tenant_email: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Phone *</label>
                    <input
                      type="tel"
                      value={formData.tenant_phone}
                      onChange={(e) => setFormData({ ...formData, tenant_phone: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    />
                  </div>
                </div>

                {/* Contract Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Contract Start *</label>
                    <input
                      type="date"
                      value={formData.contract_start}
                      onChange={(e) => setFormData({ ...formData, contract_start: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Contract End *</label>
                    <input
                      type="date"
                      value={formData.contract_end}
                      onChange={(e) => setFormData({ ...formData, contract_end: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    />
                  </div>
                </div>

                {/* Financial */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Annual Rent (AED) *</label>
                    <input
                      type="number"
                      value={formData.annual_rent}
                      onChange={(e) => {
                        const rent = Number(e.target.value);
                        setFormData({ ...formData, annual_rent: rent, contract_value: rent });
                      }}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Security Deposit (AED)</label>
                    <input
                      type="number"
                      value={formData.security_deposit}
                      onChange={(e) => setFormData({ ...formData, security_deposit: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Auto-Generate Payments</label>
                    <select
                      value={formData.num_cheques}
                      onChange={(e) => setFormData({ ...formData, num_cheques: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value={0}>None - I'll add payments manually</option>
                      <option value={1}>1 Payment</option>
                      <option value={2}>2 Payments</option>
                      <option value={3}>3 Payments</option>
                      <option value={4}>4 Payments</option>
                      <option value={6}>6 Payments</option>
                      <option value={12}>12 Payments</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Ejari Number</label>
                    <input
                      type="text"
                      value={formData.ejari_number}
                      onChange={(e) => setFormData({ ...formData, ejari_number: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                {!selectedTenancy && formData.num_cheques > 0 && (
                  <div className="bg-sky-50 p-3 rounded text-sm text-sky-700">
                    <strong>Auto-split enabled:</strong> {formData.num_cheques} payment{formData.num_cheques > 1 ? 's' : ''} of AED {formatCurrency(formData.annual_rent / formData.num_cheques)} each will be created automatically.
                  </div>
                )}

                {!selectedTenancy && formData.num_cheques === 0 && (
                  <div className="bg-amber-50 p-3 rounded text-sm text-amber-700">
                    <strong>Manual payments:</strong> No payments will be auto-generated. You can add payments with different amounts and methods after creating the tenancy.
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="px-4 py-3 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowFormModal(false)}
                  className="px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitForm}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded transition-colors"
                >
                  {selectedTenancy ? 'Update' : 'Create'} Tenancy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedTenancy && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30" onClick={() => setShowDetailsModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-stone-900">{selectedTenancy.tenant_name}</h2>
                  <p className="text-sm text-stone-500">{selectedTenancy.tenant_email} • {selectedTenancy.tenant_phone}</p>
                  <p className="text-xs text-stone-500">
                    Contract: {new Date(selectedTenancy.contract_start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {' - '}
                    {new Date(selectedTenancy.contract_end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {selectedTenancy.previous_tenancy_id && (
                      <span className="ml-2 text-sky-600">(Renewal)</span>
                    )}
                  </p>
                </div>
                <button onClick={() => setShowDetailsModal(false)} className="p-1 text-stone-400 hover:text-stone-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="border-b border-stone-200">
                <nav className="flex space-x-6 px-4">
                  <button
                    onClick={() => setDetailsTab('cheques')}
                    className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                      detailsTab === 'cheques'
                        ? 'border-sky-600 text-sky-600'
                        : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    Payments ({selectedTenancy.cheques?.length || 0})
                  </button>
                  <button
                    onClick={() => setDetailsTab('documents')}
                    className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                      detailsTab === 'documents'
                        ? 'border-sky-600 text-sky-600'
                        : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    Documents ({selectedTenancy.documents?.length || 0})
                  </button>
                  <button
                    onClick={() => {
                      setDetailsTab('deposit');
                      loadDepositTransactions(selectedTenancy.id);
                    }}
                    className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                      detailsTab === 'deposit'
                        ? 'border-sky-600 text-sky-600'
                        : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    Deposit
                  </button>
                </nav>
              </div>

              <div className="p-4">
                {detailsTab === 'cheques' && (
                  <div className="space-y-2">
                    {/* Add Payment button */}
                    <div className="flex justify-end mb-3">
                      <button
                        onClick={() => setShowAddPaymentModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-sky-600 text-white rounded hover:bg-sky-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Payment
                      </button>
                    </div>
                    {selectedTenancy.cheques?.map((cheque) => (
                      <div key={cheque.id} className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                        {editingChequeId === cheque.id ? (
                          <div className="space-y-3">
                            {/* Payment Method */}
                            <div>
                              <label className="block text-xs font-medium text-stone-500 mb-1">Payment Method</label>
                              <select
                                value={editChequeData.payment_method}
                                onChange={(e) => setEditChequeData({ ...editChequeData, payment_method: e.target.value as 'cheque' | 'bank_transfer' | 'cash' })}
                                className="w-full px-3 py-1.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                              >
                                <option value="cheque">Cheque</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cash">Cash</option>
                              </select>
                            </div>

                            {/* Cheque-specific fields */}
                            {editChequeData.payment_method === 'cheque' && (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-stone-500 mb-1">Cheque Number</label>
                                  <input
                                    type="text"
                                    value={editChequeData.cheque_number}
                                    onChange={(e) => setEditChequeData({ ...editChequeData, cheque_number: e.target.value })}
                                    className="w-full px-3 py-1.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-stone-500 mb-1">Bank Name</label>
                                  <input
                                    type="text"
                                    value={editChequeData.bank_name}
                                    onChange={(e) => setEditChequeData({ ...editChequeData, bank_name: e.target.value })}
                                    className="w-full px-3 py-1.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Bank Transfer-specific fields */}
                            {editChequeData.payment_method === 'bank_transfer' && (
                              <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1">Reference Number</label>
                                <input
                                  type="text"
                                  value={editChequeData.reference_number}
                                  onChange={(e) => setEditChequeData({ ...editChequeData, reference_number: e.target.value })}
                                  className="w-full px-3 py-1.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                  placeholder="Transaction reference"
                                />
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1">Due Date</label>
                                <input
                                  type="date"
                                  value={editChequeData.due_date}
                                  onChange={(e) => setEditChequeData({ ...editChequeData, due_date: e.target.value })}
                                  className="w-full px-3 py-1.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1">Amount (AED)</label>
                                <input
                                  type="number"
                                  value={editChequeData.amount}
                                  onChange={(e) => setEditChequeData({ ...editChequeData, amount: Number(e.target.value) })}
                                  className="w-full px-3 py-1.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={handleCancelEditCheque}
                                className="px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-200 rounded"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSaveCheque}
                                className="px-3 py-1.5 text-sm bg-sky-600 text-white rounded hover:bg-sky-700"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(cheque.status)}`}>
                                {cheque.status.charAt(0).toUpperCase() + cheque.status.slice(1)}
                              </span>
                              <PaymentMethodBadge method={cheque.payment_method} />
                              <div>
                                <p className="text-sm font-medium text-stone-800">
                                  {cheque.payment_method === 'cheque' && cheque.cheque_number && cheque.bank_name
                                    ? `${cheque.cheque_number} - ${cheque.bank_name}`
                                    : cheque.payment_method === 'bank_transfer' && cheque.reference_number
                                    ? `Ref: ${cheque.reference_number}`
                                    : 'Cash Payment'}
                                </p>
                                <p className="text-xs text-stone-500">Due: {formatDate(cheque.due_date)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="text-sm font-semibold text-stone-800 tabular-nums">AED {formatCurrency(cheque.amount)}</p>
                              <div className="flex gap-1">
                                {(cheque.status === 'pending' || cheque.status === 'deposited' || cheque.status === 'cleared') && (
                                  <button
                                    onClick={() => handleEditCheque(cheque)}
                                    className="px-2 py-1 text-xs bg-stone-200 text-stone-700 rounded hover:bg-stone-300"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                )}
                                {cheque.status === 'pending' && (
                                  <button
                                    onClick={() => handleDepositCheque(cheque.id)}
                                    className="px-2 py-1 text-xs bg-sky-100 text-sky-700 rounded hover:bg-sky-200"
                                  >
                                    Deposit
                                  </button>
                                )}
                                {cheque.status === 'deposited' && (
                                  <>
                                    <button
                                      onClick={() => handleClearCheque(cheque.id)}
                                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                    >
                                      Clear
                                    </button>
                                    <button
                                      onClick={() => handleBounceCheque(cheque.id)}
                                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                    >
                                      Bounce
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {detailsTab === 'documents' && (
                  <div className="space-y-4">
                    {/* Upload area */}
                    <div className="border-2 border-dashed border-stone-200 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <select
                          value={docType}
                          onChange={(e) => setDocType(e.target.value)}
                          className="px-3 py-1.5 text-sm border border-stone-300 rounded"
                        >
                          {DOCUMENT_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                        <label className="px-3 py-1.5 text-sm bg-sky-600 text-white rounded hover:bg-sky-700 cursor-pointer transition-colors">
                          {uploadingDoc ? 'Uploading...' : 'Upload Document'}
                          <input
                            type="file"
                            onChange={handleDocumentUpload}
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
                            disabled={uploadingDoc}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-stone-500">Supports PDF, JPG, PNG</p>
                    </div>

                    {/* Document list */}
                    <div className="space-y-2">
                      {selectedTenancy.documents?.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-stone-400" />
                            <div>
                              <p className="text-sm font-medium text-stone-800">{doc.filename}</p>
                              <p className="text-xs text-stone-500">
                                {DOCUMENT_TYPES.find((t) => t.value === doc.document_type)?.label} • {formatDate(doc.uploaded_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDownloadDocument(doc.id, doc.filename)}
                              className="px-2 py-1 text-xs bg-sky-100 text-sky-700 rounded hover:bg-sky-200"
                            >
                              Download
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detailsTab === 'deposit' && (
                  <div className="space-y-4">
                    {(() => {
                      const received = depositTransactions.filter(t => t.transaction_type === 'received').reduce((s, t) => s + Number(t.amount), 0);
                      const deductions = depositTransactions.filter(t => t.transaction_type === 'deduction').reduce((s, t) => s + Number(t.amount), 0);
                      const refunded = depositTransactions.filter(t => t.transaction_type === 'refund').reduce((s, t) => s + Number(t.amount), 0);
                      const balance = received - deductions - refunded;
                      const agreed = Number(selectedTenancy.security_deposit) || 0;
                      return (
                        <div className="grid grid-cols-5 gap-3">
                          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                            <p className="text-xs text-stone-500">Agreed</p>
                            <p className="text-sm font-semibold text-stone-800">AED {formatCurrency(agreed)}</p>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-xs text-green-700">Received</p>
                            <p className="text-sm font-semibold text-green-800">AED {formatCurrency(received)}</p>
                          </div>
                          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-xs text-red-700">Deductions</p>
                            <p className="text-sm font-semibold text-red-800">AED {formatCurrency(deductions)}</p>
                          </div>
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <p className="text-xs text-amber-700">Refunded</p>
                            <p className="text-sm font-semibold text-amber-800">AED {formatCurrency(refunded)}</p>
                          </div>
                          <div className="p-3 bg-sky-50 rounded-lg border border-sky-200">
                            <p className="text-xs text-sky-700">Balance Held</p>
                            <p className="text-sm font-semibold text-sky-800">AED {formatCurrency(balance)}</p>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex justify-end">
                      <button
                        onClick={() => setShowDepositModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-sky-600 text-white rounded hover:bg-sky-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Record Transaction
                      </button>
                    </div>

                    {loadingDeposits ? (
                      <p className="text-sm text-stone-500 text-center py-6">Loading...</p>
                    ) : depositTransactions.length === 0 ? (
                      <div className="text-center py-8 text-stone-500">
                        <Banknote className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                        <p className="text-sm">No deposit transactions recorded yet</p>
                        <p className="text-xs mt-1">Click "Record Transaction" to log a received amount, deduction, or refund</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {depositTransactions.map((t) => {
                          const typeConfig: Record<string, { label: string; color: string }> = {
                            received: { label: 'Received', color: 'bg-green-50 text-green-700 border-green-200' },
                            deduction: { label: 'Deduction', color: 'bg-red-50 text-red-700 border-red-200' },
                            refund: { label: 'Refund', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                          };
                          const cfg = typeConfig[t.transaction_type] || typeConfig.received;
                          return (
                            <div key={t.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200">
                              <div className="flex items-center gap-3">
                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${cfg.color}`}>
                                  {cfg.label}
                                </span>
                                <div>
                                  <p className="text-sm font-medium text-stone-800">AED {formatCurrency(Number(t.amount))}</p>
                                  <p className="text-xs text-stone-500">
                                    {formatDate(t.transaction_date)}
                                    {t.deduction_reason && ` • ${t.deduction_reason}`}
                                    {t.description && ` • ${t.description}`}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-stone-200 flex items-center justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Transaction Modal */}
      {showDepositModal && selectedTenancy && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30" onClick={() => setShowDepositModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                <h2 className="text-base font-semibold text-stone-900">Record Deposit Transaction</h2>
                <button onClick={() => setShowDepositModal(false)} className="p-1 text-stone-400 hover:text-stone-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Transaction Type</label>
                  <select
                    value={depositForm.transaction_type}
                    onChange={(e) => setDepositForm({ ...depositForm, transaction_type: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="received">Received (Tenant paid deposit)</option>
                    <option value="deduction">Deduction (Keep portion)</option>
                    <option value="refund">Refund (Return to tenant)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Amount (AED)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={depositForm.amount}
                      onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={depositForm.transaction_date}
                      onChange={(e) => setDepositForm({ ...depositForm, transaction_date: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {depositForm.transaction_type === 'deduction' && (
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Deduction Reason</label>
                    <select
                      value={depositForm.deduction_reason}
                      onChange={(e) => setDepositForm({ ...depositForm, deduction_reason: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="damages">Damages</option>
                      <option value="cleaning">Cleaning</option>
                      <option value="unpaid_rent">Unpaid Rent</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={depositForm.description}
                    onChange={(e) => setDepositForm({ ...depositForm, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="e.g., Bank transfer reference, damage details"
                  />
                </div>
              </div>

              <div className="px-4 py-3 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitDeposit}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded transition-colors"
                >
                  Save Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Renewal Modal */}
      {showRenewalModal && selectedTenancy && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30" onClick={() => setShowRenewalModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                <h2 className="text-base font-semibold text-stone-900">Renew Tenancy</h2>
                <button onClick={() => setShowRenewalModal(false)} className="p-1 text-stone-400 hover:text-stone-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <p className="text-sm text-stone-600">
                  Renewing tenancy for <strong>{selectedTenancy.tenant_name}</strong>
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">New Start Date</label>
                    <input
                      type="date"
                      value={renewalData.contract_start}
                      onChange={(e) => setRenewalData({ ...renewalData, contract_start: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">New End Date</label>
                    <input
                      type="date"
                      value={renewalData.contract_end}
                      onChange={(e) => setRenewalData({ ...renewalData, contract_end: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">New Annual Rent (AED)</label>
                  <input
                    type="number"
                    value={renewalData.annual_rent}
                    onChange={(e) => setRenewalData({ ...renewalData, annual_rent: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Auto-Generate Payments</label>
                  <select
                    value={renewalData.num_cheques}
                    onChange={(e) => setRenewalData({ ...renewalData, num_cheques: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value={0}>None - I'll add payments manually</option>
                    <option value={1}>1 Payment</option>
                    <option value={2}>2 Payments</option>
                    <option value={3}>3 Payments</option>
                    <option value={4}>4 Payments</option>
                    <option value={6}>6 Payments</option>
                    <option value={12}>12 Payments</option>
                  </select>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowRenewalModal(false)}
                  className="px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitRenewal}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
                >
                  Renew Tenancy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Modal */}
      {showTerminateModal && selectedTenancy && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30" onClick={() => setShowTerminateModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                <h2 className="text-base font-semibold text-red-700">Terminate Tenancy</h2>
                <button onClick={() => setShowTerminateModal(false)} className="p-1 text-stone-400 hover:text-stone-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                  <p className="text-sm text-red-700">
                    This will end the tenancy for <strong>{selectedTenancy.tenant_name}</strong> and unblock the calendar for short-term bookings.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Termination Date</label>
                  <input
                    type="date"
                    value={terminationData.termination_date}
                    onChange={(e) => setTerminationData({ ...terminationData, termination_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Reason</label>
                  <textarea
                    value={terminationData.termination_reason}
                    onChange={(e) => setTerminationData({ ...terminationData, termination_reason: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="Enter reason for termination..."
                  />
                </div>
              </div>

              <div className="px-4 py-3 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowTerminateModal(false)}
                  className="px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitTermination}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                >
                  Terminate Tenancy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedTenancy && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30" onClick={() => setShowDeleteConfirm(false)} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-stone-800">Delete Tenancy?</h3>
                  <p className="text-sm text-stone-600 mt-1">
                    This will permanently delete the tenancy for <strong>{selectedTenancy.tenant_name}</strong>, including all cheques and documents.
                  </p>
                  <p className="text-xs text-stone-500 mt-2">
                    Note: Tenancies with cleared cheques cannot be deleted.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddPaymentModal && selectedTenancy && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30" onClick={() => setShowAddPaymentModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="px-4 py-3 border-b border-stone-200">
                <h3 className="text-base font-semibold text-stone-800">Add Payment</h3>
                <p className="text-xs text-stone-500">Add a new payment to this tenancy</p>
              </div>

              <div className="p-4 space-y-4">
                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Payment Method *</label>
                  <select
                    value={newPaymentData.payment_method}
                    onChange={(e) => setNewPaymentData({ ...newPaymentData, payment_method: e.target.value as 'cheque' | 'bank_transfer' | 'cash' })}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>

                {/* Cheque-specific fields */}
                {newPaymentData.payment_method === 'cheque' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Cheque Number</label>
                      <input
                        type="text"
                        value={newPaymentData.cheque_number}
                        onChange={(e) => setNewPaymentData({ ...newPaymentData, cheque_number: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                        placeholder="e.g. 001234"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={newPaymentData.bank_name}
                        onChange={(e) => setNewPaymentData({ ...newPaymentData, bank_name: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                        placeholder="e.g. Emirates NBD"
                      />
                    </div>
                  </div>
                )}

                {/* Bank Transfer-specific fields */}
                {newPaymentData.payment_method === 'bank_transfer' && (
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Reference Number</label>
                    <input
                      type="text"
                      value={newPaymentData.reference_number}
                      onChange={(e) => setNewPaymentData({ ...newPaymentData, reference_number: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                      placeholder="Transaction reference"
                    />
                  </div>
                )}

                {/* Amount and Due Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Amount (AED) *</label>
                    <input
                      type="number"
                      value={newPaymentData.amount}
                      onChange={(e) => setNewPaymentData({ ...newPaymentData, amount: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Due Date *</label>
                    <input
                      type="date"
                      value={newPaymentData.due_date}
                      onChange={(e) => setNewPaymentData({ ...newPaymentData, due_date: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Status</label>
                  <select
                    value={newPaymentData.status}
                    onChange={(e) => setNewPaymentData({ ...newPaymentData, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="deposited">Deposited</option>
                    <option value="cleared">Cleared</option>
                  </select>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowAddPaymentModal(false)}
                  className="px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPayment}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded transition-colors"
                >
                  Add Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
