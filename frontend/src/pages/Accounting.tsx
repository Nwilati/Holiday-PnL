import { useState, useEffect } from 'react';
import {
  BookOpen, Search,
  FileText, CheckCircle, XCircle, RotateCcw, Eye, X
} from 'lucide-react';
import api, { type IncomeStatementResponse } from '../api/client';

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

type AccountingTab = 'coa' | 'journals' | 'trial-balance' | 'income-statement';

export default function Accounting() {
  const [activeTab, setActiveTab] = useState<AccountingTab>('coa');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['asset', 'liability', 'equity', 'revenue', 'expense']));
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Income Statement (P&L) tab state
  const todayStr = new Date().toISOString().split('T')[0];
  const yearStartStr = `${new Date().getFullYear()}-01-01`;
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementResponse | null>(null);
  const [plStart, setPlStart] = useState(yearStartStr);
  const [plEnd, setPlEnd] = useState(todayStr);
  const [plProperty, setPlProperty] = useState('');
  const [plLoading, setPlLoading] = useState(false);
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [backfilling, setBackfilling] = useState(false);
  const [postingDrafts, setPostingDrafts] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Load properties once for the P&L property filter
  useEffect(() => {
    api.getProperties().then((res) => setProperties(res.data)).catch(() => {});
  }, []);

  // Fetch the income statement when its tab is active or its filters change
  useEffect(() => {
    if (activeTab !== 'income-statement') return;
    setPlLoading(true);
    api
      .getIncomeStatement({ start_date: plStart, end_date: plEnd, property_id: plProperty || undefined })
      .then((res) => setIncomeStatement(res.data))
      .catch(() => setIncomeStatement(null))
      .finally(() => setPlLoading(false));
  }, [activeTab, plStart, plEnd, plProperty]);

  const refreshIncomeStatement = async () => {
    const r = await api.getIncomeStatement({ start_date: plStart, end_date: plEnd, property_id: plProperty || undefined });
    setIncomeStatement(r.data);
  };

  const runBackfill = async () => {
    if (!confirm('Generate ledger entries for all cleared tenancy payments and terminations? Safe to re-run.')) return;
    setBackfilling(true);
    try {
      const res = await api.backfillTenancyJournals();
      alert(`Backfill complete: ${res.data.created} posted, ${res.data.skipped} skipped.`);
      if (activeTab === 'income-statement') await refreshIncomeStatement();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Backfill failed');
    } finally {
      setBackfilling(false);
    }
  };

  const runPostDrafts = async () => {
    if (!confirm('Post all draft booking & expense journals so they appear in the P&L? Safe to re-run.')) return;
    setPostingDrafts(true);
    try {
      const res = await api.postAllDrafts();
      alert(`Posted ${res.data.posted} draft journal(s), ${res.data.skipped} skipped.`);
      if (activeTab === 'income-statement') await refreshIncomeStatement();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Posting drafts failed');
    } finally {
      setPostingDrafts(false);
    }
  };

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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num || 0);
  };

  const accountTypeColors: Record<string, string> = {
    asset: 'bg-sky-50 text-sky-700',
    liability: 'bg-red-50 text-red-700',
    equity: 'bg-stone-100 text-stone-600',
    revenue: 'bg-green-50 text-green-700',
    income: 'bg-green-50 text-green-700',
    expense: 'bg-amber-50 text-amber-700'
  };

  const sourceColors: Record<string, string> = {
    booking: 'bg-sky-50 text-sky-700',
    expense: 'bg-amber-50 text-amber-700',
    tenancy: 'bg-sky-50 text-sky-700',
    tenancy_payment: 'bg-green-50 text-green-700',
    tenancy_termination: 'bg-red-50 text-red-700',
    manual: 'bg-stone-100 text-stone-600',
    adjustment: 'bg-amber-50 text-amber-700'
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Accounting</h1>
          <p className="text-sm text-stone-500">Chart of Accounts, Journal Entries & Reports</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-stone-200">
        <nav className="flex space-x-6">
          {[
            { id: 'coa', label: 'Chart of Accounts', icon: BookOpen },
            { id: 'journals', label: 'Journal Entries', icon: FileText },
            { id: 'trial-balance', label: 'Trial Balance', icon: FileText },
            { id: 'income-statement', label: 'Income Statement', icon: FileText }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AccountingTab)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-sky-600 text-sky-600'
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        </div>
      ) : (
        <>
          {/* Chart of Accounts */}
          {activeTab === 'coa' && (
            <div className="space-y-4">
              {/* Search bar */}
              <div className="flex items-center gap-3 py-2">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search accounts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>
                <span className="text-sm text-stone-500">{accounts.length} accounts</span>
              </div>

              {/* Table */}
              <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                {filteredAccounts ? (
                  // Search results as table
                  <table className="w-full">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-200">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Code</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Account Name</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Type</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredAccounts.map(account => (
                        <tr key={account.id} className="hover:bg-stone-50">
                          <td className="px-4 py-2.5 text-sm font-mono text-stone-600">{account.code}</td>
                          <td className="px-4 py-2.5 text-sm text-stone-900">{account.name}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${accountTypeColors[account.account_type]}`}>
                              {account.account_type}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-stone-500">
                            {account.is_system && <span className="text-stone-400">System</span>}
                            {!account.is_active && <span className="text-red-500 ml-2">Inactive</span>}
                          </td>
                        </tr>
                      ))}
                      {filteredAccounts.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-12 text-center text-stone-500">
                            No accounts found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  // Grouped view
                  <div className="divide-y divide-stone-100">
                    {['asset', 'liability', 'equity', 'revenue', 'expense'].map(type => (
                      <div key={type}>
                        <button
                          onClick={() => toggleType(type)}
                          className="w-full px-4 py-2.5 flex items-center justify-between bg-stone-50 hover:bg-stone-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${accountTypeColors[type]}`}>
                              {type.toUpperCase()}
                            </span>
                            <span className="text-sm text-stone-600">
                              {groupedAccounts[type]?.length || 0} accounts
                            </span>
                          </div>
                        </button>
                        {expandedTypes.has(type) && groupedAccounts[type]?.map(account => (
                          <div key={account.id} className="px-4 py-2 pl-12 flex items-center justify-between hover:bg-stone-50 border-l-2 border-stone-200 ml-4">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm text-stone-500 w-16">{account.code}</span>
                              <span className={`text-sm text-stone-700 ${account.parent_code ? 'pl-4' : 'font-medium'}`}>
                                {account.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              {account.is_system && <span className="text-stone-400">System</span>}
                              {!account.is_active && <span className="text-red-500">Inactive</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Journal Entries */}
          {activeTab === 'journals' && (
            <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
              {journals.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-stone-800 mb-2">No Journal Entries</h3>
                  <p className="text-stone-500">Journal entries will appear here when bookings or expenses are recorded.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Entry #</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Date</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Source</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Description</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">Debit</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">Credit</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-stone-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {journals.map(journal => (
                      <tr key={journal.id} className="hover:bg-stone-50">
                        <td className="px-4 py-2.5 text-sm font-mono text-stone-600">{journal.entry_number}</td>
                        <td className="px-4 py-2.5 text-sm text-stone-600 tabular-nums">{journal.entry_date}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${sourceColors[journal.source] || 'bg-stone-100 text-stone-600'}`}>
                            {journal.source}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-stone-800 max-w-xs truncate">{journal.description}</td>
                        <td className="px-4 py-2.5 text-sm text-stone-600 text-right font-mono tabular-nums">
                          AED {formatCurrency(journal.total_debit)}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-stone-600 text-right font-mono tabular-nums">
                          AED {formatCurrency(journal.total_credit)}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {journal.is_reversed ? (
                            <span className="text-xs text-red-500">Reversed</span>
                          ) : journal.is_posted ? (
                            <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-amber-500 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-2.5">
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
                                className="p-1 text-green-500 hover:text-green-700"
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
            <div className="space-y-4">
              {/* Status header */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-stone-500">As of {trialBalance.as_of_date}</p>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                  trialBalance.is_balanced
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {trialBalance.is_balanced ? 'Balanced' : 'Out of Balance'}
                </span>
              </div>

              {/* Table */}
              <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                {trialBalance.accounts.length === 0 ? (
                  <div className="p-12 text-center">
                    <FileText className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-stone-800 mb-2">No Transactions Yet</h3>
                    <p className="text-stone-500">Post journal entries to see the trial balance.</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-200">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Code</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Account</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Type</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">Debit</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">Credit</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {trialBalance.accounts.map((acc, i) => (
                        <tr key={i} className="hover:bg-stone-50">
                          <td className="px-4 py-2.5 text-sm font-mono text-stone-500">{acc.account_code}</td>
                          <td className="px-4 py-2.5 text-sm text-stone-800">{acc.account_name}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${accountTypeColors[acc.account_type]}`}>
                              {acc.account_type}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-right font-mono tabular-nums">
                            {parseFloat(acc.debit_total) > 0 ? `AED ${formatCurrency(acc.debit_total)}` : '-'}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-right font-mono tabular-nums">
                            {parseFloat(acc.credit_total) > 0 ? `AED ${formatCurrency(acc.credit_total)}` : '-'}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-right font-mono font-medium tabular-nums">
                            AED {formatCurrency(acc.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-stone-100 border-t-2 border-stone-300">
                      <tr>
                        <td colSpan={3} className="px-4 py-2.5 font-semibold text-stone-800">TOTALS</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-stone-800 tabular-nums">
                          AED {formatCurrency(trialBalance.total_debits)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-stone-800 tabular-nums">
                          AED {formatCurrency(trialBalance.total_credits)}
                        </td>
                        <td className="px-4 py-2.5"></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Income Statement (P&L) */}
          {activeTab === 'income-statement' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">From</label>
                  <input type="date" value={plStart} onChange={(e) => setPlStart(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">To</label>
                  <input type="date" value={plEnd} onChange={(e) => setPlEnd(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Property</label>
                  <select value={plProperty} onChange={(e) => setPlProperty(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500">
                    <option value="">All properties</option>
                    {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="ml-auto flex items-end gap-2">
                  <button onClick={runPostDrafts} disabled={postingDrafts}
                    className="px-3 py-1.5 text-sm font-medium text-stone-700 border border-stone-300 hover:bg-stone-50 rounded disabled:opacity-50"
                    title="Post draft booking & expense journals so they show in the P&L (idempotent)">
                    {postingDrafts ? 'Posting…' : 'Post draft journals'}
                  </button>
                  <button onClick={runBackfill} disabled={backfilling}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded disabled:opacity-50"
                    title="Post ledger entries for all cleared tenancy payments and terminations (idempotent)">
                    {backfilling ? 'Backfilling…' : 'Backfill tenancy ledger'}
                  </button>
                </div>
              </div>

              {plLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
                </div>
              ) : incomeStatement ? (
                <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <tbody className="divide-y divide-stone-100">
                      <tr className="bg-stone-50">
                        <td colSpan={2} className="px-4 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wide">Revenue</td>
                      </tr>
                      {incomeStatement.revenue.length === 0 ? (
                        <tr><td colSpan={2} className="px-4 py-2.5 text-sm text-stone-400">No revenue in this period</td></tr>
                      ) : incomeStatement.revenue.map((l, i) => (
                        <tr key={`r${i}`} className="hover:bg-stone-50">
                          <td className="px-4 py-2.5 text-sm text-stone-800">
                            <span className="font-mono text-stone-400 mr-2">{l.account_code}</span>{l.account_name}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-right font-mono tabular-nums text-green-700">AED {formatCurrency(l.amount)}</td>
                        </tr>
                      ))}
                      <tr className="bg-stone-50 font-semibold">
                        <td className="px-4 py-2 text-sm text-stone-700">Total Revenue</td>
                        <td className="px-4 py-2 text-sm text-right font-mono tabular-nums text-green-700">AED {formatCurrency(incomeStatement.total_revenue)}</td>
                      </tr>

                      <tr className="bg-stone-50">
                        <td colSpan={2} className="px-4 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wide">Expenses</td>
                      </tr>
                      {incomeStatement.expenses.length === 0 ? (
                        <tr><td colSpan={2} className="px-4 py-2.5 text-sm text-stone-400">No expenses in this period</td></tr>
                      ) : incomeStatement.expenses.map((l, i) => (
                        <tr key={`e${i}`} className="hover:bg-stone-50">
                          <td className="px-4 py-2.5 text-sm text-stone-800">
                            <span className="font-mono text-stone-400 mr-2">{l.account_code}</span>{l.account_name}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-right font-mono tabular-nums text-amber-700">AED {formatCurrency(l.amount)}</td>
                        </tr>
                      ))}
                      <tr className="bg-stone-50 font-semibold">
                        <td className="px-4 py-2 text-sm text-stone-700">Total Expenses</td>
                        <td className="px-4 py-2 text-sm text-right font-mono tabular-nums text-amber-700">AED {formatCurrency(incomeStatement.total_expenses)}</td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-stone-100 border-t-2 border-stone-300">
                      <tr>
                        <td className="px-4 py-3 font-bold text-stone-900">NET PROFIT</td>
                        <td className={`px-4 py-3 text-right font-mono font-bold tabular-nums ${incomeStatement.net_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          AED {formatCurrency(incomeStatement.net_profit)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="bg-white border border-stone-200 rounded-lg p-12 text-center">
                  <FileText className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                  <p className="text-stone-500">No data for this period.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Journal Detail Modal */}
      {selectedJournal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/30" onClick={() => setSelectedJournal(null)} />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
              {/* Header */}
              <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-stone-900">{selectedJournal.entry_number}</h2>
                  <p className="text-sm text-stone-500">{selectedJournal.entry_date}</p>
                </div>
                <button
                  onClick={() => setSelectedJournal(null)}
                  className="p-1 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4">
              {/* Status badges */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${sourceColors[selectedJournal.source]}`}>
                  {selectedJournal.source.toUpperCase()}
                </span>
                {selectedJournal.is_posted && (
                  <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-green-50 text-green-700">POSTED</span>
                )}
                {selectedJournal.is_reversed && (
                  <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-red-50 text-red-700">REVERSED</span>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-stone-700 mb-6">{selectedJournal.description}</p>

              {/* Journal Lines Table */}
              <div className="border border-stone-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase">Account</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase">Description</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase">Debit</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {selectedJournal.lines.map(line => (
                      <tr key={line.id} className="hover:bg-stone-50">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">{line.account_code}</span>
                            <span className="text-sm text-stone-700">{line.account_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-stone-600">{line.description || '-'}</td>
                        <td className="px-4 py-2.5 text-sm text-right font-mono text-stone-700 tabular-nums">
                          {parseFloat(line.debit) > 0 ? `AED ${formatCurrency(line.debit)}` : ''}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-right font-mono text-stone-700 tabular-nums">
                          {parseFloat(line.credit) > 0 ? `AED ${formatCurrency(line.credit)}` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-stone-100 border-t-2 border-stone-300">
                    <tr>
                      <td colSpan={2} className="px-4 py-2.5 font-semibold text-stone-800">Total</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-stone-800 tabular-nums">AED {formatCurrency(selectedJournal.total_debit)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-stone-800 tabular-nums">AED {formatCurrency(selectedJournal.total_credit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-stone-200 flex items-center justify-end">
                <button
                  onClick={() => setSelectedJournal(null)}
                  className="px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
