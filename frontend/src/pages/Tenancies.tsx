import { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  RefreshCw,
  XCircle,
  FileText,
  X,
  AlertTriangle,
  Banknote,
} from 'lucide-react';
import { api } from '../api/client';

interface Property {
  id: string;
  name: string;
}

interface Cheque {
  id: string;
  tenancy_id: string;
  cheque_number: string;
  bank_name: string;
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
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-stone-100 text-stone-600',
  terminated: 'bg-red-100 text-red-700',
  renewed: 'bg-blue-100 text-blue-700',
};

const CHEQUE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  deposited: 'bg-blue-100 text-blue-700',
  cleared: 'bg-emerald-100 text-emerald-700',
  bounced: 'bg-red-100 text-red-700',
};

const DOCUMENT_TYPES = [
  { value: 'contract', label: 'Contract' },
  { value: 'emirates_id', label: 'Emirates ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'trade_license', label: 'Trade License' },
  { value: 'other', label: 'Other' },
];

export default function Tenancies() {
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
  const [detailsTab, setDetailsTab] = useState<'cheques' | 'documents'>('cheques');

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
    contract_value: 0,
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

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      loadTenancies();
    }
  }, [selectedProperty, statusFilter]);

  const loadProperties = async () => {
    try {
      const response = await api.getProperties();
      setProperties(response.data);
      if (response.data.length > 0) {
        setSelectedProperty(response.data[0].id);
      } else {
        setIsLoading(false);
      }
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
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredTenancies = tenancies.filter((t) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.tenant_name.toLowerCase().includes(query) ||
      t.tenant_email.toLowerCase().includes(query) ||
      (t.ejari_number && t.ejari_number.toLowerCase().includes(query))
    );
  });

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

  const handleEditTenancy = (tenancy: Tenancy) => {
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

  const handleSubmitForm = async () => {
    try {
      const payload = {
        ...formData,
        annual_rent: Number(formData.annual_rent),
        contract_value: Number(formData.contract_value),
        security_deposit: Number(formData.security_deposit),
        num_cheques: Number(formData.num_cheques) as 1 | 2 | 4 | 6 | 12,
      };

      if (selectedTenancy) {
        await api.updateTenancy(selectedTenancy.id, payload as any);
      } else {
        await api.createTenancy(payload as any);
      }

      setShowFormModal(false);
      loadTenancies();
    } catch (error) {
      console.error('Failed to save tenancy:', error);
      alert('Failed to save tenancy. Please try again.');
    }
  };

  const handleRenew = (tenancy: Tenancy) => {
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
      contract_value: tenancy.contract_value,
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
        contract_value: Number(renewalData.contract_value),
        num_cheques: Number(renewalData.num_cheques) as 1 | 2 | 4 | 6 | 12,
      });
      setShowRenewalModal(false);
      loadTenancies();
    } catch (error) {
      console.error('Failed to renew tenancy:', error);
      alert('Failed to renew tenancy. Please try again.');
    }
  };

  const handleTerminate = (tenancy: Tenancy) => {
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

  const handleDelete = (tenancy: Tenancy) => {
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
    if (!selectedTenancy) return;
    try {
      await api.depositCheque(selectedTenancy.id, chequeId);
      const response = await api.getTenancy(selectedTenancy.id);
      setSelectedTenancy(response.data as any);
    } catch (error) {
      console.error('Failed to deposit cheque:', error);
    }
  };

  const handleClearCheque = async (chequeId: string) => {
    if (!selectedTenancy) return;
    try {
      await api.clearCheque(selectedTenancy.id, chequeId);
      const response = await api.getTenancy(selectedTenancy.id);
      setSelectedTenancy(response.data as any);
    } catch (error) {
      console.error('Failed to clear cheque:', error);
    }
  };

  const handleBounceCheque = async (chequeId: string) => {
    if (!selectedTenancy) return;
    const reason = prompt('Enter bounce reason:');
    if (!reason) return;

    try {
      await api.bounceCheque(selectedTenancy.id, chequeId, reason);
      const response = await api.getTenancy(selectedTenancy.id);
      setSelectedTenancy(response.data as any);
    } catch (error) {
      console.error('Failed to mark cheque as bounced:', error);
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
    if (!selectedTenancy) return;
    try {
      const response = await api.getTenancyDocument(selectedTenancy.id, docId);
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
    if (!selectedTenancy) return;
    if (!confirm('Delete this document?')) return;

    try {
      await api.deleteTenancyDocument(selectedTenancy.id, docId);
      const response = await api.getTenancy(selectedTenancy.id);
      setSelectedTenancy(response.data as any);
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  if (isLoading && properties.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
          <Building2 className="w-10 h-10 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-stone-800 mb-2">No Properties Yet</h2>
        <p className="text-stone-500 mb-6 text-center max-w-md">
          Add a property first to manage annual tenancies.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">Annual Tenancies</h1>
          <p className="text-stone-500 mt-1">Manage long-term rental contracts and cheques</p>
        </div>
        <button
          onClick={handleCreateTenancy}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium shadow-lg shadow-orange-200 hover:shadow-xl transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          New Tenancy
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Building2 className="w-5 h-5 text-stone-400" />
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="flex-1 bg-transparent font-medium text-stone-700 focus:outline-none"
            >
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 min-w-[150px]">
            <Filter className="w-5 h-5 text-stone-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-medium text-stone-700 focus:outline-none"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="terminated">Terminated</option>
              <option value="renewed">Renewed</option>
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-stone-50 rounded-lg px-3 py-2">
            <Search className="w-5 h-5 text-stone-400" />
            <input
              type="text"
              placeholder="Search tenant, email, Ejari..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent focus:outline-none text-stone-700"
            />
          </div>
        </div>
      </div>

      {/* Tenancy Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
        </div>
      ) : filteredTenancies.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-stone-100 text-center">
          <Banknote className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-stone-700 mb-2">No Tenancies Found</h3>
          <p className="text-stone-500">Create your first annual tenancy to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTenancies.map((tenancy) => (
            <div
              key={tenancy.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-stone-800">{tenancy.tenant_name}</h3>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[tenancy.status]}`}>
                      {tenancy.status.charAt(0).toUpperCase() + tenancy.status.slice(1)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-stone-500">Contract Period</p>
                      <p className="font-medium text-stone-700">
                        {formatDate(tenancy.contract_start)} - {formatDate(tenancy.contract_end)}
                      </p>
                    </div>
                    <div>
                      <p className="text-stone-500">Annual Rent</p>
                      <p className="font-medium text-stone-700">{formatCurrency(tenancy.annual_rent)}</p>
                    </div>
                    <div>
                      <p className="text-stone-500">Cheques</p>
                      <p className="font-medium text-stone-700">{tenancy.num_cheques} payments</p>
                    </div>
                    {tenancy.ejari_number && (
                      <div>
                        <p className="text-stone-500">Ejari</p>
                        <p className="font-medium text-stone-700">{tenancy.ejari_number}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewDetails(tenancy)}
                    className="p-2 text-stone-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <FileText className="w-5 h-5" />
                  </button>

                  {tenancy.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleEditTenancy(tenancy)}
                        className="p-2 text-stone-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleRenew(tenancy)}
                        className="p-2 text-stone-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Renew"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleTerminate(tenancy)}
                        className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Terminate"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleDelete(tenancy)}
                    className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-stone-800">
                  {selectedTenancy ? 'Edit Tenancy' : 'New Tenancy'}
                </h2>
                <button
                  onClick={() => setShowFormModal(false)}
                  className="p-2 hover:bg-stone-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Tenant Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-stone-700 mb-1">Tenant Name *</label>
                  <input
                    type="text"
                    value={formData.tenant_name}
                    onChange={(e) => setFormData({ ...formData, tenant_name: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={formData.tenant_email}
                    onChange={(e) => setFormData({ ...formData, tenant_email: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={formData.tenant_phone}
                    onChange={(e) => setFormData({ ...formData, tenant_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Contract End *</label>
                  <input
                    type="date"
                    value={formData.contract_end}
                    onChange={(e) => setFormData({ ...formData, contract_end: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Security Deposit (AED)</label>
                  <input
                    type="number"
                    value={formData.security_deposit}
                    onChange={(e) => setFormData({ ...formData, security_deposit: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Number of Cheques *</label>
                  <select
                    value={formData.num_cheques}
                    onChange={(e) => setFormData({ ...formData, num_cheques: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value={1}>1 Cheque</option>
                    <option value={2}>2 Cheques</option>
                    <option value={4}>4 Cheques</option>
                    <option value={6}>6 Cheques</option>
                    <option value={12}>12 Cheques</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Ejari Number</label>
                  <input
                    type="text"
                    value={formData.ejari_number}
                    onChange={(e) => setFormData({ ...formData, ejari_number: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Optional"
                  />
                </div>
              </div>

              {!selectedTenancy && formData.num_cheques > 1 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Auto-split enabled:</strong> {formData.num_cheques} cheques of{' '}
                    {formatCurrency(formData.annual_rent / formData.num_cheques)} each will be created automatically.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-stone-100 flex justify-end gap-3">
              <button
                onClick={() => setShowFormModal(false)}
                className="px-4 py-2 text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitForm}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                {selectedTenancy ? 'Update' : 'Create'} Tenancy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedTenancy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-stone-800">{selectedTenancy.tenant_name}</h2>
                  <p className="text-stone-500">{selectedTenancy.tenant_email} • {selectedTenancy.tenant_phone}</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-stone-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-stone-100">
              <div className="flex">
                <button
                  onClick={() => setDetailsTab('cheques')}
                  className={`px-6 py-3 font-medium transition-colors ${
                    detailsTab === 'cheques'
                      ? 'text-orange-600 border-b-2 border-orange-500'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  Cheques ({selectedTenancy.cheques?.length || 0})
                </button>
                <button
                  onClick={() => setDetailsTab('documents')}
                  className={`px-6 py-3 font-medium transition-colors ${
                    detailsTab === 'documents'
                      ? 'text-orange-600 border-b-2 border-orange-500'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  Documents ({selectedTenancy.documents?.length || 0})
                </button>
              </div>
            </div>

            <div className="p-6">
              {detailsTab === 'cheques' && (
                <div className="space-y-3">
                  {selectedTenancy.cheques?.map((cheque) => (
                    <div
                      key={cheque.id}
                      className="flex items-center justify-between p-4 bg-stone-50 rounded-xl"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${CHEQUE_STATUS_COLORS[cheque.status]}`}>
                          {cheque.status.charAt(0).toUpperCase() + cheque.status.slice(1)}
                        </div>
                        <div>
                          <p className="font-medium text-stone-800">
                            {cheque.cheque_number} - {cheque.bank_name}
                          </p>
                          <p className="text-sm text-stone-500">
                            Due: {formatDate(cheque.due_date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-bold text-stone-800">{formatCurrency(cheque.amount)}</p>
                        <div className="flex gap-1">
                          {cheque.status === 'pending' && (
                            <button
                              onClick={() => handleDepositCheque(cheque.id)}
                              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                            >
                              Deposit
                            </button>
                          )}
                          {cheque.status === 'deposited' && (
                            <>
                              <button
                                onClick={() => handleClearCheque(cheque.id)}
                                className="px-3 py-1 text-sm bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
                              >
                                Clear
                              </button>
                              <button
                                onClick={() => handleBounceCheque(cheque.id)}
                                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                              >
                                Bounce
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {detailsTab === 'documents' && (
                <div className="space-y-4">
                  {/* Upload area */}
                  <div className="border-2 border-dashed border-stone-200 rounded-xl p-6 text-center">
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="px-3 py-2 border border-stone-200 rounded-lg"
                      >
                        {DOCUMENT_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <label className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 cursor-pointer transition-colors">
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
                    <p className="text-sm text-stone-500">Supports PDF, JPG, PNG</p>
                  </div>

                  {/* Document list */}
                  <div className="space-y-2">
                    {selectedTenancy.documents?.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 bg-stone-50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-stone-400" />
                          <div>
                            <p className="font-medium text-stone-800">{doc.filename}</p>
                            <p className="text-sm text-stone-500">
                              {DOCUMENT_TYPES.find((t) => t.value === doc.document_type)?.label} •{' '}
                              {formatDate(doc.uploaded_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDownloadDocument(doc.id, doc.filename)}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                          >
                            Download
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Renewal Modal */}
      {showRenewalModal && selectedTenancy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-stone-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-stone-800">Renew Tenancy</h2>
                <button
                  onClick={() => setShowRenewalModal(false)}
                  className="p-2 hover:bg-stone-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-stone-600">
                Renewing tenancy for <strong>{selectedTenancy.tenant_name}</strong>
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">New Start Date</label>
                  <input
                    type="date"
                    value={renewalData.contract_start}
                    onChange={(e) => setRenewalData({ ...renewalData, contract_start: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">New End Date</label>
                  <input
                    type="date"
                    value={renewalData.contract_end}
                    onChange={(e) => setRenewalData({ ...renewalData, contract_end: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Annual Rent (AED)</label>
                  <input
                    type="number"
                    value={renewalData.annual_rent}
                    onChange={(e) => setRenewalData({ ...renewalData, annual_rent: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Contract Value (AED)</label>
                  <input
                    type="number"
                    value={renewalData.contract_value}
                    onChange={(e) => setRenewalData({ ...renewalData, contract_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Number of Cheques</label>
                <select
                  value={renewalData.num_cheques}
                  onChange={(e) => setRenewalData({ ...renewalData, num_cheques: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg"
                >
                  <option value={1}>1 Cheque</option>
                  <option value={2}>2 Cheques</option>
                  <option value={4}>4 Cheques</option>
                  <option value={6}>6 Cheques</option>
                  <option value={12}>12 Cheques</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-stone-100 flex justify-end gap-3">
              <button
                onClick={() => setShowRenewalModal(false)}
                className="px-4 py-2 text-stone-700 hover:bg-stone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRenewal}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
              >
                Renew Tenancy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Modal */}
      {showTerminateModal && selectedTenancy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-stone-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-red-600">Terminate Tenancy</h2>
                <button
                  onClick={() => setShowTerminateModal(false)}
                  className="p-2 hover:bg-stone-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
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
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Reason</label>
                <textarea
                  value={terminationData.termination_reason}
                  onChange={(e) => setTerminationData({ ...terminationData, termination_reason: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg"
                  placeholder="Enter reason for termination..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-stone-100 flex justify-end gap-3">
              <button
                onClick={() => setShowTerminateModal(false)}
                className="px-4 py-2 text-stone-700 hover:bg-stone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitTermination}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Terminate Tenancy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedTenancy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-800">Delete Tenancy?</h3>
                <p className="text-stone-600 mt-1">
                  This will permanently delete the tenancy for <strong>{selectedTenancy.tenant_name}</strong>, including all cheques and documents.
                </p>
                <p className="text-sm text-stone-500 mt-2">
                  Note: Tenancies with cleared cheques cannot be deleted.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-stone-700 hover:bg-stone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
