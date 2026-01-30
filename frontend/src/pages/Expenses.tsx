import { useState, useEffect, useRef } from 'react';
import { Plus, Upload, FileText, Trash2, Download, X, Image, File, Eye, Paperclip, Search, Check, Minus } from 'lucide-react';
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
  const [showReceiptViewer, setShowReceiptViewer] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [filters, setFilters] = useState({
    property_id: '',
    category_id: '',
    search: '',
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleDelete = async (expenseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingId) return; // Prevent multiple deletes
    if (!confirm('Are you sure you want to delete this expense?')) return;

    setDeletingId(expenseId);
    try {
      console.log('Deleting expense:', expenseId);
      await api.deleteExpense(expenseId);
      console.log('Expense deleted successfully');
      await loadData();
    } catch (error: any) {
      console.error('Failed to delete expense:', error);
      console.error('Error response:', error.response?.data);
      alert(`Failed to delete expense: ${error.response?.data?.detail || error.message || 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown';
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

  const handleViewReceipts = (expense: Expense, e: React.MouseEvent) => {
    e.stopPropagation();
    setViewingExpense(expense);
    setShowReceiptViewer(true);
  };

  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    if (filters.property_id && expense.property_id !== filters.property_id) return false;
    if (filters.category_id && expense.category_id !== filters.category_id) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const matchesVendor = expense.vendor?.toLowerCase().includes(search);
      const matchesDesc = expense.description?.toLowerCase().includes(search);
      if (!matchesVendor && !matchesDesc) return false;
    }
    return true;
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Expenses</h1>
          <p className="text-sm text-stone-500">
            {filteredExpenses.length} expenses · Total: AED {formatCurrency(totalExpenses)}
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedExpense(null);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-600 text-white text-sm font-medium rounded hover:bg-sky-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-3 py-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search vendor or description..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
        </div>
        <select
          value={filters.property_id}
          onChange={(e) => setFilters({ ...filters, property_id: e.target.value })}
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
          value={filters.category_id}
          onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
          className="text-sm border border-stone-300 rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">All Categories</option>
          {categories.filter(c => c.category_type === 'operating_expense').map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Date</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Vendor</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Category</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Description</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">Amount</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">VAT</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">Total</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-stone-500 uppercase tracking-wide">Receipt</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-stone-500 uppercase tracking-wide">Paid</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredExpenses.map((expense) => (
              <tr
                key={expense.id}
                className="hover:bg-stone-50 cursor-pointer"
                onClick={() => {
                  setSelectedExpense(expense);
                  setShowForm(true);
                }}
              >
                <td className="px-4 py-2.5 text-sm text-stone-600 tabular-nums">{formatDate(expense.expense_date)}</td>
                <td className="px-4 py-2.5 text-sm font-medium text-stone-900">{expense.vendor || 'N/A'}</td>
                <td className="px-4 py-2.5 text-sm text-stone-600">{getCategoryName(expense.category_id)}</td>
                <td className="px-4 py-2.5 text-sm text-stone-600 max-w-xs truncate">{expense.description || '-'}</td>
                <td className="px-4 py-2.5 text-sm text-stone-600 text-right tabular-nums">AED {formatCurrency(expense.amount)}</td>
                <td className="px-4 py-2.5 text-sm text-stone-600 text-right tabular-nums">AED {formatCurrency(expense.vat_amount || 0)}</td>
                <td className="px-4 py-2.5 text-sm font-medium text-stone-900 text-right tabular-nums">AED {formatCurrency(expense.total_amount || 0)}</td>
                <td className="px-4 py-2.5 text-center">
                  {expense.receipt_filename ? (
                    <button
                      onClick={(e) => handleViewReceipts(expense, e)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-medium hover:bg-green-100 transition-colors"
                    >
                      <Paperclip className="w-3 h-3" />
                      View
                    </button>
                  ) : (
                    <Minus className="w-4 h-4 text-stone-300 mx-auto" />
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {expense.is_paid ? (
                    <Check className="w-4 h-4 text-green-600 mx-auto" />
                  ) : (
                    <Minus className="w-4 h-4 text-stone-300 mx-auto" />
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={(e) => handleDelete(expense.id, e)}
                    disabled={deletingId === expense.id}
                    className={`p-1 text-stone-400 hover:text-red-600 transition-colors ${deletingId === expense.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {deletingId === expense.id ? (
                      <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
            {filteredExpenses.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-stone-500">
                  No expenses found
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

      {/* Receipt Viewer Modal */}
      {showReceiptViewer && viewingExpense && (
        <ReceiptViewer
          expense={viewingExpense}
          onClose={() => {
            setShowReceiptViewer(false);
            setViewingExpense(null);
          }}
        />
      )}
    </div>
  );
}

// Receipt Viewer Component
interface ReceiptViewerProps {
  expense: Expense;
  onClose: () => void;
}

function ReceiptViewer({ expense, onClose }: ReceiptViewerProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    loadReceipts();
  }, [expense.id]);

  const loadReceipts = async () => {
    try {
      const response = await api.getReceipts(expense.id);
      setReceipts(response.data);
      if (response.data.length > 0) {
        setSelectedReceipt(response.data[0]);
      }
    } catch (error) {
      console.error('Error loading receipts:', error);
    }
    setLoading(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getReceiptUrl = (receipt: Receipt) => {
    return `${API_BASE_URL}/receipts/${expense.id}/${receipt.id}/download`;
  };

  const isImage = (contentType: string) => {
    return contentType.startsWith('image/');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/30" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-stone-200 flex justify-between items-center">
            <div>
              <h2 className="text-base font-semibold text-stone-900">Receipts</h2>
              <p className="text-sm text-stone-500">
                {expense.vendor} · {expense.description || 'No description'}
              </p>
            </div>
            <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600">
              <X className="w-4 h-4" />
            </button>
          </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
          </div>
        ) : receipts.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-stone-500">
            No receipts attached
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Thumbnail Sidebar */}
            <div className="w-48 border-r border-stone-200 bg-stone-50 overflow-y-auto p-2 space-y-2">
              {receipts.map((receipt) => (
                <button
                  key={receipt.id}
                  onClick={() => setSelectedReceipt(receipt)}
                  className={`w-full p-2 rounded text-left transition-colors ${
                    selectedReceipt?.id === receipt.id
                      ? 'bg-sky-100 border border-sky-500'
                      : 'bg-white border border-stone-200 hover:border-sky-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isImage(receipt.content_type) ? (
                      <Image className="w-6 h-6 text-sky-500 flex-shrink-0" />
                    ) : (
                      <FileText className="w-6 h-6 text-red-500 flex-shrink-0" />
                    )}
                    <div className="overflow-hidden">
                      <p className="text-xs font-medium truncate text-stone-700">{receipt.filename}</p>
                      <p className="text-xs text-stone-500">{formatFileSize(receipt.file_size)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Preview Area */}
            <div className="flex-1 flex flex-col">
              {selectedReceipt && (
                <>
                  <div className="flex-1 overflow-auto bg-stone-100 flex items-center justify-center p-4">
                    {isImage(selectedReceipt.content_type) ? (
                      <img
                        src={getReceiptUrl(selectedReceipt)}
                        alt={selectedReceipt.filename}
                        className="max-w-full max-h-full object-contain shadow-lg rounded"
                      />
                    ) : (
                      <div className="text-center">
                        <FileText className="w-24 h-24 text-red-400 mx-auto mb-4" />
                        <p className="text-stone-600 mb-4">PDF Preview not available</p>
                        <a
                          href={getReceiptUrl(selectedReceipt)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white text-sm rounded hover:bg-sky-700 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Open PDF
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="px-4 py-3 border-t border-stone-200 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-stone-700">{selectedReceipt.filename}</p>
                      <p className="text-xs text-stone-500">
                        {formatFileSize(selectedReceipt.file_size)} · {selectedReceipt.content_type}
                      </p>
                    </div>
                    <a
                      href={getReceiptUrl(selectedReceipt)}
                      download={selectedReceipt.filename}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
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
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum size is 5MB.`);
        continue;
      }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert(`${file.name} is not a valid file type. Allowed: JPG, PNG, GIF, PDF`);
        continue;
      }
      validFiles.push(file);
    }

    const totalCount = existingReceipts.length + pendingFiles.length + validFiles.length;
    if (totalCount > 10) {
      alert('Maximum 10 receipts per expense');
      return;
    }

    setPendingFiles([...pendingFiles, ...validFiles]);

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
    return <Image className="w-5 h-5 text-sky-500" />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return; // Prevent double submission

    setSaving(true);
    try {
      let expenseId = expense?.id;

      // Prepare the data to submit
      const dataToSubmit = {
        property_id: formData.property_id,
        category_id: formData.category_id,
        expense_date: formData.expense_date,
        vendor: formData.vendor,
        description: formData.description,
        amount: Number(formData.amount) || 0,
        vat_amount: Number(formData.vat_amount) || 0,
        payment_method: formData.payment_method,
        is_paid: formData.is_paid,
      };

      console.log('Submitting expense:', expense ? 'UPDATE' : 'CREATE', expenseId, dataToSubmit);

      if (expense) {
        // Update existing expense
        const response = await api.updateExpense(expense.id, dataToSubmit);
        console.log('Update response:', response);
      } else {
        // Create new expense
        const response = await api.createExpense(dataToSubmit);
        console.log('Create response:', response);
        expenseId = response.data.id;
      }

      // Upload any pending receipts
      if (pendingFiles.length > 0 && expenseId) {
        for (const file of pendingFiles) {
          await api.uploadReceipt(expenseId, file);
        }
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving expense:', error);
      console.error('Error response:', error.response?.data);
      alert(`Error saving expense: ${error.response?.data?.detail || error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/30" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="px-4 py-3 border-b border-stone-200 flex justify-between items-center">
            <h2 className="text-base font-semibold text-stone-900">{expense ? 'Edit Expense' : 'New Expense'}</h2>
            <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Property</label>
            <select
              value={formData.property_id}
              onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
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
              <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
              <input
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Vendor</label>
              <input
                type="text"
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="e.g., DEWA, Cleaner"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Brief description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Amount (AED)</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">VAT Amount (AED)</label>
              <input
                type="number"
                value={formData.vat_amount}
                onChange={(e) => setFormData({ ...formData, vat_amount: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Payment Method</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="cash">Cash</option>
              <option value="credit_card">Credit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Receipt Upload Section */}
          <div className="border border-stone-200 rounded-lg p-4 bg-stone-50">
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Receipts ({existingReceipts.length + pendingFiles.length}/10)
            </label>

            {/* Existing Receipts */}
            {loadingReceipts ? (
              <p className="text-sm text-stone-500">Loading receipts...</p>
            ) : (
              existingReceipts.length > 0 && (
                <div className="space-y-2 mb-3">
                  {existingReceipts.map((receipt) => (
                    <div key={receipt.id} className="flex items-center justify-between p-2 bg-white border border-green-200 rounded">
                      <div className="flex items-center gap-2">
                        {getFileIcon(receipt.content_type)}
                        <div>
                          <p className="text-sm font-medium text-stone-700 truncate max-w-[180px]">
                            {receipt.filename}
                          </p>
                          <p className="text-xs text-stone-500">{formatFileSize(receipt.file_size)}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <a
                          href={`${API_BASE_URL}/receipts/${expense?.id}/${receipt.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-sky-600 hover:bg-sky-100 rounded"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
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
                  <div key={index} className="flex items-center justify-between p-2 bg-sky-50 border border-sky-200 rounded">
                    <div className="flex items-center gap-2">
                      {getFileIcon(file.type)}
                      <div>
                        <p className="text-sm font-medium text-stone-700 truncate max-w-[180px]">
                          {file.name}
                        </p>
                        <p className="text-xs text-sky-600">{formatFileSize(file.size)} · Will upload on save</p>
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
                  className="flex items-center px-4 py-2 border-2 border-dashed border-stone-300 rounded hover:border-sky-400 hover:bg-white transition-colors w-full justify-center"
                >
                  <Upload className="w-4 h-4 mr-2 text-stone-500" />
                  <span className="text-sm text-stone-600">Add Receipts</span>
                </button>
                <p className="text-xs text-stone-500 mt-1 text-center">
                  JPG, PNG, GIF, or PDF · Max 5MB each
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
              className="w-4 h-4 text-sky-600 rounded border-stone-300 focus:ring-sky-500"
            />
            <label htmlFor="is_paid" className="ml-2 text-sm text-stone-700">Paid</label>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-stone-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={`px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded transition-colors ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-3 py-1.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded transition-colors ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {saving ? 'Saving...' : (expense ? 'Update Expense' : 'Save Expense')}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
