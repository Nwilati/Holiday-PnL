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
  Upload,
  X,
  AlertTriangle,
  Banknote,
  Eye,
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
  cheques: Cheque[];
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

export default function Tenancies() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showRenewal, setShowRenewal] = useState(false);
  const [showTermination, setShowTermination] = useState(false);
  const [selectedTenancy, setSelectedTenancy] = useState<Tenancy | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    property_id: '',
    tenant_name: '',
    tenant_email: '',
    tenant_phone: '',
    contract_start: '',
    contract_end: '',
    annual_rent: '',
    contract_value: '',
    security_deposit: '0',
    num_cheques: '1',
    ejari_number: '',
    notes: '',
    auto_split_cheques: true,
  });

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
      const res = await api.getProperties();
      setProperties(res.data);
      if (res.data.length > 0) {
        setSelectedProperty(res.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load properties:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTenancies = async () => {
    setIsLoading(true);
    try {
      const params: any = { property_id: selectedProperty };
      if (statusFilter) params.status = statusFilter;
      const res = await api.getTenancies(params);
      setTenancies(res.data);
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
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredTenancies = tenancies.filter((t) =>
    t.tenant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.tenant_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.ejari_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNew = () => {
    setFormData({
      property_id: selectedProperty,
      tenant_name: '',
      tenant_email: '',
      tenant_phone: '',
      contract_start: '',
      contract_end: '',
      annual_rent: '',
      contract_value: '',
      security_deposit: '0',
      num_cheques: '1',
      ejari_number: '',
      notes: '',
      auto_split_cheques: true,
    });
    setIsEditing(false);
    setShowForm(true);
  };

  const handleEdit = (tenancy: Tenancy) => {
    setFormData({
      property_id: tenancy.property_id,
      tenant_name: tenancy.tenant_name,
      tenant_email: tenancy.tenant_email,
      tenant_phone: tenancy.tenant_phone,
      contract_start: tenancy.contract_start,
      contract_end: tenancy.contract_end,
      annual_rent: tenancy.annual_rent.toString(),
      contract_value: tenancy.contract_value.toString(),
      security_deposit: tenancy.security_deposit.toString(),
      num_cheques: tenancy.num_cheques.toString(),
      ejari_number: tenancy.ejari_number || '',
      notes: tenancy.notes || '',
      auto_split_cheques: true,
    });
    setSelectedTenancy(tenancy);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleViewDetails = async (tenancy: Tenancy) => {
    try {
      const res = await api.getTenancy(tenancy.id);
      setSelectedTenancy(res.data);
      setShowDetails(true);
    } catch (error) {
      console.error('Failed to load tenancy details:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        annual_rent: parseFloat(formData.annual_rent),
        contract_value: parseFloat(formData.contract_value),
        security_deposit: parseFloat(formData.security_deposit),
        num_cheques: parseInt(formData.num_cheques),
      };

      if (isEditing && selectedTenancy) {
        await api.updateTenancy(selectedTenancy.id, data);
      } else {
        await api.createTenancy(data);
      }

      setShowForm(false);
      loadTenancies();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save tenancy');
    }
  };

  const handleDelete = async (tenancy: Tenancy) => {
    if (!confirm(`Are you sure you want to delete this tenancy for ${tenancy.tenant_name}?`)) {
      return;
    }
    try {
      await api.deleteTenancy(tenancy.id);
      loadTenancies();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete tenancy');
    }
  };

  const handleRenew = (tenancy: Tenancy) => {
    setSelectedTenancy(tenancy);
    setShowRenewal(true);
  };

  const handleTerminate = (tenancy: Tenancy) => {
    setSelectedTenancy(tenancy);
    setShowTermination(true);
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
        <Building2 className="w-16 h-16 text-stone-300 mb-4" />
        <h2 className="text-xl font-bold text-stone-800 mb-2">No Properties</h2>
        <p className="text-stone-500">Add a property first to manage tenancies.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">Annual Tenancies</h1>
          <p className="text-stone-500 mt-1">Manage long-term rental contracts and cheque payments</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium shadow-lg shadow-orange-200 hover:shadow-xl transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          New Tenancy
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-stone-50 rounded-xl px-4 py-2.5 flex-1 min-w-64">
            <Search className="w-5 h-5 text-stone-400" />
            <input
              type="text"
              placeholder="Search by tenant name, email, or Ejari..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent flex-1 focus:outline-none text-stone-700"
            />
          </div>

          <div className="flex items-center gap-2 bg-stone-50 rounded-xl px-4 py-2.5">
            <Building2 className="w-5 h-5 text-stone-400" />
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="bg-transparent font-medium text-stone-700 focus:outline-none"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-stone-50 rounded-xl px-4 py-2.5">
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
        </div>
      </div>

      {/* Tenancies List */}
      {filteredTenancies.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-stone-100">
          <FileText className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-stone-800 mb-2">No Tenancies Found</h3>
          <p className="text-stone-500 mb-6">Create your first annual tenancy contract.</p>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600"
          >
            <Plus className="w-5 h-5" />
            New Tenancy
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTenancies.map((tenancy) => (
            <TenancyCard
              key={tenancy.id}
              tenancy={tenancy}
              onView={() => handleViewDetails(tenancy)}
              onEdit={() => handleEdit(tenancy)}
              onDelete={() => handleDelete(tenancy)}
              onRenew={() => handleRenew(tenancy)}
              onTerminate={() => handleTerminate(tenancy)}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <TenancyFormModal
          formData={formData}
          setFormData={setFormData}
          isEditing={isEditing}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Details Modal */}
      {showDetails && selectedTenancy && (
        <TenancyDetailsModal
          tenancy={selectedTenancy}
          onClose={() => {
            setShowDetails(false);
            setSelectedTenancy(null);
          }}
          onRefresh={loadTenancies}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      )}

      {/* Renewal Modal */}
      {showRenewal && selectedTenancy && (
        <RenewalModal
          tenancy={selectedTenancy}
          onClose={() => {
            setShowRenewal(false);
            setSelectedTenancy(null);
          }}
          onSuccess={() => {
            setShowRenewal(false);
            setSelectedTenancy(null);
            loadTenancies();
          }}
        />
      )}

      {/* Termination Modal */}
      {showTermination && selectedTenancy && (
        <TerminationModal
          tenancy={selectedTenancy}
          onClose={() => {
            setShowTermination(false);
            setSelectedTenancy(null);
          }}
          onSuccess={() => {
            setShowTermination(false);
            setSelectedTenancy(null);
            loadTenancies();
          }}
        />
      )}
    </div>
  );
}


// Tenancy Card Component
interface TenancyCardProps {
  tenancy: Tenancy;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRenew: () => void;
  onTerminate: () => void;
  formatCurrency: (v: number) => string;
  formatDate: (d: string) => string;
}

function TenancyCard({
  tenancy,
  onView,
  onEdit,
  onDelete,
  onRenew,
  onTerminate,
  formatCurrency,
  formatDate,
}: TenancyCardProps) {
  const clearedCheques = tenancy.cheques?.filter(c => c.status === 'cleared').length || 0;
  const totalCheques = tenancy.cheques?.length || 0;
  const clearedAmount = tenancy.cheques?.filter(c => c.status === 'cleared').reduce((sum, c) => sum + c.amount, 0) || 0;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-lg font-bold text-stone-800">{tenancy.tenant_name}</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[tenancy.status]}`}>
              {tenancy.status.charAt(0).toUpperCase() + tenancy.status.slice(1)}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-stone-500">Contract Period</p>
              <p className="font-medium text-stone-800">
                {formatDate(tenancy.contract_start)} - {formatDate(tenancy.contract_end)}
              </p>
            </div>
            <div>
              <p className="text-stone-500">Annual Rent</p>
              <p className="font-medium text-stone-800">{formatCurrency(tenancy.annual_rent)}</p>
            </div>
            <div>
              <p className="text-stone-500">Cheques</p>
              <p className="font-medium text-stone-800">{clearedCheques} / {totalCheques} cleared</p>
            </div>
            <div>
              <p className="text-stone-500">Collected</p>
              <p className="font-medium text-emerald-600">{formatCurrency(clearedAmount)}</p>
            </div>
          </div>

          {tenancy.ejari_number && (
            <p className="text-sm text-stone-500 mt-3">
              Ejari: {tenancy.ejari_number}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onView}
            className="p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-lg"
            title="View Details"
          >
            <Eye className="w-5 h-5" />
          </button>

          {tenancy.status === 'active' && (
            <>
              <button
                onClick={onEdit}
                className="p-2 text-stone-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                title="Edit"
              >
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={onRenew}
                className="p-2 text-stone-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                title="Renew"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={onTerminate}
                className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                title="Terminate"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </>
          )}

          {clearedCheques === 0 && (
            <button
              onClick={onDelete}
              className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


// Tenancy Form Modal
interface TenancyFormModalProps {
  formData: any;
  setFormData: (data: any) => void;
  isEditing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

function TenancyFormModal({ formData, setFormData, isEditing, onSubmit, onClose }: TenancyFormModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-stone-800">
            {isEditing ? 'Edit Tenancy' : 'New Annual Tenancy'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-6">
          {/* Tenant Information */}
          <div>
            <h3 className="font-medium text-stone-800 mb-4">Tenant Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Tenant Name *</label>
                <input
                  type="text"
                  required
                  value={formData.tenant_name}
                  onChange={(e) => setFormData({ ...formData, tenant_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.tenant_email}
                  onChange={(e) => setFormData({ ...formData, tenant_email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-stone-600 mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.tenant_phone}
                  onChange={(e) => setFormData({ ...formData, tenant_phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Contract Details */}
          <div>
            <h3 className="font-medium text-stone-800 mb-4">Contract Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Contract Start *</label>
                <input
                  type="date"
                  required
                  value={formData.contract_start}
                  onChange={(e) => setFormData({ ...formData, contract_start: e.target.value })}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Contract End *</label>
                <input
                  type="date"
                  required
                  value={formData.contract_end}
                  onChange={(e) => setFormData({ ...formData, contract_end: e.target.value })}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Annual Rent (AED) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.annual_rent}
                  onChange={(e) => setFormData({ ...formData, annual_rent: e.target.value, contract_value: e.target.value })}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Security Deposit (AED)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.security_deposit}
                  onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Number of Cheques *</label>
                <select
                  required
                  value={formData.num_cheques}
                  onChange={(e) => setFormData({ ...formData, num_cheques: e.target.value })}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="1">1 Cheque</option>
                  <option value="2">2 Cheques</option>
                  <option value="4">4 Cheques</option>
                  <option value="6">6 Cheques</option>
                  <option value="12">12 Cheques</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Ejari Number</label>
                <input
                  type="text"
                  value={formData.ejari_number}
                  onChange={(e) => setFormData({ ...formData, ejari_number: e.target.value })}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Auto Split Info */}
          {!isEditing && (
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                <strong>Auto-split enabled:</strong> Cheques will be automatically created with equal amounts based on the number of cheques selected. Due dates will be spread across the contract period.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-stone-600 hover:bg-stone-100 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600"
            >
              {isEditing ? 'Save Changes' : 'Create Tenancy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// Tenancy Details Modal with Cheque Management
interface TenancyDetailsModalProps {
  tenancy: Tenancy;
  onClose: () => void;
  onRefresh: () => void;
  formatCurrency: (v: number) => string;
  formatDate: (d: string) => string;
}

function TenancyDetailsModal({ tenancy, onClose, onRefresh, formatCurrency, formatDate }: TenancyDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'cheques' | 'documents'>('cheques');
  const [cheques, setCheques] = useState(tenancy.cheques || []);

  const handleDeposit = async (chequeId: string) => {
    try {
      await api.depositCheque(tenancy.id, chequeId);
      const res = await api.getTenancyCheques(tenancy.id);
      setCheques(res.data);
      onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to deposit cheque');
    }
  };

  const handleClear = async (chequeId: string) => {
    try {
      await api.clearCheque(tenancy.id, chequeId);
      const res = await api.getTenancyCheques(tenancy.id);
      setCheques(res.data);
      onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to clear cheque');
    }
  };

  const handleBounce = async (chequeId: string) => {
    const reason = prompt('Enter bounce reason:');
    if (!reason) return;
    try {
      await api.bounceCheque(tenancy.id, chequeId, reason);
      const res = await api.getTenancyCheques(tenancy.id);
      setCheques(res.data);
      onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to mark cheque as bounced');
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        await api.uploadTenancyDocument(tenancy.id, {
          document_type: 'contract',
          filename: file.name,
          file_data: base64,
          file_size: file.size,
          mime_type: file.type,
        });
        alert('Document uploaded successfully');
      } catch (error: any) {
        alert(error.response?.data?.detail || 'Failed to upload document');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-800">{tenancy.tenant_name}</h2>
            <p className="text-sm text-stone-500">{tenancy.tenant_email} • {tenancy.tenant_phone}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[tenancy.status]}`}>
              {tenancy.status.charAt(0).toUpperCase() + tenancy.status.slice(1)}
            </span>
            <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contract Summary */}
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-stone-500">Contract Period</p>
              <p className="font-medium text-stone-800">
                {formatDate(tenancy.contract_start)} - {formatDate(tenancy.contract_end)}
              </p>
            </div>
            <div>
              <p className="text-stone-500">Annual Rent</p>
              <p className="font-medium text-stone-800">{formatCurrency(tenancy.annual_rent)}</p>
            </div>
            <div>
              <p className="text-stone-500">Security Deposit</p>
              <p className="font-medium text-stone-800">{formatCurrency(tenancy.security_deposit)}</p>
            </div>
            <div>
              <p className="text-stone-500">Ejari</p>
              <p className="font-medium text-stone-800">{tenancy.ejari_number || '-'}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-stone-100">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('cheques')}
              className={`pb-3 font-medium border-b-2 transition-colors ${
                activeTab === 'cheques'
                  ? 'text-orange-600 border-orange-500'
                  : 'text-stone-500 border-transparent hover:text-stone-700'
              }`}
            >
              <Banknote className="w-4 h-4 inline mr-2" />
              Cheques ({cheques.length})
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`pb-3 font-medium border-b-2 transition-colors ${
                activeTab === 'documents'
                  ? 'text-orange-600 border-orange-500'
                  : 'text-stone-500 border-transparent hover:text-stone-700'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Documents ({tenancy.documents?.length || 0})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'cheques' && (
            <div className="space-y-3">
              {cheques.map((cheque) => (
                <div
                  key={cheque.id}
                  className="flex items-center justify-between p-4 bg-stone-50 rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded-lg text-xs font-medium ${CHEQUE_STATUS_COLORS[cheque.status]}`}>
                      {cheque.status.charAt(0).toUpperCase() + cheque.status.slice(1)}
                    </div>
                    <div>
                      <p className="font-medium text-stone-800">{cheque.cheque_number}</p>
                      <p className="text-sm text-stone-500">{cheque.bank_name} • Due: {formatDate(cheque.due_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-bold text-stone-800">{formatCurrency(cheque.amount)}</p>
                    <div className="flex gap-2">
                      {cheque.status === 'pending' && (
                        <button
                          onClick={() => handleDeposit(cheque.id)}
                          className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                        >
                          Deposit
                        </button>
                      )}
                      {cheque.status === 'deposited' && (
                        <>
                          <button
                            onClick={() => handleClear(cheque.id)}
                            className="px-3 py-1.5 text-sm bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
                          >
                            Clear
                          </button>
                          <button
                            onClick={() => handleBounce(cheque.id)}
                            className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
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

          {activeTab === 'documents' && (
            <div>
              <div className="mb-4">
                <label className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-stone-300 rounded-xl cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
                  <Upload className="w-6 h-6 text-stone-400" />
                  <span className="text-stone-600">Click to upload document</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleDocumentUpload}
                  />
                </label>
              </div>

              {tenancy.documents && tenancy.documents.length > 0 ? (
                <div className="space-y-3">
                  {tenancy.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 bg-stone-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-stone-400" />
                        <div>
                          <p className="font-medium text-stone-800">{doc.filename}</p>
                          <p className="text-sm text-stone-500">
                            {doc.document_type} • {formatDate(doc.uploaded_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-stone-500 py-8">No documents uploaded yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// Renewal Modal
interface RenewalModalProps {
  tenancy: Tenancy;
  onClose: () => void;
  onSuccess: () => void;
}

function RenewalModal({ tenancy, onClose, onSuccess }: RenewalModalProps) {
  const [formData, setFormData] = useState({
    contract_start: tenancy.contract_end,
    contract_end: '',
    annual_rent: tenancy.annual_rent.toString(),
    contract_value: tenancy.contract_value.toString(),
    security_deposit: tenancy.security_deposit.toString(),
    num_cheques: tenancy.num_cheques.toString(),
    ejari_number: '',
    notes: '',
    auto_split_cheques: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.renewTenancy(tenancy.id, {
        ...formData,
        annual_rent: parseFloat(formData.annual_rent),
        contract_value: parseFloat(formData.contract_value),
        security_deposit: parseFloat(formData.security_deposit),
        num_cheques: parseInt(formData.num_cheques),
      });
      onSuccess();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to renew tenancy');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-stone-800">Renew Tenancy</h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-blue-800">
              Renewing tenancy for <strong>{tenancy.tenant_name}</strong>. Tenant information will be copied to the new contract.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">New Start Date *</label>
              <input
                type="date"
                required
                value={formData.contract_start}
                onChange={(e) => setFormData({ ...formData, contract_start: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">New End Date *</label>
              <input
                type="date"
                required
                value={formData.contract_end}
                onChange={(e) => setFormData({ ...formData, contract_end: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Annual Rent (AED) *</label>
              <input
                type="number"
                required
                min="0"
                value={formData.annual_rent}
                onChange={(e) => setFormData({ ...formData, annual_rent: e.target.value, contract_value: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Number of Cheques *</label>
              <select
                required
                value={formData.num_cheques}
                onChange={(e) => setFormData({ ...formData, num_cheques: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl"
              >
                <option value="1">1 Cheque</option>
                <option value="2">2 Cheques</option>
                <option value="4">4 Cheques</option>
                <option value="6">6 Cheques</option>
                <option value="12">12 Cheques</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-stone-600 hover:bg-stone-100 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600"
            >
              Renew Contract
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// Termination Modal
interface TerminationModalProps {
  tenancy: Tenancy;
  onClose: () => void;
  onSuccess: () => void;
}

function TerminationModal({ tenancy, onClose, onSuccess }: TerminationModalProps) {
  const [terminationDate, setTerminationDate] = useState(new Date().toISOString().split('T')[0]);
  const [terminationReason, setTerminationReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.terminateTenancy(tenancy.id, {
        termination_date: terminationDate,
        termination_reason: terminationReason,
      });
      onSuccess();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to terminate tenancy');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-stone-800">Terminate Tenancy</h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-red-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-red-800">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              This action cannot be undone. The tenancy for <strong>{tenancy.tenant_name}</strong> will be marked as terminated.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">Termination Date *</label>
            <input
              type="date"
              required
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">Reason *</label>
            <textarea
              required
              rows={3}
              value={terminationReason}
              onChange={(e) => setTerminationReason(e.target.value)}
              placeholder="Enter reason for termination..."
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-stone-600 hover:bg-stone-100 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600"
            >
              Terminate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
