import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Wallet,
  Building2,
  Plus,
  Banknote,
  AlertCircle,
  Home,
} from 'lucide-react';
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

interface MonthlyData {
  month: string;
  gross_revenue: number;
  net_revenue: number;
  expenses: number;
  noi: number;
}

interface ChequeStatusData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface PropertyRevenueData {
  name: string;
  shortTerm: number;
  annual: number;
  total: number;
}

interface ChequeTimelineData {
  label: string;
  count: number;
  amount: number;
  color: string;
}

interface UpcomingCheque {
  id: string;
  tenancy_id: string;
  property_name: string;
  tenant_name: string;
  cheque_number: string;
  bank_name: string;
  amount: number;
  due_date: string;
  days_until_due: number;
}

interface AnnualRevenue {
  total_cleared: number;
  total_pending: number;
  total_contract_value: number;
  active_tenancies: number;
}

// Cheque status colors
const CHEQUE_STATUS_COLORS = {
  pending: '#f59e0b',   // amber
  deposited: '#3b82f6', // blue
  cleared: '#10b981',   // green
  bounced: '#ef4444',   // red
};

export default function Dashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [upcomingCheques, setUpcomingCheques] = useState<UpcomingCheque[]>([]);
  const [allCheques, setAllCheques] = useState<any[]>([]);
  const [annualRevenue, setAnnualRevenue] = useState<AnnualRevenue | null>(null);
  const [propertyRevenueData, setPropertyRevenueData] = useState<PropertyRevenueData[]>([]);
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
    if (!selectedProperty) {
      loadPropertyRevenueComparison();
    }
  }, [selectedProperty]);

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
    setIsLoading(true);
    try {
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;

      if (selectedProperty) {
        const [kpiRes, trendRes] = await Promise.all([
          api.getKPIs(selectedProperty, startDate, endDate),
          api.getRevenueTrend(selectedProperty, currentYear),
        ]);

        setKpis(kpiRes.data);
        setMonthlyData(trendRes.data || []);
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
            allKpis.total_revenue += data.total_revenue || 0;
            allKpis.net_revenue += data.net_revenue || 0;
            allKpis.total_expenses += data.total_expenses || 0;
            allKpis.noi += data.noi || 0;
            allKpis.total_bookings += data.total_bookings || 0;
            allKpis.total_nights += data.total_nights || 0;
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
        setMonthlyData([]);
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
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;
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

  const loadPropertyRevenueComparison = async () => {
    if (properties.length === 0) return;

    try {
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;
      const revenueData: PropertyRevenueData[] = [];

      for (const prop of properties) {
        try {
          const [kpiRes, annualRes] = await Promise.all([
            api.getKPIs(prop.id, startDate, endDate),
            api.getAnnualRevenue({ property_id: prop.id, start_date: startDate, end_date: endDate }),
          ]);

          const shortTerm = kpiRes.data.total_revenue || 0;
          const annual = annualRes.data.total_cleared || 0;

          revenueData.push({
            name: prop.name.length > 15 ? prop.name.substring(0, 15) + '...' : prop.name,
            shortTerm,
            annual,
            total: shortTerm + annual,
          });
        } catch (e) {
          console.error('Failed to load revenue for property:', prop.id);
        }
      }

      // Sort by total revenue descending
      revenueData.sort((a, b) => b.total - a.total);
      setPropertyRevenueData(revenueData);
    } catch (error) {
      console.error('Failed to load property revenue comparison:', error);
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
    });
  };

  const getChequeUrgencyColor = (daysUntilDue: number) => {
    if (daysUntilDue <= 3) return 'bg-red-100 text-red-700 border-red-200';
    if (daysUntilDue <= 7) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
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

  // Get cheque status breakdown for pie chart
  const getChequeStatusData = (): ChequeStatusData[] => {
    const statusCounts = {
      pending: 0,
      deposited: 0,
      cleared: 0,
      bounced: 0,
    };

    allCheques.forEach((cheque) => {
      const status = cheque.status as keyof typeof statusCounts;
      if (statusCounts[status] !== undefined) {
        statusCounts[status] += cheque.amount || 0;
      }
    });

    return [
      { name: 'Pending', value: statusCounts.pending, color: CHEQUE_STATUS_COLORS.pending },
      { name: 'Deposited', value: statusCounts.deposited, color: CHEQUE_STATUS_COLORS.deposited },
      { name: 'Cleared', value: statusCounts.cleared, color: CHEQUE_STATUS_COLORS.cleared },
      { name: 'Bounced', value: statusCounts.bounced, color: CHEQUE_STATUS_COLORS.bounced },
    ].filter((item) => item.value > 0);
  };

  // Get cheques due timeline data
  const getChequesTimelineData = (): ChequeTimelineData[] => {
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
      { label: 'Overdue', ...timeline.overdue, color: '#ef4444' },
      { label: 'This Week', ...timeline.thisWeek, color: '#f97316' },
      { label: 'This Month', ...timeline.thisMonth, color: '#f59e0b' },
      { label: 'Next 30 Days', ...timeline.next30Days, color: '#3b82f6' },
    ];
  };

  // Get combined monthly revenue data (short-term + annual cheques by cleared month)
  const getCombinedMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const combined: { month: string; shortTerm: number; annual: number }[] = months.map((m) => ({
      month: m,
      shortTerm: 0,
      annual: 0,
    }));

    // Add short-term revenue from monthlyData
    monthlyData.forEach((data) => {
      const monthIndex = months.findIndex((m) => data.month.startsWith(m));
      if (monthIndex >= 0) {
        combined[monthIndex].shortTerm = data.gross_revenue || 0;
      }
    });

    // Add annual tenancy cleared cheques by their cleared_date month
    allCheques
      .filter((cheque) => cheque.status === 'cleared' && cheque.cleared_date)
      .forEach((cheque) => {
        const clearedDate = new Date(cheque.cleared_date);
        if (clearedDate.getFullYear() === currentYear) {
          const monthIndex = clearedDate.getMonth();
          combined[monthIndex].annual += cheque.amount || 0;
        }
      });

    return combined;
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
          Add your first holiday home property to start tracking revenue and expenses.
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

  const kpiCards = [
    {
      label: 'Short-Term Revenue',
      value: formatCurrency(Number(kpis?.total_revenue) || 0),
      icon: DollarSign,
      color: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
    },
    {
      label: 'Annual Tenancy (Cleared)',
      value: formatCurrency(Number(annualRevenue?.total_cleared) || 0),
      icon: Home,
      color: 'bg-gradient-to-br from-blue-400 to-blue-600',
    },
    {
      label: 'Combined Revenue',
      value: formatCurrency(getCombinedRevenue()),
      icon: TrendingUp,
      color: 'bg-gradient-to-br from-purple-400 to-purple-600',
    },
    {
      label: 'Total Expenses',
      value: formatCurrency(Number(kpis?.total_expenses) || 0),
      icon: Wallet,
      color: 'bg-gradient-to-br from-rose-400 to-rose-600',
    },
    {
      label: 'Combined NOI',
      value: formatCurrency(getCombinedNOI()),
      icon: TrendingUp,
      color: 'bg-gradient-to-br from-teal-400 to-teal-600',
    },
    {
      label: 'Active Tenancies',
      value: String(Number(annualRevenue?.active_tenancies) || 0),
      icon: Calendar,
      color: 'bg-gradient-to-br from-amber-400 to-amber-600',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">Dashboard</h1>
          <p className="text-stone-500 mt-1">Overview of your property performance</p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 shadow-sm border border-stone-100">
          <Building2 className="w-5 h-5 text-stone-400" />
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="bg-transparent font-medium text-stone-700 focus:outline-none"
          >
            <option value="">All Properties</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {kpiCards.map((kpi, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${kpi.color}`}>
                <kpi.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-stone-800">{kpi.value}</p>
            <p className="text-sm text-stone-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Annual Tenancy Summary with Mini Pie Chart */}
      {annualRevenue && (annualRevenue.total_cleared > 0 || annualRevenue.total_pending > 0 || annualRevenue.active_tenancies > 0) && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-800">Annual Tenancy Summary</h2>
              <p className="text-sm text-stone-500">{currentYear} Year to Date</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            {/* Mini Pie Chart - Cleared vs Pending */}
            <div className="flex flex-col items-center justify-center">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Cleared', value: annualRevenue.total_cleared, color: '#10b981' },
                      { name: 'Pending', value: annualRevenue.total_pending, color: '#f59e0b' },
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <p className="text-sm font-medium text-stone-600 mt-1">
                {(() => {
                  const cleared = Number(annualRevenue.total_cleared) || 0;
                  const pending = Number(annualRevenue.total_pending) || 0;
                  const total = cleared + pending;
                  const collectedPercent = total > 0 ? (cleared / total) * 100 : 0;
                  return `${collectedPercent.toFixed(1)}% Collected`;
                })()}
              </p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl">
              <p className="text-sm text-emerald-600 font-medium">Cleared Cheques</p>
              <p className="text-xl font-bold text-emerald-700">{formatCurrency(Number(annualRevenue.total_cleared) || 0)}</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl">
              <p className="text-sm text-amber-600 font-medium">Pending Cheques</p>
              <p className="text-xl font-bold text-amber-700">{formatCurrency(Number(annualRevenue.total_pending) || 0)}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-600 font-medium">Total Contract Value</p>
              <p className="text-xl font-bold text-blue-700">{formatCurrency(Number(annualRevenue.total_contract_value) || 0)}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl">
              <p className="text-sm text-purple-600 font-medium">Active Tenancies</p>
              <p className="text-xl font-bold text-purple-700">{Number(annualRevenue.active_tenancies) || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Cheques Due Timeline Widget */}
      {allCheques.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-800">Cheques Due Timeline</h2>
              <p className="text-sm text-stone-500">Pending cheques by due date</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {getChequesTimelineData().map((item, index) => (
              <div
                key={index}
                className="p-4 rounded-xl border-2"
                style={{ borderColor: item.color, backgroundColor: `${item.color}10` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <p className="text-sm font-medium" style={{ color: item.color }}>{item.label}</p>
                </div>
                <p className="text-2xl font-bold text-stone-800">{item.count}</p>
                <p className="text-sm text-stone-500">{formatCurrency(item.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Cheques Widget */}
      {upcomingCheques.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
                <Banknote className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-800">Upcoming Cheques</h2>
                <p className="text-sm text-stone-500">Due within 30 days</p>
              </div>
            </div>
            <Link
              to="/tenancies"
              className="text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              View All →
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingCheques.slice(0, 5).map((cheque) => (
              <div
                key={cheque.id}
                className={`flex items-center justify-between p-4 rounded-xl border ${getChequeUrgencyColor(cheque.days_until_due)}`}
              >
                <div className="flex items-center gap-4">
                  <AlertCircle className="w-5 h-5" />
                  <div>
                    <p className="font-medium">{cheque.tenant_name}</p>
                    <p className="text-sm opacity-75">
                      {cheque.property_name} • {cheque.cheque_number} • {cheque.bank_name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(cheque.amount)}</p>
                  <p className="text-sm opacity-75">
                    {formatDate(cheque.due_date)} ({cheque.days_until_due}d)
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Grid - Property Revenue Comparison (All Properties) */}
      {!selectedProperty && propertyRevenueData.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 mb-8">
          <h2 className="text-lg font-bold text-stone-800 mb-6">Property Revenue Comparison</h2>
          <ResponsiveContainer width="100%" height={Math.max(300, propertyRevenueData.length * 50)}>
            <BarChart data={propertyRevenueData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis type="number" stroke="#78716c" fontSize={12} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" stroke="#78716c" fontSize={12} width={100} />
              <Tooltip
                formatter={(value, name) => [formatCurrency(Number(value) || 0), name === 'shortTerm' ? 'Short-Term' : 'Annual Tenancy']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4' }}
              />
              <Legend />
              <Bar dataKey="shortTerm" name="Short-Term" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
              <Bar dataKey="annual" name="Annual Tenancy" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Charts Grid - Single Property Selected */}
      {selectedProperty && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Combined Monthly Revenue Bar Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
            <h2 className="text-lg font-bold text-stone-800 mb-6">Combined Monthly Revenue</h2>
            {(() => {
              const combinedData = getCombinedMonthlyData();
              const hasData = combinedData.some(d => d.shortTerm > 0 || d.annual > 0);
              return hasData ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={combinedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis dataKey="month" stroke="#78716c" fontSize={12} />
                    <YAxis stroke="#78716c" fontSize={12} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value, name) => [formatCurrency(Number(value) || 0), name === 'shortTerm' ? 'Short-Term' : 'Annual Tenancy']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4' }}
                    />
                    <Legend />
                    <Bar dataKey="shortTerm" name="Short-Term" stackId="a" fill="#f97316" />
                    <Bar dataKey="annual" name="Annual Tenancy" stackId="a" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-stone-400">
                  No revenue data for this period
                </div>
              );
            })()}
          </div>

          {/* Cheque Status Pie Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
            <h2 className="text-lg font-bold text-stone-800 mb-6">Cheque Status</h2>
            {(() => {
              const chequeStatusData = getChequeStatusData();
              return chequeStatusData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={chequeStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                      >
                        {chequeStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [formatCurrency(Number(value) || 0), 'Amount']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-4">
                    {chequeStatusData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm text-stone-600">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium text-stone-800">
                          {formatCurrency(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-stone-400">
                  No cheque data
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Cheque Status Pie Chart - All Properties view */}
      {!selectedProperty && allCheques.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
            <h2 className="text-lg font-bold text-stone-800 mb-6">Overall Cheque Status</h2>
            {(() => {
              const chequeStatusData = getChequeStatusData();
              return chequeStatusData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={chequeStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                      >
                        {chequeStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [formatCurrency(Number(value) || 0), 'Amount']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-4">
                    {chequeStatusData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm text-stone-600">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium text-stone-800">
                          {formatCurrency(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-stone-400">
                  No cheque data
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
