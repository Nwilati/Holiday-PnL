import { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, ChevronRight, Building2, Plus,
  AlertCircle, Calendar, Clock, FileText, CreditCard, Receipt, Wallet
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { api } from '../api/client';
import type { UpcomingOffplanPaymentsResponse, OffplanInvestmentSummary } from '../api/client';

interface Property {
  id: string;
  name: string;
}

interface KPIs {
  total_revenue: number;
  net_revenue: number;
  total_expenses: number;
  noi: number;
  occupancy_rate: number;
  adr: number;
  revpar: number;
  total_bookings: number;
  total_nights: number;
}

interface UpcomingCheque {
  id: string;
  tenancy_id: string;
  property_name: string;
  tenant_name: string;
  cheque_number?: string;
  bank_name?: string;
  amount: number;
  due_date: string;
  days_until_due: number;
  payment_method?: string;
}

interface AnnualRevenue {
  total_cleared: number;
  total_pending: number;
  total_contract_value: number;
  active_tenancies: number;
}

interface Alert {
  type: 'danger' | 'warning' | 'info';
  icon: string;
  title: string;
  subtitle: string;
  link: string;
}

interface YoyChanges {
  revenue: number;
  net_revenue: number;
  expenses: number;
  bookings: number;
  nights: number;
  noi: number;
}

interface RevenueTrendItem {
  month: string;
  revenue: number;
  expenses: number;
  noi: number;
}

interface ExpenseCategory {
  [key: string]: string | number;
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface PropertyROI {
  property_id: string;
  property_name: string;
  purchase_price: number;
  total_revenue: number;
  total_expenses: number;
  noi: number;
  roi: number;
}

// Utility: Format currency
const formatAmount = (value: number) => {
  return new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
};

// Format date
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-AE', {
    day: 'numeric',
    month: 'short',
  });
};

// Alert icon component
const AlertIcon = ({ icon, className }: { icon: string; className?: string }) => {
  const icons: Record<string, React.ReactNode> = {
    'alert-circle': <AlertCircle className={className} />,
    'calendar': <Calendar className={className} />,
    'clock': <Clock className={className} />,
    'file-text': <FileText className={className} />,
  };
  return <>{icons[icon] || <AlertCircle className={className} />}</>;
};

