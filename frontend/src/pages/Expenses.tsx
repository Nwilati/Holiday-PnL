import { useState, useEffect, useRef } from 'react';
import { Plus, Upload, FileText, Trash2, Download, X, Image, File } from 'lucide-react';
import DataTable from '../components/DataTable';
import { api } from '../api/client';

type Property = { id: string; name: string; };
type Category = { id: string; code: string; name: string; category_type: string; };
type Expense = {
  id: string;
  property_id: string;
  category_id: string;
  expense_date: string;
  vendor: string;
  description: string;
  amount: number;
  vat_amount: number;
  total_amount: number;
  payment_method: string;
  is_paid: boolean;
  receipt_filename?: string;
  receipt_url?: string;
};

type Receipt = {
  id: string;
  filename: string;
  content_type: string;
  file_size: number;
  created_at: string;
};

const API_BASE_URL = 'https://holiday-pnl-production.up.railway.app/api/v1';

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [filters, setFilters] = useState({
    property_id: '',
    category_id: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [expensesRes, propertiesRes, categoriesRes] = await Promise.all([
        api.getExpenses(),
        api.getProperties(),
        api.getCategories(),
      ]);
      setExpenses(expensesRes.data);
      setProperties(propertiesRes.data);
      setCategories(categoriesRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.total_amount || 0), 0);

  const columns = [
    {
      key: 'expense_date',
      header: 'Date',
      render: (expense: Expense) => formatDate(expense.expense_date),
    },
    {
      key: 'vendor',
      header: 'Vendor',
      render: (expense: Expense) => expense.vendor || 'N/A',
    },
    {
      key: 'category_id',
      header: 'Category',
      render: (expense: Expense) => getCategoryName(expense.category_id),
    },
    {
      key: 'description',
      header: 'Description',
      render: (expense: Expense) => (
        <span className="truncate max-w-xs block">{expense.description || '-'}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (expense: Expense) => formatCurrency(expense.amount),
    },
    {
      key: 'vat_amount',
      header: 'VAT',
      render: (expense: Expense) => formatCurrency(expense.vat_amount || 0),
    },
    {
      key: 'total_amount',
      header: 'Total',
      render: (expense: Expense) => (
        <span className="font-medium">{formatCurrency(expense.total_amount || 0)}</span>
      ),
    },
    {
      key: 'receipt',
      header: 'Receipt',
      render: (expense: Expense) => (
        expense.receipt_filename ? (
          <span className="inline-flex items-center text-green-600">
            <FileText className="w-4 h-4 mr-1" />
            Yes
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-500">
            {expenses.length} expenses • Total: {formatCurrency(totalExpenses)}
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedExpense(null);
            setShowForm(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-4">
          <select
            value={filters.property_id}
            onChange={(e) => setFilters({ ...filters, property_id: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Properties</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <select
            value={filters.category_id}
            onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.filter(c => c.category_type === 'operating_expense').map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm">
        <DataTable
          columns={columns}
          data={expenses}
          onRowClick={(expense) => {
            setSelectedExpense(expense);
            setShowForm(true);
          }}
        />
      </div>

      {/* Expense Form Modal */}
      {showForm && (
        <ExpenseForm
          expense={selectedExpense}
          properties={properties}
          categories={categories}
          onClose={() => setShowForm(false)}
          onSave={() => {
            setShowForm(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Expense Form Component
interface ExpenseFormProps {
  expense: Expense | null;
  properties: Property[];
  categories: Category[];
  onClose: () => void;
  onSave: () => void;
}

function ExpenseForm({ expense, properties, categories, onClose, onSave }: ExpenseFormProps) {
  const [formData, setFormData] = useState({
    property_id: expense?.property_id || properties[0]?.id || '',
    category_id: expense?.category_id || '',
    expense_date: expense?.expense_date || new Date().toISOString().split('T')[0],
    vendor: expense?.vendor || '',
    description: expense?.description || '',
    amount: expense?.amount || 0,
    vat_amount: expense?.vat_amount || 0,
    payment_method: expense?.payment_method || 'cash',
    is_paid: expense?.is_paid ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [existingReceipts, setExistingReceipts] = useState<Receipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const expenseCategories = categories.filter(c =>
    c.category_type === 'operating_expense' || c.category_type === 'capital'
  );

  // Load existing receipts when editing
  useEffect(() => {
    if (expense?.id) {
      loadReceipts();
    }
  }, [expense?.id]);

  const loadReceipts = async () => {
    if (!expense?.id) return;
    setLoadingReceipts(true);
    try {
      const response = await api.getReceipts(expense.id);
      setExistingReceipts(response.data);
    } catch (error) {
      console.error('Error loading receipts:', error);
    }
    setLoadingReceipts(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];

    for (const file of files) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum size is 5MB.`);
        continue;
      }
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert(`${file.name} is not a valid file type. Allowed: JPG, PNG, GIF, PDF`);
        continue;
      }
      validFiles.push(file);
    }

    // Check total count
    const totalCount = existingReceipts.length + pendingFiles.length + validFiles.length;
    if (totalCount > 10) {
      alert('Maximum 10 receipts per expense');
      return;
    }

    setPendingFiles([...pendingFiles, ...validFiles]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(pendingFiles.filter((_, i) => i !== index));
  };

  const deleteExistingReceipt = async (receiptId: string) => {
    if (!expense?.id) return;
    if (!confirm('Delete this receipt?')) return;

    try {
      await api.deleteReceipt(expense.id, receiptId);
      setExistingReceipts(existingReceipts.filter(r => r.id !== receiptId));
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert('Error deleting receipt');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (contentType: string) => {
    if (contentType === 'application/pdf') {
      return <File className="w-5 h-5 text-red-500" />;
    }
    return <Image className="w-5 h-5 text-blue-500" />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let expenseId = expense?.id;

      if (expense) {
        await api.updateExpense(expense.id, formData);
      } else {
        const response = await api.createExpense(formData);
        expenseId = response.data.id;
      }

      // Upload pending files
      if (pendingFiles.length > 0 && expenseId) {
        for (const file of pendingFiles) {
          await api.uploadReceipt(expenseId, file);
        }
      }

      onSave();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Error saving expense');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">{expense ? 'Edit Expense' : 'New Expense'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
            <select
              value={formData.property_id}
              onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="">Select category...</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
              <input
                type="text"
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., DEWA, Cleaner"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Brief description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (AED)</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VAT Amount (AED)</label>
              <input
                type="number"
                value={formData.vat_amount}
                onChange={(e) => setFormData({ ...formData, vat_amount: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="cash">Cash</option>
              <option value="credit_card">Credit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Receipt Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipts ({existingReceipts.length + pendingFiles.length}/10)
            </label>

            {/* Existing Receipts */}
            {loadingReceipts ? (
              <p className="text-sm text-gray-500">Loading receipts...</p>
            ) : (
              existingReceipts.length > 0 && (
                <div className="space-y-2 mb-3">
                  {existingReceipts.map((receipt) => (
                    <div key={receipt.id} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        {getFileIcon(receipt.content_type)}
                        <div>
                          <p className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                            {receipt.filename}
                          </p>
                          <p className="text-xs text-gray-500">{formatFileSize(receipt.file_size)}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <a
                          href={`${API_BASE_URL}/receipts/${expense?.id}/${receipt.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => deleteExistingReceipt(receipt.id)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Pending Files */}
            {pendingFiles.length > 0 && (
              <div className="space-y-2 mb-3">
                {pendingFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      {getFileIcon(file.type)}
                      <div>
                        <p className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)} • Pending upload</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePendingFile(index)}
                      className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {existingReceipts.length + pendingFiles.length < 10 && (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/gif,application/pdf"
                  multiple
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors w-full justify-center"
                >
                  <Upload className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="text-sm text-gray-600">Add Receipts</span>
                </button>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  JPG, PNG, GIF, or PDF • Max 5MB each • Up to 10 files
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_paid"
              checked={formData.is_paid}
              onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="is_paid" className="ml-2 text-sm text-gray-700">Paid</label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
