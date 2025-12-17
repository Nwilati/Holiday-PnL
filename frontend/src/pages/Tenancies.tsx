import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Building2,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
  RefreshCw,
  Ban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Upload,
  Eye,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api, {
  Tenancy,
  TenancyCheque,
  TenancyDocument,
  TenancyCreateInput,
} from '../api/client';

interface Property {
  id: string;
  name: string;
}

const CHEQUE_STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
  deposited: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Deposited' },
  cleared: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Cleared' },
  bounced: { bg: 'bg-red-100', text: 'text-red-700', label: 'Bounced' },
};

const TENANCY_STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Active' },
  expired: { bg: 'bg-stone-100', text: 'text-stone-700', label: 'Expired' },
  terminated: { bg: 'bg-red-100', text: 'text-red-700', label: 'Terminated' },
  renewed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Renewed' },
};

export default function Tenancies() {
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [propertyFilter, setPropertyFilter] = useState<string>('');
  const [expandedTenancy, setExpandedTenancy] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedTenancy, setSelectedTenancy] = useState<Tenancy | null>(null);

  // Form state
  const [formData, setFormData] = useState<TenancyCreateInput>({
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

  const [terminateData, setTerminateData] = useState({
    termination_date: '',
    termination_reason: '',
  });

  const [renewData, setRenewData] = useState({
    contract_start: '',
    contract_end: '',
    annual_rent: 0,
    contract_value: 0,
    security_deposit: 0,
    num_cheques: 1 as 1 | 2 | 4 | 6 | 12,
    ejari_number: '',
    notes: '',
    auto_split_cheques: true,
  });

  useEffect(() => {
    loadData();
  }, [statusFilter, propertyFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tenanciesRes, propertiesRes] = await Promise.all([
        api.getTenancies({
          status: statusFilter || undefined,
          property_id: propertyFilter || undefined,
        }),
        api.getProperties(),
      ]);
      setTenancies(tenanciesRes.data);
      setProperties(propertiesRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await api.createTenancy(formData);
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to create tenancy:', error);
      alert('Failed to create tenancy');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tenancy? This will also delete all associated cheques and documents.')) return;
    try {
      await api.deleteTenancy(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete tenancy:', error);
      alert('Failed to delete tenancy');
    }
  };

  const handleTerminate = async () => {
    if (!selectedTenancy) return;
    try {
      await api.terminateTenancy(selectedTenancy.id, terminateData);
      setShowTerminateModal(false);
      setSelectedTenancy(null);
      setTerminateData({ termination_date: '', termination_reason: '' });
      loadData();
    } catch (error) {
      console.error('Failed to terminate tenancy:', error);
      alert('Failed to terminate tenancy');
    }
  };

  const handleRenew = async () => {
    if (!selectedTenancy) return;
    try {
      await api.renewTenancy(selectedTenancy.id, renewData);
      setShowRenewModal(false);
      setSelectedTenancy(null);
      loadData();
    } catch (error) {
      console.error('Failed to renew tenancy:', error);
      alert('Failed to renew tenancy');
    }
  };

  const handleChequeAction = async (tenancyId: string, chequeId: string, action: 'deposit' | 'clear' | 'bounce') => {
    try {
      if (action === 'deposit') {
        await api.depositCheque(tenancyId, chequeId);
      } else if (action === 'clear') {
        await api.clearCheque(tenancyId, chequeId);
      } else if (action === 'bounce') {
        const reason = prompt('Enter bounce reason:');
        if (reason) {
          await api.bounceCheque(tenancyId, chequeId, reason);
        }
      }
      loadData();
    } catch (error) {
      console.error(`Failed to ${action} cheque:`, error);
      alert(`Failed to ${action} cheque`);
    }
  };

  const resetForm = () => {
    setFormData({
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
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredTenancies = tenancies.filter((t) => {
    const matchesSearch =
      t.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tenant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.property_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (isLoading) {
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
        <Link
          to="/properties"
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium shadow-lg shadow-orange-200 hover:shadow-xl transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          Add Your First Property
        </Link>
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
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium shadow-lg shadow-orange-200 hover:shadow-xl transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          Add Tenancy
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="text"
              placeholder="Search tenants, properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          >
            <option value="">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="terminated">Terminated</option>
            <option value="renewed">Renewed</option>
          </select>
        </div>
      </div>

      {/* Tenancies List */}
      {filteredTenancies.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-stone-100 text-center">
          <FileText className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-stone-800 mb-2">No Tenancies Found</h3>
          <p className="text-stone-500">Add your first tenancy to start tracking rental contracts.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTenancies.map((tenancy) => (
            <TenancyCard
              key={tenancy.id}
              tenancy={tenancy}
              isExpanded={expandedTenancy === tenancy.id}
              onToggle={() => setExpandedTenancy(expandedTenancy === tenancy.id ? null : tenancy.id)}
              onDelete={() => handleDelete(tenancy.id)}
              onTerminate={() => {
                setSelectedTenancy(tenancy);
                setShowTerminateModal(true);
              }}
              onRenew={() => {
                setSelectedTenancy(tenancy);
                setRenewData({
                  contract_start: tenancy.contract_end,
                  contract_end: '',
                  annual_rent: tenancy.annual_rent,
                  contract_value: tenancy.contract_value,
                  security_deposit: tenancy.security_deposit,
                  num_cheques: tenancy.num_cheques,
                  ejari_number: '',
                  notes: '',
                  auto_split_cheques: true,
                });
                setShowRenewModal(true);
              }}
              onChequeAction={handleChequeAction}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <Modal title="Add New Tenancy" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Property *</label>
              <select
                value={formData.property_id}
                onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                required
              >
                <option value="">Select Property</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Tenant Name *</label>
                <input
                  type="text"
                  value={formData.tenant_name}
                  onChange={(e) => setFormData({ ...formData, tenant_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Tenant Email *</label>
                <input
                  type="email"
                  value={formData.tenant_email}
                  onChange={(e) => setFormData({ ...formData, tenant_email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Tenant Phone *</label>
              <input
                type="tel"
                value={formData.tenant_phone}
                onChange={(e) => setFormData({ ...formData, tenant_phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Contract Start *</label>
                <input
                  type="date"
                  value={formData.contract_start}
                  onChange={(e) => setFormData({ ...formData, contract_start: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Contract End *</label>
                <input
                  type="date"
                  value={formData.contract_end}
                  onChange={(e) => setFormData({ ...formData, contract_end: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Annual Rent (AED) *</label>
                <input
                  type="number"
                  value={formData.annual_rent || ''}
                  onChange={(e) => setFormData({ ...formData, annual_rent: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Contract Value (AED) *</label>
                <input
                  type="number"
                  value={formData.contract_value || ''}
                  onChange={(e) => setFormData({ ...formData, contract_value: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Security Deposit (AED)</label>
                <input
                  type="number"
                  value={formData.security_deposit || ''}
                  onChange={(e) => setFormData({ ...formData, security_deposit: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Number of Cheques *</label>
                <select
                  value={formData.num_cheques}
                  onChange={(e) => setFormData({ ...formData, num_cheques: Number(e.target.value) as 1 | 2 | 4 | 6 | 12 })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  required
                >
                  <option value={1}>1 Cheque (Annual)</option>
                  <option value={2}>2 Cheques (Semi-Annual)</option>
                  <option value={4}>4 Cheques (Quarterly)</option>
                  <option value={6}>6 Cheques (Bi-Monthly)</option>
                  <option value={12}>12 Cheques (Monthly)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Ejari Number</label>
              <input
                type="text"
                value={formData.ejari_number || ''}
                onChange={(e) => setFormData({ ...formData, ejari_number: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="auto_split"
                checked={formData.auto_split_cheques}
                onChange={(e) => setFormData({ ...formData, auto_split_cheques: e.target.checked })}
                className="w-4 h-4 text-orange-500 border-stone-300 rounded focus:ring-orange-500"
              />
              <label htmlFor="auto_split" className="text-sm text-stone-700">
                Auto-generate cheque schedule based on contract start date
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium shadow-lg shadow-orange-200 hover:shadow-xl transition-all duration-200"
              >
                Create Tenancy
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Terminate Modal */}
      {showTerminateModal && selectedTenancy && (
        <Modal title="Terminate Tenancy" onClose={() => setShowTerminateModal(false)}>
          <div className="space-y-4">
            <p className="text-stone-600">
              Are you sure you want to terminate the tenancy for <strong>{selectedTenancy.tenant_name}</strong>?
            </p>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Termination Date *</label>
              <input
                type="date"
                value={terminateData.termination_date}
                onChange={(e) => setTerminateData({ ...terminateData, termination_date: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Reason *</label>
              <textarea
                value={terminateData.termination_reason}
                onChange={(e) => setTerminateData({ ...terminateData, termination_reason: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                required
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowTerminateModal(false)}
                className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTerminate}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
              >
                Terminate
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Renew Modal */}
      {showRenewModal && selectedTenancy && (
        <Modal title="Renew Tenancy" onClose={() => setShowRenewModal(false)}>
          <div className="space-y-4">
            <p className="text-stone-600">
              Renewing tenancy for <strong>{selectedTenancy.tenant_name}</strong>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">New Contract Start *</label>
                <input
                  type="date"
                  value={renewData.contract_start}
                  onChange={(e) => setRenewData({ ...renewData, contract_start: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">New Contract End *</label>
                <input
                  type="date"
                  value={renewData.contract_end}
                  onChange={(e) => setRenewData({ ...renewData, contract_end: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Annual Rent (AED) *</label>
                <input
                  type="number"
                  value={renewData.annual_rent || ''}
                  onChange={(e) => setRenewData({ ...renewData, annual_rent: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Contract Value (AED) *</label>
                <input
                  type="number"
                  value={renewData.contract_value || ''}
                  onChange={(e) => setRenewData({ ...renewData, contract_value: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Security Deposit (AED)</label>
                <input
                  type="number"
                  value={renewData.security_deposit || ''}
                  onChange={(e) => setRenewData({ ...renewData, security_deposit: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Number of Cheques *</label>
                <select
                  value={renewData.num_cheques}
                  onChange={(e) => setRenewData({ ...renewData, num_cheques: Number(e.target.value) as 1 | 2 | 4 | 6 | 12 })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  required
                >
                  <option value={1}>1 Cheque</option>
                  <option value={2}>2 Cheques</option>
                  <option value={4}>4 Cheques</option>
                  <option value={6}>6 Cheques</option>
                  <option value={12}>12 Cheques</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowRenewModal(false)}
                className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRenew}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium shadow-lg shadow-orange-200 hover:shadow-xl transition-all duration-200"
              >
                Renew Tenancy
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Modal Component
interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-stone-100">
          <h2 className="text-xl font-bold text-stone-800">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// Tenancy Card Component
interface TenancyCardProps {
  tenancy: Tenancy;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onTerminate: () => void;
  onRenew: () => void;
  onChequeAction: (tenancyId: string, chequeId: string, action: 'deposit' | 'clear' | 'bounce') => void;
  formatCurrency: (value: number) => string;
  formatDate: (dateStr: string) => string;
}

function TenancyCard({
  tenancy,
  isExpanded,
  onToggle,
  onDelete,
  onTerminate,
  onRenew,
  onChequeAction,
  formatCurrency,
  formatDate,
}: TenancyCardProps) {
  const statusStyle = TENANCY_STATUS_COLORS[tenancy.status] || TENANCY_STATUS_COLORS.active;

  const clearedCheques = tenancy.cheques?.filter((c) => c.status === 'cleared').length || 0;
  const totalCheques = tenancy.cheques?.length || 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
      {/* Header */}
      <div
        className="p-6 cursor-pointer hover:bg-stone-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-bold text-stone-800 text-lg">{tenancy.tenant_name}</h3>
              <p className="text-stone-500 text-sm">{tenancy.property_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xl font-bold text-stone-800">{formatCurrency(tenancy.annual_rent)}</p>
              <p className="text-sm text-stone-500">per year</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.label}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-stone-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-stone-400" />
            )}
          </div>
        </div>

        {/* Quick Info */}
        <div className="flex items-center gap-6 mt-4 text-sm text-stone-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-stone-400" />
            <span>{formatDate(tenancy.contract_start)} - {formatDate(tenancy.contract_end)}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-stone-400" />
            <span>{clearedCheques}/{totalCheques} cheques cleared</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-stone-400" />
            <span>{tenancy.tenant_email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-stone-400" />
            <span>{tenancy.tenant_phone}</span>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-stone-100">
          {/* Contract Details */}
          <div className="p-6 bg-stone-50">
            <h4 className="font-semibold text-stone-800 mb-4">Contract Details</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-stone-500">Contract Value</p>
                <p className="font-semibold text-stone-800">{formatCurrency(tenancy.contract_value)}</p>
              </div>
              <div>
                <p className="text-sm text-stone-500">Security Deposit</p>
                <p className="font-semibold text-stone-800">{formatCurrency(tenancy.security_deposit)}</p>
              </div>
              <div>
                <p className="text-sm text-stone-500">Number of Cheques</p>
                <p className="font-semibold text-stone-800">{tenancy.num_cheques}</p>
              </div>
              <div>
                <p className="text-sm text-stone-500">Ejari Number</p>
                <p className="font-semibold text-stone-800">{tenancy.ejari_number || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Cheques */}
          {tenancy.cheques && tenancy.cheques.length > 0 && (
            <div className="p-6">
              <h4 className="font-semibold text-stone-800 mb-4">Cheque Schedule</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stone-100">
                      <th className="text-left py-3 px-4 text-sm font-medium text-stone-500">Cheque #</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-stone-500">Bank</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-stone-500">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-stone-500">Due Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-stone-500">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-stone-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenancy.cheques.map((cheque) => {
                      const chequeStatus = CHEQUE_STATUS_COLORS[cheque.status] || CHEQUE_STATUS_COLORS.pending;
                      return (
                        <tr key={cheque.id} className="border-b border-stone-50 hover:bg-stone-50">
                          <td className="py-3 px-4 font-medium text-stone-800">{cheque.cheque_number}</td>
                          <td className="py-3 px-4 text-stone-600">{cheque.bank_name}</td>
                          <td className="py-3 px-4 font-semibold text-stone-800">{formatCurrency(cheque.amount)}</td>
                          <td className="py-3 px-4 text-stone-600">{formatDate(cheque.due_date)}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${chequeStatus.bg} ${chequeStatus.text}`}>
                              {chequeStatus.label}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {cheque.status === 'pending' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onChequeAction(tenancy.id, cheque.id, 'deposit');
                                  }}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Mark as Deposited"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              )}
                              {cheque.status === 'deposited' && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onChequeAction(tenancy.id, cheque.id, 'clear');
                                    }}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                    title="Mark as Cleared"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onChequeAction(tenancy.id, cheque.id, 'bounce');
                                    }}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Mark as Bounced"
                                  >
                                    <AlertCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-6 bg-stone-50 border-t border-stone-100">
            <div className="flex items-center justify-end gap-3">
              {tenancy.status === 'active' && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTerminate();
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Ban className="w-4 h-4" />
                    Terminate
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRenew();
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Renew
                  </button>
                </>
              )}
              {(tenancy.status === 'active' || tenancy.status === 'expired') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRenew();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium shadow-lg shadow-orange-200 hover:shadow-xl transition-all duration-200"
                >
                  <RefreshCw className="w-4 h-4" />
                  Renew Contract
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
