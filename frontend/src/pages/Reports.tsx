import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { FileSpreadsheet, FileText, Download, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

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

interface MonthlyRevenue {
  month: string;
  gross_revenue: number;
  net_revenue: number;
  expenses: number;
  noi: number;
}

interface ExpenseBreakdown {
  category_name: string;
  amount: number;
  percentage: number;
}

interface ChannelPerformance {
  channel_name: string;
  bookings: number;
  nights: number;
  revenue: number;
  percentage: number;
}

export default function Reports() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenue[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseBreakdown[]>([]);
  const [channelMix, setChannelMix] = useState<ChannelPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [propertyName, setPropertyName] = useState('');

  const years = [2023, 2024, 2025, 2026];

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      loadReportData();
    }
  }, [selectedProperty, selectedYear]);

  const loadProperties = async () => {
    try {
      const response = await api.getProperties();
      setProperties(response.data);
      if (response.data.length > 0) {
        setSelectedProperty(response.data[0].id);
        setPropertyName(response.data[0].name);
      }
    } catch (error) {
      console.error('Failed to load properties:', error);
    }
  };

  const loadReportData = async () => {
    setIsLoading(true);
    const startDate = `${selectedYear}-01-01`;
    const endDate = `${selectedYear}-12-31`;

    const property = properties.find(p => p.id === selectedProperty);
    if (property) setPropertyName(property.name);

    try {
      const [kpiRes, trendRes, expenseRes, channelRes] = await Promise.all([
        api.getKPIs(selectedProperty, startDate, endDate),
        api.getRevenueTrend(selectedProperty, selectedYear),
        api.getExpenseBreakdown(selectedProperty, startDate, endDate),
        api.getChannelMix(selectedProperty, startDate, endDate),
      ]);

      setKpis(kpiRes.data);
      setMonthlyData(trendRes.data);
      setExpenseBreakdown(expenseRes.data);
      setChannelMix(channelRes.data);
    } catch (error) {
      console.error('Failed to load report data:', error);
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

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['P&L Report - ' + propertyName],
      ['Year: ' + selectedYear],
      ['Generated: ' + format(new Date(), 'MMM d, yyyy')],
      [],
      ['KEY PERFORMANCE INDICATORS'],
      ['Metric', 'Value'],
      ['Total Revenue', formatCurrency(kpis?.total_revenue || 0)],
      ['Net Revenue', formatCurrency(kpis?.net_revenue || 0)],
      ['Total Expenses', formatCurrency(kpis?.total_expenses || 0)],
      ['Net Operating Income', formatCurrency(kpis?.noi || 0)],
      ['Occupancy Rate', `${(kpis?.occupancy_rate || 0).toFixed(1)}%`],
      ['ADR', formatCurrency(kpis?.adr || 0)],
      ['RevPAR', formatCurrency(kpis?.revpar || 0)],
      ['Total Bookings', kpis?.total_bookings || 0],
      ['Total Nights', kpis?.total_nights || 0],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // Monthly P&L Sheet
    const monthlyHeaders = ['Month', 'Gross Revenue', 'Net Revenue', 'Expenses', 'NOI'];
    const monthlyRows = monthlyData.map(m => [
      m.month,
      m.gross_revenue,
      m.net_revenue,
      m.expenses,
      m.noi
    ]);
    const monthlySheet = XLSX.utils.aoa_to_sheet([monthlyHeaders, ...monthlyRows]);
    XLSX.utils.book_append_sheet(wb, monthlySheet, 'Monthly P&L');

    // Expense Breakdown Sheet
    const expenseHeaders = ['Category', 'Amount', 'Percentage'];
    const expenseRows = expenseBreakdown.map(e => [
      e.category_name,
      e.amount,
      `${e.percentage.toFixed(1)}%`
    ]);
    const expenseSheet = XLSX.utils.aoa_to_sheet([expenseHeaders, ...expenseRows]);
    XLSX.utils.book_append_sheet(wb, expenseSheet, 'Expenses');

    // Channel Performance Sheet
    const channelHeaders = ['Channel', 'Bookings', 'Nights', 'Revenue', 'Percentage'];
    const channelRows = channelMix.map(c => [
      c.channel_name,
      c.bookings,
      c.nights,
      c.revenue,
      `${c.percentage.toFixed(1)}%`
    ]);
    const channelSheet = XLSX.utils.aoa_to_sheet([channelHeaders, ...channelRows]);
    XLSX.utils.book_append_sheet(wb, channelSheet, 'Channel Mix');

    // Save file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `PnL_Report_${propertyName}_${selectedYear}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(20);
    doc.text('P&L Report', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(propertyName, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Year: ${selectedYear}`, pageWidth / 2, 35, { align: 'center' });
    doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy')}`, pageWidth / 2, 42, { align: 'center' });

    // KPIs Table
    doc.setFontSize(14);
    doc.text('Key Performance Indicators', 14, 55);

    autoTable(doc, {
      startY: 60,
      head: [['Metric', 'Value']],
      body: [
        ['Total Revenue', formatCurrency(kpis?.total_revenue || 0)],
        ['Net Revenue', formatCurrency(kpis?.net_revenue || 0)],
        ['Total Expenses', formatCurrency(kpis?.total_expenses || 0)],
        ['Net Operating Income', formatCurrency(kpis?.noi || 0)],
        ['Occupancy Rate', `${(kpis?.occupancy_rate || 0).toFixed(1)}%`],
        ['ADR', formatCurrency(kpis?.adr || 0)],
        ['RevPAR', formatCurrency(kpis?.revpar || 0)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Monthly P&L Table
    const finalY1 = (doc as any).lastAutoTable.finalY || 60;
    doc.setFontSize(14);
    doc.text('Monthly P&L', 14, finalY1 + 15);

    autoTable(doc, {
      startY: finalY1 + 20,
      head: [['Month', 'Gross Revenue', 'Net Revenue', 'Expenses', 'NOI']],
      body: monthlyData.map(m => [
        m.month,
        formatCurrency(m.gross_revenue),
        formatCurrency(m.net_revenue),
        formatCurrency(m.expenses),
        formatCurrency(m.noi)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
    });

    // New page for more tables
    doc.addPage();

    // Expense Breakdown
    doc.setFontSize(14);
    doc.text('Expense Breakdown', 14, 20);

    autoTable(doc, {
      startY: 25,
      head: [['Category', 'Amount', '%']],
      body: expenseBreakdown.map(e => [
        e.category_name,
        formatCurrency(e.amount),
        `${e.percentage.toFixed(1)}%`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Channel Mix
    const finalY2 = (doc as any).lastAutoTable.finalY || 25;
    doc.setFontSize(14);
    doc.text('Channel Performance', 14, finalY2 + 15);

    autoTable(doc, {
      startY: finalY2 + 20,
      head: [['Channel', 'Bookings', 'Nights', 'Revenue', '%']],
      body: channelMix.map(c => [
        c.channel_name,
        c.bookings,
        c.nights,
        formatCurrency(c.revenue),
        `${c.percentage.toFixed(1)}%`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Save
    doc.save(`PnL_Report_${propertyName}_${selectedYear}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* KPIs Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Key Performance Indicators</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(kpis?.total_revenue || 0)}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Net Revenue</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(kpis?.net_revenue || 0)}</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Expenses</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(kpis?.total_expenses || 0)}</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600">NOI</p>
            <p className="text-xl font-bold text-purple-600">{formatCurrency(kpis?.noi || 0)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Occupancy</p>
            <p className="text-xl font-bold text-gray-700">{(kpis?.occupancy_rate || 0).toFixed(1)}%</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">ADR</p>
            <p className="text-xl font-bold text-gray-700">{formatCurrency(kpis?.adr || 0)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">RevPAR</p>
            <p className="text-xl font-bold text-gray-700">{formatCurrency(kpis?.revpar || 0)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Bookings</p>
            <p className="text-xl font-bold text-gray-700">{kpis?.total_bookings || 0}</p>
          </div>
        </div>
      </div>

      {/* Monthly P&L Table */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Monthly P&L Statement</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Month</th>
                <th className="text-right py-3 px-4">Gross Revenue</th>
                <th className="text-right py-3 px-4">Net Revenue</th>
                <th className="text-right py-3 px-4">Expenses</th>
                <th className="text-right py-3 px-4">NOI</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((row, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{row.month}</td>
                  <td className="text-right py-3 px-4">{formatCurrency(row.gross_revenue)}</td>
                  <td className="text-right py-3 px-4">{formatCurrency(row.net_revenue)}</td>
                  <td className="text-right py-3 px-4 text-red-600">{formatCurrency(row.expenses)}</td>
                  <td className="text-right py-3 px-4 font-semibold">{formatCurrency(row.noi)}</td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold">
                <td className="py-3 px-4">TOTAL</td>
                <td className="text-right py-3 px-4">{formatCurrency(monthlyData.reduce((sum, m) => sum + m.gross_revenue, 0))}</td>
                <td className="text-right py-3 px-4">{formatCurrency(monthlyData.reduce((sum, m) => sum + m.net_revenue, 0))}</td>
                <td className="text-right py-3 px-4 text-red-600">{formatCurrency(monthlyData.reduce((sum, m) => sum + m.expenses, 0))}</td>
                <td className="text-right py-3 px-4">{formatCurrency(monthlyData.reduce((sum, m) => sum + m.noi, 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Expense Breakdown</h2>
          <div className="space-y-2">
            {expenseBreakdown.map((expense, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-700">{expense.category_name}</span>
                <div className="text-right">
                  <span className="font-medium">{formatCurrency(expense.amount)}</span>
                  <span className="text-gray-500 text-sm ml-2">({expense.percentage.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Channel Performance */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Channel Performance</h2>
          <div className="space-y-2">
            {channelMix.map((channel, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b">
                <div>
                  <span className="text-gray-700">{channel.channel_name}</span>
                  <span className="text-gray-500 text-sm ml-2">({channel.bookings} bookings)</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">{formatCurrency(channel.revenue)}</span>
                  <span className="text-gray-500 text-sm ml-2">({channel.percentage.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