// Metric component with YoY trend - SAP Fiori style
const Metric = ({ label, value, prefix = 'AED', trend, small = false }: {
  label: string;
  value: number;
  prefix?: string;
  trend?: number;
  small?: boolean;
}) => (
  <div className={small ? 'py-2' : 'py-3'}>
    <dt className="text-xs text-stone-500 uppercase tracking-wide">{label}</dt>
    <dd className="mt-1 flex items-baseline gap-2">
      <span className={`font-semibold text-stone-900 ${small ? 'text-lg' : 'text-xl'}`}>
        {prefix} {formatAmount(value)}
      </span>
      {trend !== undefined && trend !== 0 && (
        <span className={`text-xs flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
          trend > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}%
        </span>
      )}
    </dd>
  </div>
);

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-stone-200 rounded shadow-lg p-3">
        <p className="text-sm font-medium text-stone-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs text-stone-600">
            <span style={{ color: entry.color }}>●</span> {entry.name}: AED {formatAmount(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [upcomingCheques, setUpcomingCheques] = useState<UpcomingCheque[]>([]);
  const [allCheques, setAllCheques] = useState<any[]>([]);
  const [annualRevenue, setAnnualRevenue] = useState<AnnualRevenue | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [yoyChanges, setYoyChanges] = useState<YoyChanges | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendItem[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseCategory[]>([]);
  const [propertyROI, setPropertyROI] = useState<PropertyROI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [upcomingOffplanPayments, setUpcomingOffplanPayments] = useState<UpcomingOffplanPaymentsResponse | null>(null);
  const [offplanSummary, setOffplanSummary] = useState<OffplanInvestmentSummary | null>(null);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    if (properties.length > 0) {
      loadDashboardData();
      loadUpcomingCheques();
      loadAnnualRevenue();
      loadAllCheques();
      loadAlerts();
      loadYoyComparison();
      loadRevenueTrend();
      loadExpenseBreakdown();
      loadPropertyROI();
    }
    // Load off-plan data regardless of properties
    loadOffplanData();
  }, [selectedProperty, selectedYear, properties]);

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

  const loadDashboardData = async () => {
    if (properties.length === 0) return;
    setIsLoading(true);
    try {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;

      if (selectedProperty) {
        const kpiRes = await api.getKPIs(selectedProperty, startDate, endDate);
        setKpis(kpiRes.data);
      } else {
        // Load aggregate for all properties
        const allKpis: KPIs = {
          total_revenue: 0,
          net_revenue: 0,
          total_expenses: 0,
          noi: 0,
          occupancy_rate: 0,
          adr: 0,
          revpar: 0,
          total_bookings: 0,
          total_nights: 0,
        };

        let shortTermCount = 0;
        let totalOccupancy = 0;

        for (const prop of properties) {
          try {
            const kpiRes = await api.getKPIs(prop.id, startDate, endDate);
            const data = kpiRes.data;
            allKpis.total_revenue += Number(data.total_revenue) || 0;
            allKpis.net_revenue += Number(data.net_revenue) || 0;
            allKpis.total_expenses += Number(data.total_expenses) || 0;
            allKpis.noi += Number(data.noi) || 0;
            allKpis.total_bookings += Number(data.total_bookings) || 0;
            allKpis.total_nights += Number(data.total_nights) || 0;

            const propOccupancy = Number(data.occupancy_rate) || 0;
            if (propOccupancy > 0 || Number(data.total_bookings) > 0) {
              totalOccupancy += propOccupancy;
              shortTermCount++;
            }
          } catch (e) {
            console.error('Failed to load KPIs for property:', prop.id);
          }
        }

        if (shortTermCount > 0) {
          allKpis.occupancy_rate = totalOccupancy / shortTermCount;
          allKpis.adr = allKpis.total_nights > 0 ? allKpis.total_revenue / allKpis.total_nights : 0;
          allKpis.revpar = allKpis.adr * (allKpis.occupancy_rate / 100);
        }

        setKpis(allKpis);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUpcomingCheques = async () => {
    try {
      const params: { property_id?: string; days?: number } = { days: 30 };
      if (selectedProperty) {
        params.property_id = selectedProperty;
      }
      const response = await api.getUpcomingCheques(params);
      setUpcomingCheques(response.data.cheques || []);
    } catch (error) {
      console.error('Failed to load upcoming cheques:', error);
      setUpcomingCheques([]);
    }
  };

  const loadAnnualRevenue = async () => {
    try {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      const params: { property_id?: string; start_date?: string; end_date?: string } = {
        start_date: startDate,
        end_date: endDate,
      };
      if (selectedProperty) {
        params.property_id = selectedProperty;
      }
      const response = await api.getAnnualRevenue(params);
      setAnnualRevenue(response.data);
    } catch (error) {
      console.error('Failed to load annual revenue:', error);
      setAnnualRevenue(null);
    }
  };

  const loadAllCheques = async () => {
    try {
      const tenanciesRes = await api.getTenancies({ status: 'active' });
      const tenancies = tenanciesRes.data;
      const cheques: any[] = [];
      for (const t of tenancies) {
        if (t.cheques) {
          for (const c of t.cheques) {
            cheques.push({
              ...c,
              property_name: t.property_name,
              tenant_name: t.tenant_name,
            });
          }
        }
      }
      setAllCheques(cheques);
    } catch (error) {
      console.error('Failed to load all cheques:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await api.getAlerts(selectedProperty || undefined);
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Failed to load alerts:', error);
      setAlerts([]);
    }
  };

  const loadYoyComparison = async () => {
    try {
      const response = await api.getYoyComparison(selectedProperty || undefined, selectedYear);
      setYoyChanges(response.data.changes || null);
    } catch (error) {
      console.error('Failed to load YoY comparison:', error);
      setYoyChanges(null);
    }
  };

  const loadRevenueTrend = async () => {
    try {
      let response;
      if (selectedProperty) {
        response = await api.getRevenueTrend(selectedProperty, selectedYear);
      } else {
        response = await api.getRevenueTrendAll(selectedYear);
      }
      setRevenueTrend(response.data || []);
    } catch (error) {
      console.error('Failed to load revenue trend:', error);
      setRevenueTrend([]);
    }
  };

  const loadExpenseBreakdown = async () => {
    try {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      let response;
      if (selectedProperty) {
        response = await api.getExpenseBreakdown(selectedProperty, startDate, endDate);
        // Transform to match expected format
        setExpenseBreakdown(response.data.map((item: any, index: number) => ({
          name: item.category_name,
          value: item.amount,
          percentage: item.percentage,
          color: ['#0854a0', '#d08014', '#107e3e', '#a9d18e', '#bb0000', '#6c6c6c'][index % 6]
        })));
      } else {
        response = await api.getExpenseBreakdownAll(startDate, endDate);
        setExpenseBreakdown(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load expense breakdown:', error);
      setExpenseBreakdown([]);
    }
  };

  const loadPropertyROI = async () => {
    try {
      const response = await api.getPropertyROI(selectedYear);
      setPropertyROI(response.data.properties || []);
    } catch (error) {
      console.error('Failed to load property ROI:', error);
      setPropertyROI([]);
    }
  };

  const loadOffplanData = async () => {
    try {
      const [paymentsRes, summaryRes] = await Promise.all([
        api.getUpcomingOffplanPayments({ days: 30 }),
        api.getOffplanInvestmentSummary(),
      ]);
      setUpcomingOffplanPayments(paymentsRes.data);
      setOffplanSummary(summaryRes.data);
    } catch (error) {
      console.error('Failed to load off-plan data:', error);
      setUpcomingOffplanPayments(null);
      setOffplanSummary(null);
    }
  };

  // Helper functions
  const getDaysColor = (days: number) => {
    if (days < 7) return 'text-red-600';
    if (days < 14) return 'text-amber-600';
    return 'text-green-600';
  };

  const getCombinedRevenue = () => {
    const shortTerm = Number(kpis?.total_revenue) || 0;
    const longTerm = Number(annualRevenue?.total_contract_value) || 0;  // Use expected, not cleared
    return shortTerm + longTerm;
  };

  const getCombinedNOI = () => {
    const revenue = getCombinedRevenue();
    const expenses = Number(kpis?.total_expenses) || 0;
    return revenue - expenses;
  };

  const getCollectionPercent = () => {
    const cleared = Number(annualRevenue?.total_cleared) || 0;
    const total = Number(annualRevenue?.total_contract_value) || 0;
    return total > 0 ? Math.round(cleared / total * 100) : 0;
  };

  const getChequesTimelineData = () => {
    const today = new Date();
    const data = [
      { label: 'Overdue', status: 'negative', count: 0, amount: 0 },
      { label: 'This Week', status: 'warning', count: 0, amount: 0 },
      { label: 'Next 30 Days', status: 'info', count: 0, amount: 0 },
      { label: 'Future', status: 'neutral', count: 0, amount: 0 },
    ];

    allCheques.filter(c => c.status === 'pending').forEach(cheque => {
      const dueDate = new Date(cheque.due_date);
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        data[0].count++;
        data[0].amount += Number(cheque.amount);
      } else if (diffDays <= 7) {
        data[1].count++;
        data[1].amount += Number(cheque.amount);
      } else if (diffDays <= 30) {
        data[2].count++;
        data[2].amount += Number(cheque.amount);
      } else {
        data[3].count++;
        data[3].amount += Number(cheque.amount);
      }
    });

    return data;
  };

  if (isLoading && properties.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stone-200 border-t-sky-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8 text-stone-400" />
        </div>
        <h2 className="text-lg font-semibold text-stone-800 mb-2">No Properties Yet</h2>
        <p className="text-sm text-stone-500 mb-6 text-center max-w-md">
          Add your first property to start tracking revenue and expenses.
        </p>
        <Link
          to="/properties"
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white text-sm rounded hover:bg-sky-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Property
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Context Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Dashboard</h1>
          <p className="text-sm text-stone-500">Property performance overview</p>
        </div>

        {/* Context Controls */}
        <div className="flex items-center gap-3">
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="text-sm border border-stone-300 rounded px-3 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          >
            <option value="">All Properties</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-sm border border-stone-300 rounded px-3 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          >
            <option value={currentYear}>{currentYear}</option>
            <option value={currentYear - 1}>{currentYear - 1}</option>
            <option value={currentYear - 2}>{currentYear - 2}</option>
          </select>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="flex items-center gap-3">
        <Link
          to="/bookings?action=new"
          className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 rounded text-sm text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors"
        >
          <CreditCard className="w-4 h-4 text-sky-600" />
          Add Booking
        </Link>
        <Link
          to="/expenses?action=new"
          className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 rounded text-sm text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors"
        >
          <Receipt className="w-4 h-4 text-amber-600" />
          Add Expense
        </Link>
        <Link
          to="/tenancies"
          className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 rounded text-sm text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors"
        >
          <Wallet className="w-4 h-4 text-green-600" />
          Record Payment
        </Link>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-lg">
          <div className="px-4 py-3 border-b border-stone-100">
            <h2 className="text-sm font-medium text-stone-700">Alerts</h2>
          </div>
          <div className="divide-y divide-stone-100">
            {alerts.map((alert, index) => (
              <Link
                key={index}
                to={alert.link}
                className="flex items-center gap-4 px-4 py-3 hover:bg-stone-50 transition-colors"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  alert.type === 'danger' ? 'bg-red-100' :
                  alert.type === 'warning' ? 'bg-amber-100' : 'bg-sky-100'
                }`}>
                  <AlertIcon
                    icon={alert.icon}
                    className={`w-4 h-4 ${
                      alert.type === 'danger' ? 'text-red-600' :
                      alert.type === 'warning' ? 'text-amber-600' : 'text-sky-600'
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    alert.type === 'danger' ? 'text-red-800' :
                    alert.type === 'warning' ? 'text-amber-800' : 'text-sky-800'
                  }`}>{alert.title}</p>
                  <p className="text-xs text-stone-500">{alert.subtitle}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Primary Metrics Panel with YoY */}
      <div className="bg-white border border-stone-200 rounded-lg">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-sm font-medium text-stone-700">Key Performance Indicators</h2>
          {yoyChanges && (
            <span className="text-xs text-stone-500">vs {selectedYear - 1}</span>
          )}
        </div>
        <div className="px-4 py-2 grid grid-cols-4 divide-x divide-stone-100">
          <Metric
            label="Short-Term Revenue"
            value={Number(kpis?.total_revenue) || 0}
            trend={yoyChanges?.revenue}
          />
          <div className="pl-4">
            <dt className="text-xs text-stone-500 uppercase tracking-wide">Annual Rent</dt>
            <dd className="mt-1 flex items-baseline gap-4">
              <div>
                <span className="text-xs text-stone-400">Expected</span>
                <p className="text-lg font-semibold text-stone-900">AED {formatAmount(Number(annualRevenue?.total_contract_value) || 0)}</p>
              </div>
              <div>
                <span className="text-xs text-stone-400">Collected</span>
                <p className="text-lg font-semibold text-green-700">AED {formatAmount(Number(annualRevenue?.total_cleared) || 0)}</p>
              </div>
            </dd>
          </div>
          <div className="pl-4">
            <Metric
              label="Combined Revenue"
              value={getCombinedRevenue()}
            />
          </div>
          <div className="pl-4">
            <Metric
              label="Total Expenses"
              value={Number(kpis?.total_expenses) || 0}
              trend={yoyChanges?.expenses ? -yoyChanges.expenses : undefined}
            />
          </div>
        </div>
        <div className="px-4 py-2 grid grid-cols-4 divide-x divide-stone-100 border-t border-stone-100">
          <div className="py-3">
            <Metric
              label="Net Operating Income"
              value={getCombinedNOI()}
              trend={yoyChanges?.noi}
            />
          </div>
          <div className="pl-4 py-3">
            <dt className="text-xs text-stone-500 uppercase tracking-wide">Occupancy</dt>
            <dd className="mt-1 text-xl font-semibold text-stone-900">
              {Math.round(Number(kpis?.occupancy_rate) || 0)}%
            </dd>
          </div>
          <div className="pl-4 py-3">
            <dt className="text-xs text-stone-500 uppercase tracking-wide">ADR</dt>
            <dd className="mt-1 text-xl font-semibold text-stone-900">
              AED {formatAmount(Number(kpis?.adr) || 0)}
            </dd>
          </div>
          <div className="pl-4 py-3">
            <dt className="text-xs text-stone-500 uppercase tracking-wide">Bookings</dt>
            <dd className="mt-1 text-xl font-semibold text-stone-900">
              {Number(kpis?.total_bookings) || 0}
            </dd>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Revenue Trend Chart */}
        <div className="col-span-2 bg-white border border-stone-200 rounded-lg">
          <div className="px-4 py-3 border-b border-stone-100">
            <h2 className="text-sm font-medium text-stone-700">Monthly Revenue Trend</h2>
          </div>
          <div className="p-4">
            {revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#78716c" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#78716c" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#0854a0"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="#d08014"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="noi"
                    name="NOI"
                    stroke="#107e3e"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-stone-400 text-sm">
                No data available for {selectedYear}
              </div>
            )}
          </div>
        </div>

        {/* Expense Breakdown Donut */}
        <div className="bg-white border border-stone-200 rounded-lg">
          <div className="px-4 py-3 border-b border-stone-100">
            <h2 className="text-sm font-medium text-stone-700">Expense Breakdown</h2>
          </div>
          <div className="p-4">
            {expenseBreakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `AED ${formatAmount(Number(value))}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {expenseBreakdown.slice(0, 4).map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-stone-600 truncate max-w-[120px]">{item.name}</span>
                      </div>
                      <span className="text-stone-900 font-medium">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-stone-400 text-sm">
                No expenses recorded
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-3 gap-6">

        {/* Left: Cheque Collection */}
        <div className="col-span-2 bg-white border border-stone-200 rounded-lg">
          <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-stone-700">Annual Tenancy - Cheque Collection</h2>
            <span className="text-xs text-stone-500">{selectedYear} YTD</span>
          </div>

          {/* Progress bar */}
          <div className="px-4 py-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-stone-600">Collection Progress</span>
              <span className="font-medium text-stone-900">{getCollectionPercent()}%</span>
            </div>
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-600 rounded-full transition-all"
                style={{ width: `${getCollectionPercent()}%` }}
              />
            </div>
          </div>

          {/* Metrics row */}
          <div className="px-4 pb-4 grid grid-cols-4 gap-4">
            <div className="p-3 bg-stone-50 rounded">
              <div className="text-xs text-stone-500">Cleared</div>
              <div className="text-sm font-semibold text-green-700 mt-1">
                AED {formatAmount(Number(annualRevenue?.total_cleared) || 0)}
              </div>
            </div>
            <div className="p-3 bg-stone-50 rounded">
              <div className="text-xs text-stone-500">Pending</div>
              <div className="text-sm font-semibold text-amber-700 mt-1">
                AED {formatAmount(Number(annualRevenue?.total_pending) || 0)}
              </div>
            </div>
            <div className="p-3 bg-stone-50 rounded">
              <div className="text-xs text-stone-500">Contract Value</div>
              <div className="text-sm font-semibold text-stone-700 mt-1">
                AED {formatAmount(Number(annualRevenue?.total_contract_value) || 0)}
              </div>
            </div>
            <div className="p-3 bg-stone-50 rounded">
              <div className="text-xs text-stone-500">Active Tenancies</div>
              <div className="text-sm font-semibold text-stone-700 mt-1">
                {Number(annualRevenue?.active_tenancies) || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Cheques Due */}
        <div className="bg-white border border-stone-200 rounded-lg">
          <div className="px-4 py-3 border-b border-stone-100">
            <h2 className="text-sm font-medium text-stone-700">Cheques Due</h2>
          </div>
          <div className="divide-y divide-stone-100">
            {getChequesTimelineData().map((row) => (
              <div key={row.label} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    row.status === 'negative' ? 'bg-red-500' :
                    row.status === 'warning' ? 'bg-amber-500' :
                    row.status === 'info' ? 'bg-sky-500' : 'bg-stone-300'
                  }`} />
                  <span className="text-sm text-stone-700">{row.label}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-stone-900">
                    {row.count > 0 ? `AED ${formatAmount(row.amount)}` : '—'}
                  </div>
                  <div className="text-xs text-stone-500">
                    {row.count} {row.count === 1 ? 'cheque' : 'cheques'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Property ROI Widget */}
      {propertyROI.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-lg">
          <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-stone-700">Property Performance by ROI</h2>
            <span className="text-xs text-stone-500">{selectedYear} Annual Return</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50 text-left">
                <th className="px-4 py-2 text-xs font-medium text-stone-500 uppercase">Property</th>
                <th className="px-4 py-2 text-xs font-medium text-stone-500 uppercase text-right">Purchase Price</th>
                <th className="px-4 py-2 text-xs font-medium text-stone-500 uppercase text-right">Revenue</th>
                <th className="px-4 py-2 text-xs font-medium text-stone-500 uppercase text-right">Expenses</th>
                <th className="px-4 py-2 text-xs font-medium text-stone-500 uppercase text-right">NOI</th>
                <th className="px-4 py-2 text-xs font-medium text-stone-500 uppercase text-right">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {propertyROI.map((prop, index) => (
                <tr key={prop.property_id} className="hover:bg-stone-50">
                  <td className="px-4 py-2.5 text-sm font-medium text-stone-900">
                    <div className="flex items-center gap-2">
                      {index === 0 && <span className="text-amber-500">1st</span>}
                      {index === 1 && <span className="text-stone-400">2nd</span>}
                      {index === 2 && <span className="text-amber-700">3rd</span>}
                      {prop.property_name}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-stone-600 text-right tabular-nums">
                    AED {formatAmount(prop.purchase_price)}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-stone-600 text-right tabular-nums">
                    AED {formatAmount(prop.total_revenue)}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-stone-600 text-right tabular-nums">
                    AED {formatAmount(prop.total_expenses)}
                  </td>
                  <td className="px-4 py-2.5 text-sm font-medium text-stone-900 text-right tabular-nums">
                    AED {formatAmount(prop.noi)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-sm font-semibold ${
                      prop.roi >= 8 ? 'bg-green-100 text-green-800' :
                      prop.roi >= 5 ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {prop.roi}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upcoming Cheques Table */}
      <div className="bg-white border border-stone-200 rounded-lg">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-sm font-medium text-stone-700">Upcoming Cheques</h2>
          <Link to="/tenancies" className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-stone-50 text-left">
              <th className="px-4 py-2 text-xs font-medium text-stone-500 uppercase">Tenant</th>
              <th className="px-4 py-2 text-xs font-medium text-stone-500 uppercase">Property</th>
              <th className="px-4 py-2 text-xs font-medium text-stone-500 uppercase">Cheque</th>
              <th className="px-4 py-2 text-xs font-medium text-stone-500 uppercase text-right">Amount</th>
              <th className="px-4 py-2 text-xs font-medium text-stone-500 uppercase text-right">Due Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {upcomingCheques.slice(0, 5).map((cheque) => (
              <tr key={cheque.id} className="hover:bg-stone-50">
                <td className="px-4 py-2.5 text-sm font-medium text-stone-900">{cheque.tenant_name}</td>
                <td className="px-4 py-2.5 text-sm text-stone-600">{cheque.property_name}</td>
                <td className="px-4 py-2.5 text-sm text-stone-600">{cheque.cheque_number || '—'}</td>
                <td className="px-4 py-2.5 text-sm font-medium text-stone-900 text-right tabular-nums">
                  AED {formatAmount(cheque.amount)}
                </td>
                <td className="px-4 py-2.5 text-sm text-stone-600 text-right">{formatDate(cheque.due_date)}</td>
              </tr>
            ))}
            {upcomingCheques.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-stone-500">
                  No upcoming cheques
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Off-Plan Investment Summary */}
      {offplanSummary && offplanSummary.total_properties > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <div className="text-xs text-stone-500 uppercase tracking-wide mb-1">Off-Plan Properties</div>
            <div className="text-2xl font-semibold text-stone-900">{offplanSummary.total_properties}</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <div className="text-xs text-stone-500 uppercase tracking-wide mb-1">Total Investment</div>
            <div className="text-2xl font-semibold text-stone-900">AED {formatAmount(offplanSummary.total_investment)}</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <div className="text-xs text-stone-500 uppercase tracking-wide mb-1">Total Paid</div>
            <div className="text-2xl font-semibold text-green-600">AED {formatAmount(offplanSummary.total_paid)}</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <div className="text-xs text-stone-500 uppercase tracking-wide mb-1">Remaining</div>
            <div className="text-2xl font-semibold text-amber-600">
              AED {formatAmount(offplanSummary.total_investment - offplanSummary.total_paid)}
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Off-Plan Payments */}
      {upcomingOffplanPayments && upcomingOffplanPayments.payments.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-lg">
          <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-stone-700">Upcoming Off-Plan Payments</h2>
            <Link to="/offplan" className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50 text-left">
                <th className="px-4 py-2 text-xs font-medium text-stone-500 uppercase">Project</th>
                <th className="px-4 py-2 text-xs font-medium text-stone-500 uppercase">Unit</th>
                <th className="px-4 py-2 text-xs font-medium text-stone-500 uppercase">Milestone</th>
                <th className="px-4 py-2 text-xs font-medium text-stone-500 uppercase text-right">Amount</th>
                <th className="px-4 py-2 text-xs font-medium text-stone-500 uppercase text-right">Due Date</th>
                <th className="px-4 py-2 text-xs font-medium text-stone-500 uppercase text-right">Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {upcomingOffplanPayments.payments.slice(0, 5).map((payment) => (
                <tr key={payment.payment_id} className="hover:bg-stone-50">
                  <td className="px-4 py-2.5 text-sm font-medium text-stone-900">{payment.project_name}</td>
                  <td className="px-4 py-2.5 text-sm text-stone-600">{payment.unit_number}</td>
                  <td className="px-4 py-2.5 text-sm text-stone-600">{payment.milestone_name}</td>
                  <td className="px-4 py-2.5 text-sm font-medium text-stone-900 text-right tabular-nums">
                    AED {formatAmount(payment.amount)}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-stone-600 text-right">{formatDate(payment.due_date)}</td>
                  <td className={`px-4 py-2.5 text-sm font-medium text-right ${getDaysColor(payment.days_until_due)}`}>
                    {payment.days_until_due}d
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-stone-50 border-t border-stone-200">
              <tr>
                <td colSpan={3} className="px-4 py-2.5 text-sm font-medium text-stone-700">
                  Total Due (30 days)
                </td>
                <td colSpan={3} className="px-4 py-2.5 text-sm font-semibold text-stone-900 text-right tabular-nums">
                  AED {formatAmount(upcomingOffplanPayments.total_amount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
