import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ChevronRight, Building2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

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

// Utility: Format currency without "AED" prefix for density
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

// Metric component - SAP style
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
        <span className={`text-xs flex items-center gap-0.5 ${
          trend > 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}%
        </span>
      )}
    </dd>
  </div>
);

export default function Dashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [upcomingCheques, setUpcomingCheques] = useState<UpcomingCheque[]>([]);
  const [allCheques, setAllCheques] = useState<any[]>([]);
  const [annualRevenue, setAnnualRevenue] = useState<AnnualRevenue | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    loadDashboardData();
    loadUpcomingCheques();
    loadAnnualRevenue();
    loadAllCheques();
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
          } catch (e) {
            console.error('Failed to load KPIs for property:', prop.id);
          }
        }

        // Calculate averages for rate metrics
        if (properties.length > 0) {
          allKpis.occupancy_rate = allKpis.total_nights / (properties.length * 365) * 100;
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
      const params: { property_id?: string } = {};
      if (selectedProperty) {
        params.property_id = selectedProperty;
      }
      const response = await api.getTenancies(params);
      const tenancies = response.data || [];
      const cheques: any[] = [];
      tenancies.forEach((tenancy: any) => {
        if (tenancy.cheques) {
          cheques.push(...tenancy.cheques);
        }
      });
      setAllCheques(cheques);
    } catch (error) {
      console.error('Failed to load cheques:', error);
      setAllCheques([]);
    }
  };

  // Combined revenue (short-term + annual cleared)
  const getCombinedRevenue = () => {
    const shortTerm = Number(kpis?.total_revenue) || 0;
    const annual = Number(annualRevenue?.total_cleared) || 0;
    return shortTerm + annual;
  };

  // Combined NOI
  const getCombinedNOI = () => {
    const shortTermNOI = Number(kpis?.noi) || 0;
    const annualCleared = Number(annualRevenue?.total_cleared) || 0;
    return shortTermNOI + annualCleared;
  };

  // Get collection percentage
  const getCollectionPercent = () => {
    const cleared = Number(annualRevenue?.total_cleared) || 0;
    const pending = Number(annualRevenue?.total_pending) || 0;
    const total = cleared + pending;
    return total > 0 ? Math.round((cleared / total) * 100) : 0;
  };

  // Get cheques due timeline data
  const getChequesTimelineData = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const timeline = {
      overdue: { count: 0, amount: 0 },
      thisWeek: { count: 0, amount: 0 },
      thisMonth: { count: 0, amount: 0 },
      next30Days: { count: 0, amount: 0 },
    };

    allCheques
      .filter((cheque) => cheque.status === 'pending')
      .forEach((cheque) => {
        const dueDate = new Date(cheque.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          timeline.overdue.count++;
          timeline.overdue.amount += cheque.amount || 0;
        } else if (diffDays <= 7) {
          timeline.thisWeek.count++;
          timeline.thisWeek.amount += cheque.amount || 0;
        } else if (diffDays <= 30) {
          timeline.thisMonth.count++;
          timeline.thisMonth.amount += cheque.amount || 0;
        } else if (diffDays <= 60) {
          timeline.next30Days.count++;
          timeline.next30Days.amount += cheque.amount || 0;
        }
      });

    return [
      { label: 'Overdue', ...timeline.overdue, status: 'negative' as const },
      { label: 'This Week', ...timeline.thisWeek, status: 'warning' as const },
      { label: 'This Month', ...timeline.thisMonth, status: 'info' as const },
      { label: 'Next 30 Days', ...timeline.next30Days, status: 'neutral' as const },
    ];
  };

  if (isLoading && properties.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
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

      {/* Primary Metrics Panel */}
      <div className="bg-white border border-stone-200 rounded-lg">
        <div className="px-4 py-3 border-b border-stone-100">
          <h2 className="text-sm font-medium text-stone-700">Key Performance Indicators</h2>
        </div>
        <div className="px-4 py-2 grid grid-cols-6 divide-x divide-stone-100">
          <Metric label="Short-Term Revenue" value={Number(kpis?.total_revenue) || 0} />
          <Metric label="Annual Tenancy" value={Number(annualRevenue?.total_cleared) || 0} />
          <Metric label="Combined Revenue" value={getCombinedRevenue()} />
          <Metric label="Total Expenses" value={Number(kpis?.total_expenses) || 0} />
          <Metric label="Net Operating Income" value={getCombinedNOI()} />
          <div className="py-3 pl-4">
            <dt className="text-xs text-stone-500 uppercase tracking-wide">Occupancy</dt>
            <dd className="mt-1 text-xl font-semibold text-stone-900">
              {Math.round(Number(kpis?.occupancy_rate) || 0)}%
            </dd>
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
                <td className="px-4 py-2.5 text-sm text-stone-600">{cheque.cheque_number}</td>
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
    </div>
  );
}
