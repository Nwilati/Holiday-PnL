import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Plus,
  Banknote,
  AlertCircle,
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

interface ChannelData {
  channel_name: string;
  revenue: number;
  percentage: number;
  [key: string]: string | number;
}

interface UpcomingCheque {
  id: string;
  tenancy_id: string;
  tenant_name: string;
  cheque_number: string;
  bank_name: string;
  amount: number;
  due_date: string;
  days_until_due: number;
}

const CHANNEL_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b'];

export default function Dashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [channelMix, setChannelMix] = useState<ChannelData[]>([]);
  const [upcomingCheques, setUpcomingCheques] = useState<UpcomingCheque[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      loadDashboardData();
      loadUpcomingCheques();
    }
  }, [selectedProperty]);

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

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;

      const [kpiRes, trendRes, channelRes] = await Promise.all([
        api.getKPIs(selectedProperty, startDate, endDate),
        api.getRevenueTrend(selectedProperty, currentYear),
        api.getChannelMix(selectedProperty, startDate, endDate),
      ]);

      setKpis(kpiRes.data);
      setMonthlyData(trendRes.data || []);
      setChannelMix(channelRes.data || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUpcomingCheques = async () => {
    try {
      const response = await api.getUpcomingCheques({ property_id: selectedProperty, days: 30 });
      setUpcomingCheques(response.data.cheques || []);
    } catch (error) {
      console.error('Failed to load upcoming cheques:', error);
      setUpcomingCheques([]);
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
      label: 'Total Revenue',
      value: formatCurrency(kpis?.total_revenue || 0),
      icon: DollarSign,
      color: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
      trend: 12.5,
    },
    {
      label: 'Net Revenue',
      value: formatCurrency(kpis?.net_revenue || 0),
      icon: TrendingUp,
      color: 'bg-gradient-to-br from-blue-400 to-blue-600',
      trend: 8.3,
    },
    {
      label: 'Total Expenses',
      value: formatCurrency(kpis?.total_expenses || 0),
      icon: Wallet,
      color: 'bg-gradient-to-br from-rose-400 to-rose-600',
      trend: -3.2,
    },
    {
      label: 'NOI',
      value: formatCurrency(kpis?.noi || 0),
      icon: TrendingUp,
      color: 'bg-gradient-to-br from-purple-400 to-purple-600',
      trend: 15.7,
    },
    {
      label: 'Occupancy',
      value: `${Number(kpis?.occupancy_rate || 0).toFixed(1)}%`,
      icon: Calendar,
      color: 'bg-gradient-to-br from-amber-400 to-amber-600',
      trend: 5.2,
    },
    {
      label: 'ADR',
      value: formatCurrency(kpis?.adr || 0),
      icon: DollarSign,
      color: 'bg-gradient-to-br from-teal-400 to-teal-600',
      trend: 4.1,
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
              <div className={`flex items-center gap-1 text-xs font-medium ${kpi.trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {kpi.trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(kpi.trend)}%
              </div>
            </div>
            <p className="text-2xl font-bold text-stone-800">{kpi.value}</p>
            <p className="text-sm text-stone-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

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
                      {cheque.cheque_number} • {cheque.bank_name}
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

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <h2 className="text-lg font-bold text-stone-800 mb-6">Revenue Trend</h2>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="month" stroke="#78716c" fontSize={12} />
                <YAxis stroke="#78716c" fontSize={12} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value) || 0), 'Revenue']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4' }}
                />
                <Area
                  type="monotone"
                  dataKey="gross_revenue"
                  stroke="#f97316"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  name="Revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-stone-400">
              No revenue data for this period
            </div>
          )}
        </div>

        {/* Channel Mix Donut */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <h2 className="text-lg font-bold text-stone-800 mb-6">Channel Mix</h2>
          {channelMix.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={channelMix as any[]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="revenue"
                    nameKey="channel_name"
                  >
                    {channelMix.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value) || 0), 'Revenue']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
                {channelMix.map((channel, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: CHANNEL_COLORS[index % CHANNEL_COLORS.length] }}
                      />
                      <span className="text-sm text-stone-600">{channel.channel_name}</span>
                    </div>
                    <span className="text-sm font-medium text-stone-800">
                      {Number(channel.percentage || 0).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-stone-400">
              No booking data
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
