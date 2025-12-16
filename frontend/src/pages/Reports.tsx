import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { FileSpreadsheet, FileText } from 'lucide-react';
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

// Helper to safely convert to number
const toNum = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

const months = [
  { value: 0, label: 'Full Year' },
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export default function Reports() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = full year
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenue[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseBreakdown[]>([]);
  const [channelMix, setChannelMix] = useState<ChannelPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [propertyName, setPropertyName] = useState('');
  const [reportType, setReportType] = useState<'full' | 'expenses' | 'revenue'>('full');

  const years = [2023, 2024, 2025, 2026, 2027];

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      loadReportData();
    }
  }, [selectedProperty, selectedYear, selectedMonth]);

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

  const getDateRange = () => {
    if (selectedMonth === 0) {
      // Full year
      return {
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear}-12-31`
      };
    } else {
      // Specific month
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const monthStr = selectedMonth.toString().padStart(2, '0');
      return {
        startDate: `${selectedYear}-${monthStr}-01`,
        endDate: `${selectedYear}-${monthStr}-${lastDay}`
      };
    }
  };

  const getReportPeriodLabel = () => {
    if (selectedMonth === 0) {
      return `Year ${selectedYear}`;
    } else {
      return `${months[selectedMonth].label} ${selectedYear}`;
    }
  };

  const loadReportData = async () => {
    setIsLoading(true);
    const { startDate, endDate } = getDateRange();

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

      // Filter monthly data if specific month selected
      let monthData = trendRes.data || [];
      if (selectedMonth !== 0) {
        const monthName = months[selectedMonth].label.substring(0, 3);
        monthData = monthData.filter((m: MonthlyRevenue) => m.month === monthName);
      }
      setMonthlyData(monthData);

      setExpenseBreakdown(expenseRes.data || []);
      setChannelMix(channelRes.data || []);
    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: any) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(toNum(value));
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const periodLabel = getReportPeriodLabel();

    // Summary Sheet (for full and revenue reports)
    if (reportType === 'full' || reportType === 'revenue') {
      const summaryData = [
        ['P&L Report - ' + propertyName],
        ['Period: ' + periodLabel],
        ['Generated: ' + format(new Date(), 'MMM d, yyyy')],
        [],
        ['KEY PERFORMANCE INDICATORS'],
        ['Metric', 'Value'],
        ['Total Revenue', formatCurrency(kpis?.total_revenue)],
        ['Net Revenue', formatCurrency(kpis?.net_revenue)],
        ['Total Expenses', formatCurrency(kpis?.total_expenses)],
        ['Net Operating Income', formatCurrency(kpis?.noi)],
        ['Occupancy Rate', `${toNum(kpis?.occupancy_rate).toFixed(1)}%`],
        ['ADR', formatCurrency(kpis?.adr)],
        ['RevPAR', formatCurrency(kpis?.revpar)],
        ['Total Bookings', kpis?.total_bookings || 0],
        ['Total Nights', kpis?.total_nights || 0],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    }

    // Monthly P&L Sheet (only for full report)
    if (reportType === 'full') {
      const monthlyHeaders = ['Month', 'Gross Revenue', 'Net Revenue', 'Expenses', 'NOI'];
      const monthlyRows = monthlyData.map(m => [
        m.month,
        toNum(m.gross_revenue),
        toNum(m.net_revenue),
        toNum(m.expenses),
        toNum(m.noi)
      ]);
      const monthlySheet = XLSX.utils.aoa_to_sheet([monthlyHeaders, ...monthlyRows]);
      XLSX.utils.book_append_sheet(wb, monthlySheet, selectedMonth === 0 ? 'Monthly P&L' : 'P&L');
    }

    // Expense Breakdown Sheet (for full and expenses reports)
    if (reportType === 'full' || reportType === 'expenses') {
      const expenseHeaders = ['Category', 'Amount', 'Percentage'];
      const expenseRows = expenseBreakdown.map(e => [
        e.category_name,
        toNum(e.amount),
        `${toNum(e.percentage).toFixed(1)}%`
      ]);
      const expenseSheet = XLSX.utils.aoa_to_sheet([expenseHeaders, ...expenseRows]);
      XLSX.utils.book_append_sheet(wb, expenseSheet, 'Expenses');
    }

    // Channel Performance Sheet (for full and revenue reports)
    if (reportType === 'full' || reportType === 'revenue') {
      const channelHeaders = ['Channel', 'Bookings', 'Nights', 'Revenue', 'Percentage'];
      const channelRows = channelMix.map(c => [
        c.channel_name,
        c.bookings,
        c.nights,
        toNum(c.revenue),
        `${toNum(c.percentage).toFixed(1)}%`
      ]);
      const channelSheet = XLSX.utils.aoa_to_sheet([channelHeaders, ...channelRows]);
      XLSX.utils.book_append_sheet(wb, channelSheet, 'Channel Mix');
    }

    // Save file
    const reportTypeLabel = reportType === 'full' ? 'PnL' : reportType === 'expenses' ? 'Expenses' : 'Revenue';
    const fileName = selectedMonth === 0
      ? `${reportTypeLabel}_Report_${propertyName}_${selectedYear}.xlsx`
      : `${reportTypeLabel}_Report_${propertyName}_${months[selectedMonth].label}_${selectedYear}.xlsx`;

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, fileName);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const periodLabel = getReportPeriodLabel();

    // Title
    doc.setFontSize(20);
    doc.text('P&L Report', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(propertyName, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Period: ${periodLabel}`, pageWidth / 2, 35, { align: 'center' });
    doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy')}`, pageWidth / 2, 42, { align: 'center' });

    // KPIs Table
    doc.setFontSize(14);
    doc.text('Key Performance Indicators', 14, 55);

    autoTable(doc, {
      startY: 60,
      head: [['Metric', 'Value']],
      body: [
        ['Total Revenue', formatCurrency(kpis?.total_revenue)],
        ['Net Revenue', formatCurrency(kpis?.net_revenue)],
        ['Total Expenses', formatCurrency(kpis?.total_expenses)],
        ['Net Operating Income', formatCurrency(kpis?.noi)],
        ['Occupancy Rate', `${toNum(kpis?.occupancy_rate).toFixed(1)}%`],
        ['ADR', formatCurrency(kpis?.adr)],
        ['RevPAR', formatCurrency(kpis?.revpar)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Monthly P&L Table
    const finalY1 = (doc as any).lastAutoTable.finalY || 60;
    doc.setFontSize(14);
    doc.text(selectedMonth === 0 ? 'Monthly P&L' : 'P&L Details', 14, finalY1 + 15);

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
        `${toNum(e.percentage).toFixed(1)}%`
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
        `${toNum(c.percentage).toFixed(1)}%`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Save
    const fileName = selectedMonth === 0
      ? `PnL_Report_${propertyName}_${selectedYear}.pdf`
      : `PnL_Report_${propertyName}_${months[selectedMonth].label}_${selectedYear}.pdf`;

    doc.save(fileName);
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
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as 'full' | 'expenses' | 'revenue')}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="full">Full P&L Report</option>
            <option value="expenses">Expenses Only</option>
            <option value="revenue">Revenue Only</option>
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

      {/* Period Badge */}
      <div className="mb-4">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
          {getReportPeriodLabel()}
        </span>
      </div>

      {/* KPIs Summary */}
      {(reportType === 'full' || reportType === 'revenue') && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Key Performance Indicators</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(kpis?.total_revenue)}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Net Revenue</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(kpis?.net_revenue)}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(kpis?.total_expenses)}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">NOI</p>
              <p className="text-xl font-bold text-purple-600">{formatCurrency(kpis?.noi)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Occupancy</p>
              <p className="text-xl font-bold text-gray-700">{toNum(kpis?.occupancy_rate).toFixed(1)}%</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">ADR</p>
              <p className="text-xl font-bold text-gray-700">{formatCurrency(kpis?.adr)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">RevPAR</p>
              <p className="text-xl font-bold text-gray-700">{formatCurrency(kpis?.revpar)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Bookings</p>
              <p className="text-xl font-bold text-gray-700">{kpis?.total_bookings || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Monthly P&L Table */}
      {reportType === 'full' && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {selectedMonth === 0 ? 'Monthly P&L Statement' : 'P&L Statement'}
          </h2>
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
                {monthlyData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No data for this period
                    </td>
                  </tr>
                ) : (
                  <>
                    {monthlyData.map((row, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{row.month}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(row.gross_revenue)}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(row.net_revenue)}</td>
                        <td className="text-right py-3 px-4 text-red-600">{formatCurrency(row.expenses)}</td>
                        <td className="text-right py-3 px-4 font-semibold">{formatCurrency(row.noi)}</td>
                      </tr>
                    ))}
                    {monthlyData.length > 1 && (
                      <tr className="bg-gray-100 font-bold">
                        <td className="py-3 px-4">TOTAL</td>
                        <td className="text-right py-3 px-4">{formatCurrency(monthlyData.reduce((sum, m) => sum + toNum(m.gross_revenue), 0))}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(monthlyData.reduce((sum, m) => sum + toNum(m.net_revenue), 0))}</td>
                        <td className="text-right py-3 px-4 text-red-600">{formatCurrency(monthlyData.reduce((sum, m) => sum + toNum(m.expenses), 0))}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(monthlyData.reduce((sum, m) => sum + toNum(m.noi), 0))}</td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        {(reportType === 'full' || reportType === 'expenses') && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Expense Breakdown</h2>
            <div className="space-y-2">
              {expenseBreakdown.length === 0 ? (
                <p className="text-gray-500">No expenses for this period</p>
              ) : (
                expenseBreakdown.map((expense, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-700">{expense.category_name}</span>
                    <div className="text-right">
                      <span className="font-medium">{formatCurrency(expense.amount)}</span>
                      <span className="text-gray-500 text-sm ml-2">({toNum(expense.percentage).toFixed(1)}%)</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Channel Performance */}
        {(reportType === 'full' || reportType === 'revenue') && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Channel Performance</h2>
            <div className="space-y-2">
              {channelMix.length === 0 ? (
                <p className="text-gray-500">No bookings for this period</p>
              ) : (
                channelMix.map((channel, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b">
                    <div>
                      <span className="text-gray-700">{channel.channel_name}</span>
                      <span className="text-gray-500 text-sm ml-2">({channel.bookings} bookings)</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{formatCurrency(channel.revenue)}</span>
                      <span className="text-gray-500 text-sm ml-2">({toNum(channel.percentage).toFixed(1)}%)</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
