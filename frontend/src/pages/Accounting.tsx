import { useState, useEffect } from 'react';
import {
  BookOpen, Search,
  FileText, CheckCircle, XCircle, RotateCcw, Eye
} from 'lucide-react';
import api from '../api/client';

interface Account {
  id: string;
  code: string;
  name: string;
  account_type: string;
  parent_code: string | null;
  is_system: boolean;
  is_active: boolean;
  description: string | null;
}

interface JournalLine {
  id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  debit: string;
  credit: string;
  description: string | null;
  property_id: string | null;
}

interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  source: string;
  description: string;
  memo: string | null;
  is_posted: boolean;
  is_locked: boolean;
  is_reversed: boolean;
  lines: JournalLine[];
  total_debit: string;
  total_credit: string;
}

interface TrialBalance {
  as_of_date: string;
  accounts: {
    account_code: string;
    account_name: string;
    account_type: string;
    debit_total: string;
    credit_total: string;
    balance: string;
  }[];
  total_debits: string;
  total_credits: string;
  is_balanced: boolean;
}

export default function Accounting() {
  const [activeTab, setActiveTab] = useState<'coa' | 'journals' | 'trial-balance'>('coa');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['asset', 'liability', 'equity', 'revenue', 'expense']));
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'coa') {
        const res = await api.get('/accounting/accounts?active_only=false');
        setAccounts(res.data);
      } else if (activeTab === 'journals') {
        const res = await api.get('/accounting/journals?limit=50');
        setJournals(res.data);
      } else if (activeTab === 'trial-balance') {
        const res = await api.get('/accounting/trial-balance');
        setTrialBalance(res.data);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleType = (type: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedTypes(newExpanded);
  };

  const postJournal = async (id: string) => {
    if (!confirm('Post this journal entry? This action cannot be undone.')) return;
    try {
      await api.post(`/accounting/journals/${id}/post`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to post');
    }
  };

  const reverseJournal = async (id: string) => {
    if (!confirm('Create a reversing entry?')) return;
    try {
      await api.post(`/accounting/journals/${id}/reverse`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to reverse');
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2
    }).format(num || 0);
  };

  const accountTypeColors: Record<string, string> = {
    asset: 'bg-blue-100 text-blue-800',
    liability: 'bg-red-100 text-red-800',
    equity: 'bg-purple-100 text-purple-800',
    revenue: 'bg-green-100 text-green-800',
    expense: 'bg-orange-100 text-orange-800'
  };

  const sourceColors: Record<string, string> = {
    booking: 'bg-blue-100 text-blue-800',
    expense: 'bg-orange-100 text-orange-800',
    tenancy: 'bg-purple-100 text-purple-800',
    manual: 'bg-stone-100 text-stone-800',
    adjustment: 'bg-amber-100 text-amber-800'
  };

  // Group accounts by type
  const groupedAccounts = accounts.reduce((acc, account) => {
    if (!acc[account.account_type]) {
      acc[account.account_type] = [];
    }
    acc[account.account_type].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

  const filteredAccounts = searchTerm
    ? accounts.filter(a =>
        a.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Accounting</h1>
          <p className="text-stone-500">Chart of Accounts, Journal Entries & Reports</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-stone-200">
        <nav className="flex space-x-8">
          {[
            { id: 'coa', label: 'Chart of Accounts', icon: BookOpen },
            { id: 'journals', label: 'Journal Entries', icon: FileText },
            { id: 'trial-balance', label: 'Trial Balance', icon: FileText }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'coa' | 'journals' | 'trial-balance')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <>
          {/* Chart of Accounts */}
          {activeTab === 'coa' && (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm">
              <div className="p-4 border-b border-stone-200">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search accounts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <span className="text-sm text-stone-500">{accounts.length} accounts</span>
                </div>
              </div>

              <div className="divide-y divide-stone-100">
                {filteredAccounts ? (
                  // Search results
                  filteredAccounts.map(account => (
                    <div key={account.id} className="px-4 py-3 flex items-center justify-between hover:bg-stone-50">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-stone-600 w-16">{account.code}</span>
                        <span className="text-stone-800">{account.name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${accountTypeColors[account.account_type]}`}>
                          {account.account_type}
                        </span>
                      </div>
                      {account.is_system && (
                        <span className="text-xs text-stone-400">System</span>
                      )}
                    </div>
                  ))
                ) : (
                  // Grouped view
                  ['asset', 'liability', 'equity', 'revenue', 'expense'].map(type => (
                    <div key={type}>
                      <button
                        onClick={() => toggleType(type)}
                        className="w-full px-4 py-3 flex items-center justify-between bg-stone-50 hover:bg-stone-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${accountTypeColors[type]}`}>
                            {type.toUpperCase()}
                          </span>
                          <span className="text-stone-600 text-sm">
                            {groupedAccounts[type]?.length || 0} accounts
                          </span>
                        </div>
                      </button>
                      {expandedTypes.has(type) && groupedAccounts[type]?.map(account => (
                        <div key={account.id} className="px-4 py-2 pl-12 flex items-center justify-between hover:bg-stone-50 border-l-2 border-stone-200 ml-4">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm text-stone-500 w-16">{account.code}</span>
                            <span className={`text-stone-700 ${account.parent_code ? 'pl-4' : 'font-medium'}`}>
                              {account.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {account.is_system && (
                              <span className="text-xs text-stone-400">System</span>
                            )}
                            {!account.is_active && (
                              <span className="text-xs text-red-500">Inactive</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Journal Entries */}
          {activeTab === 'journals' && (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              {journals.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-stone-800 mb-2">No Journal Entries</h3>
                  <p className="text-stone-500">Journal entries will appear here when bookings or expenses are recorded.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">Entry #</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">Source</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase">Debit</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase">Credit</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-stone-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {journals.map(journal => (
                      <tr key={journal.id} className="hover:bg-stone-50">
                        <td className="px-4 py-3 font-mono text-sm text-stone-600">{journal.entry_number}</td>
                        <td className="px-4 py-3 text-sm text-stone-600">{journal.entry_date}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${sourceColors[journal.source] || 'bg-stone-100 text-stone-600'}`}>
                            {journal.source}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-800 max-w-xs truncate">{journal.description}</td>
                        <td className="px-4 py-3 text-sm text-stone-600 text-right font-mono">
                          {formatCurrency(journal.total_debit)}
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-600 text-right font-mono">
                          {formatCurrency(journal.total_credit)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {journal.is_reversed ? (
                            <span className="text-red-500 text-xs">Reversed</span>
                          ) : journal.is_posted ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-amber-500 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setSelectedJournal(journal)}
                              className="p-1 text-stone-400 hover:text-stone-600"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {!journal.is_posted && !journal.is_locked && (
                              <button
                                onClick={() => postJournal(journal.id)}
                                className="p-1 text-emerald-500 hover:text-emerald-700"
                                title="Post entry"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {journal.is_posted && !journal.is_reversed && (
                              <button
                                onClick={() => reverseJournal(journal.id)}
                                className="p-1 text-red-500 hover:text-red-700"
                                title="Reverse entry"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Trial Balance */}
          {activeTab === 'trial-balance' && trialBalance && (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-stone-800">Trial Balance</h3>
                  <p className="text-sm text-stone-500">As of {trialBalance.as_of_date}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  trialBalance.is_balanced
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {trialBalance.is_balanced ? 'Balanced' : 'Out of Balance'}
                </div>
              </div>

              {trialBalance.accounts.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-stone-800 mb-2">No Transactions Yet</h3>
                  <p className="text-stone-500">Post journal entries to see the trial balance.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">Account</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase">Debit</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase">Credit</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {trialBalance.accounts.map((acc, i) => (
                      <tr key={i} className="hover:bg-stone-50">
                        <td className="px-4 py-3 font-mono text-sm text-stone-500">{acc.account_code}</td>
                        <td className="px-4 py-3 text-sm text-stone-800">{acc.account_name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${accountTypeColors[acc.account_type]}`}>
                            {acc.account_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono">
                          {parseFloat(acc.debit_total) > 0 ? formatCurrency(acc.debit_total) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono">
                          {parseFloat(acc.credit_total) > 0 ? formatCurrency(acc.credit_total) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono font-medium">
                          {formatCurrency(acc.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-stone-100 border-t-2 border-stone-300">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 font-medium text-stone-800">TOTALS</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-stone-800">
                        {formatCurrency(trialBalance.total_debits)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-stone-800">
                        {formatCurrency(trialBalance.total_credits)}
                      </td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {/* Journal Detail Modal */}
      {selectedJournal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-stone-800">{selectedJournal.entry_number}</h2>
                <p className="text-stone-500">{selectedJournal.entry_date}</p>
              </div>
              <button onClick={() => setSelectedJournal(null)} className="text-stone-400 hover:text-stone-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <span className={`px-2 py-1 rounded text-sm ${sourceColors[selectedJournal.source]}`}>
                  {selectedJournal.source}
                </span>
                {selectedJournal.is_posted && (
                  <span className="ml-2 px-2 py-1 rounded text-sm bg-emerald-100 text-emerald-700">Posted</span>
                )}
                {selectedJournal.is_reversed && (
                  <span className="ml-2 px-2 py-1 rounded text-sm bg-red-100 text-red-700">Reversed</span>
                )}
              </div>
              <p className="text-stone-700 mb-4">{selectedJournal.description}</p>
              {selectedJournal.memo && (
                <p className="text-stone-500 text-sm mb-4 italic">{selectedJournal.memo}</p>
              )}

              <table className="w-full">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-stone-500">Account</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-stone-500">Description</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-stone-500">Debit</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-stone-500">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {selectedJournal.lines.map(line => (
                    <tr key={line.id}>
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs text-stone-500">{line.account_code}</span>
                        <span className="ml-2 text-sm text-stone-700">{line.account_name}</span>
                      </td>
                      <td className="px-3 py-2 text-sm text-stone-600">{line.description || '-'}</td>
                      <td className="px-3 py-2 text-right font-mono text-sm">
                        {parseFloat(line.debit) > 0 ? formatCurrency(line.debit) : ''}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-sm">
                        {parseFloat(line.credit) > 0 ? formatCurrency(line.credit) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-stone-100">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 font-medium">Total</td>
                    <td className="px-3 py-2 text-right font-mono font-bold">{formatCurrency(selectedJournal.total_debit)}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold">{formatCurrency(selectedJournal.total_credit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
