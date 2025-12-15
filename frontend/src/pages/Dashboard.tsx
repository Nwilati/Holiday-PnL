import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Percent,
  Home,
  CreditCard,
  PieChart,
  Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from 'recharts';
import KPICard from '../components/KPICard';
import { api } from '../api/client';

export default function Dashboard() {
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [kpis, setKpis] = useState<any>(null);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [channelMix, setChannelMix] = useState<any[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear}-12-31`;

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      loadDashboardData();
    }
  }, [selectedProperty]);

  const loadProperties = async () => {
    try {
      const response = await api.getProperties();
      setProperties(response.data);
      if (response.data.length > 0) {
        setSelectedProperty(response.data[0].id);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading properties:', error);
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [kpisRes, trendRes, channelRes, expenseRes] = await Promise.all([
        api.getKPIs(selectedProperty, startDate, endDate),
        api.getRevenueTrend(selectedProperty, currentYear),
        api.getChannelMix(selectedProperty, startDate, endDate),
        api.getExpenseBreakdown(selectedProperty, startDate, endDate),
      ]);
      setKpis(kpisRes.data);
      setRevenueTrend(trendRes.data);
      setChannelMix(channelRes.data);
      setExpenseBreakdown(expenseRes.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Properties Yet</h2>
        <p className="text-gray-500 mb-4">Add your first property to see the dashboard</p>
        <a href="/properties" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Add Property
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Year to date performance</p>
        </div>
        <select
          value={selectedProperty}
          onChange={(e) => setSelectedProperty(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Revenue"
            value={formatCurrency(kpis.total_revenue)}
            subtitle="Gross bookings"
            icon={DollarSign}
            color="green"
          />
          <KPICard
            title="Net Revenue"
            value={formatCurrency(kpis.net_revenue)}
            subtitle="After platform fees"
            icon={TrendingUp}
            color="blue"
          />
          <KPICard
            title="NOI"
            value={formatCurrency(kpis.noi)}
            subtitle="Net Operating Income"
            icon={Activity}
            color={kpis.noi >= 0 ? 'green' : 'red'}
          />
          <KPICard
            title="Occupancy"
            value={`${kpis.occupancy_rate}%`}
            subtitle={`${kpis.total_nights} nights booked`}
            icon={Calendar}
            color="purple"
          />
          <KPICard
            title="ADR"
            value={formatCurrency(kpis.adr)}
            subtitle="Avg Daily Rate"
            icon={CreditCard}
            color="blue"
          />
          <KPICard
            title="RevPAR"
            value={formatCurrency(kpis.revpar)}
            subtitle="Revenue per available night"
            icon={PieChart}
            color="yellow"
          />
          <KPICard
            title="Total Expenses"
            value={formatCurrency(kpis.total_expenses)}
            subtitle="Operating costs"
            icon={CreditCard}
            color="red"
          />
          <KPICard
            title="Expense Ratio"
            value={`${kpis.expense_ratio}%`}
            subtitle="Of net revenue"
            icon={Percent}
            color={kpis.expense_ratio <= 40 ? 'green' : 'red'}
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="net_revenue" fill="#3B82F6" name="Net Revenue" />
              <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Channel Mix */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Channel Mix</h3>
          {channelMix.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPie>
                <Pie
                  data={channelMix}
                  dataKey="revenue"
                  nameKey="channel_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ channel_name, percentage }) => `${channel_name} (${percentage}%)`}
                >
                  {channelMix.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.channel_color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </RechartsPie>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No booking data yet
            </div>
          )}
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
          {expenseBreakdown.length > 0 ? (
            <div className="space-y-3">
              {expenseBreakdown.slice(0, 10).map((expense, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-40 text-sm text-gray-600">{expense.category_name}</div>
                  <div className="flex-1 mx-4">
                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${expense.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-24 text-right text-sm font-medium">
                    {formatCurrency(expense.amount)}
                  </div>
                  <div className="w-16 text-right text-sm text-gray-500">
                    {expense.percentage}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500">
              No expense data yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
