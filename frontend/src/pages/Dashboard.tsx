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
  FileText,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, UpcomingCheque } from '../api/client';

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
  bookings: number;
}

const CHANNEL_COLORS: Record<string, string> = {
  'Airbnb': '#FF5A5F',
  'Booking.com': '#003580',
  'VRBO': '#3D5A80',
  'Direct': '#5C8A5C',
  'Expedia': '#FFD700',
  'Other': '#78716C',
};

export default function Dashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [channelMix, setChannelMix] = useState<ChannelData[]>([]);
  const [upcomingCheques, setUpcomingCheques] = useState<UpcomingCheque[]>([]);
  const [chequesTotalAmount, setChequesTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const init = async () => {
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
    init();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      loadDashboardData();
    }
  }, [selectedProperty]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    const startDate = `${currentYear}-01-01`;
    const endDate = `${currentYear}-12-31`;

    try {
      const [kpiRes, trendRes, channelRes, chequesRes] = await Promise.all([
        api.getKPIs(selectedProperty, startDate, endDate),
        api.getRevenueTrend(selectedProperty, currentYear),
        api.getChannelMix(selectedProperty, startDate, endDate),
        api.getUpcomingCheques({ property_id: selectedProperty, days: 30 }),
      ]);

      setKpis(kpiRes.data);
      setMonthlyData(trendRes.data);
      setChannelMix(channelRes.data);
      setUpcomingCheques(chequesRes.data.cheques || []);
      setChequesTotalAmount(chequesRes.data.total_amount || 0);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getChannelColor = (channelName: string) => {
    return CHANNEL_COLORS[channelName] || CHANNEL_COLORS['Other'];
  };

  const getChequeUrgencyColor = (daysUntilDue: number) => {
    if (daysUntilDue <= 3) return 'text-red-600 bg-red-50';
    if (daysUntilDue <= 7) return 'text-orange-600 bg-orange-50';
    return 'text-emerald-600 bg-emerald-50';
  };

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
          Add a property first to view your dashboard analytics.
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
          <h1 className="text-3xl font-bold text-stone-800">Dashboard</h1>
          <p className="text-stone-500 mt-1">Welcome back! Here's your property overview.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-4 py-2.5">
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
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(kpis?.total_revenue || 0)}
          change="12.5%"
          changeType="up"
          icon={DollarSign}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <KPICard
          title="Net Income"
          value={formatCurrency(kpis?.noi || 0)}
          change="8.2%"
          changeType="up"
          icon={TrendingUp}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <KPICard
          title="Total Expenses"
          value={formatCurrency(kpis?.total_expenses || 0)}
          change="3.1%"
          changeType="down"
          icon={Wallet}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
        />
        <KPICard
          title="Occupancy Rate"
          value={`${Number(kpis?.occupancy_rate || 0).toFixed(1)}%`}
          change="5.3%"
          changeType="up"
          icon={Calendar}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-stone-800 text-lg">Revenue Overview</h3>
              <p className="text-stone-500 text-sm">Monthly revenue and expenses</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-sm text-stone-600">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                <span className="text-sm text-stone-600">Expenses</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e5e5', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                formatter={(value) => formatCurrency(Number(value))}
              />
              <Area type="monotone" dataKey="gross_revenue" stroke="#10b981" strokeWidth={2} fill="url(#colorRevenue)" name="Revenue" />
              <Area type="monotone" dataKey="expenses" stroke="#f97316" strokeWidth={2} fill="url(#colorExpenses)" name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Channel Mix */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <div className="mb-6">
            <h3 className="font-bold text-stone-800 text-lg">Channel Mix</h3>
            <p className="text-stone-500 text-sm">Revenue by booking source</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={channelMix.map(c => ({ name: c.channel_name, value: c.percentage }))}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
              >
                {channelMix.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={getChannelColor(channelMix[index]?.channel_name || '')} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {channelMix.map((item) => (
              <div key={item.channel_name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getChannelColor(item.channel_name) }}></div>
                <span className="text-sm text-stone-600 truncate">{item.channel_name}</span>
                <span className="text-sm font-medium text-stone-800 ml-auto">{Number(item.percentage || 0).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Cheques Widget */}
      {upcomingCheques.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-stone-800 text-lg">Upcoming Cheques</h3>
                <p className="text-stone-500 text-sm">Due within the next 30 days</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-stone-800">{formatCurrency(chequesTotalAmount)}</p>
              <p className="text-sm text-stone-500">{upcomingCheques.length} cheque{upcomingCheques.length !== 1 ? 's' : ''} pending</p>
            </div>
          </div>

          <div className="space-y-3">
            {upcomingCheques.slice(0, 5).map((cheque) => (
              <div
                key={cheque.id}
                className="flex items-center justify-between p-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getChequeUrgencyColor(cheque.days_until_due)}`}>
                    {cheque.days_until_due <= 3 ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : cheque.days_until_due <= 7 ? (
                      <Clock className="w-5 h-5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-stone-800">{cheque.tenant_name}</p>
                    <p className="text-sm text-stone-500">
                      {cheque.cheque_number} • {cheque.bank_name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-stone-800">{formatCurrency(cheque.amount)}</p>
                  <p className={`text-sm font-medium ${
                    cheque.days_until_due <= 3 ? 'text-red-600' :
                    cheque.days_until_due <= 7 ? 'text-orange-600' : 'text-stone-500'
                  }`}>
                    {cheque.days_until_due === 0 ? 'Due today' :
                     cheque.days_until_due === 1 ? 'Due tomorrow' :
                     `Due in ${cheque.days_until_due} days`}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {upcomingCheques.length > 5 && (
            <Link
              to="/tenancies"
              className="mt-4 flex items-center justify-center gap-2 w-full py-3 text-orange-600 font-medium hover:bg-orange-50 rounded-xl transition-colors"
            >
              View all {upcomingCheques.length} cheques
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}

      {/* Bottom Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="ADR" value={formatCurrency(kpis?.adr || 0)} subtitle="Average Daily Rate" />
        <StatCard title="RevPAR" value={formatCurrency(kpis?.revpar || 0)} subtitle="Revenue Per Available Room" />
        <StatCard title="Total Bookings" value={kpis?.total_bookings?.toString() || '0'} subtitle={`${kpis?.total_nights || 0} nights`} />
      </div>
    </div>
  );
}

// KPI Card Component
interface KPICardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'up' | 'down';
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

function KPICard({ title, value, change, changeType, icon: Icon, iconBg, iconColor }: KPICardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-stone-500 text-sm font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-stone-800">{value}</p>
          <div className={`flex items-center gap-1 mt-2 text-sm ${changeType === 'up' ? 'text-emerald-600' : 'text-rose-500'}`}>
            {changeType === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span className="font-medium">{change}</span>
            <span className="text-stone-400">vs last month</span>
          </div>
        </div>
        <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
}

function StatCard({ title, value, subtitle }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
      <p className="text-stone-500 text-sm font-medium mb-1">{title}</p>
      <p className="text-2xl font-bold text-stone-800">{value}</p>
      <p className="text-stone-400 text-sm mt-1">{subtitle}</p>
    </div>
  );
}
