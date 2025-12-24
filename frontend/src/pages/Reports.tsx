import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { FileSpreadsheet, FileText, Plus, Building2 } from 'lucide-react';
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

interface AnnualRevenue {
  total_cleared: number;
  total_pending: number;
  total_contract_value: number;
  active_tenancies: number;
}

interface DetailedExpense {
  id: string;
  date: string;
  vendor: string;
  category: string;
  description: string;
  amount: number;
  vat: number;
  total: number;
  is_paid: boolean;
  payment_method: string;
  receipt_url: string;
}

interface ExpenseReportSummary {
  total_expenses: number;
  total_paid: number;
  total_unpaid: number;
  expense_count: number;
  paid_count: number;
  unpaid_count: number;
}

interface CategoryBreakdownDetailed {
  category: string;
  total: number;
  paid: number;
  unpaid: number;
  count: number;
  percentage: number;
}

interface DetailedExpenseReport {
  summary: ExpenseReportSummary;
  category_breakdown: CategoryBreakdownDetailed[];
  expenses: DetailedExpense[];
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
  const [annualRevenue, setAnnualRevenue] = useState<AnnualRevenue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [propertyName, setPropertyName] = useState('');
  const [reportType, setReportType] = useState<'full' | 'expenses' | 'revenue' | 'tenancy'>('full');
  const [detailedExpenseReport, setDetailedExpenseReport] = useState<DetailedExpenseReport | null>(null);
  const [expenseFilter, setExpenseFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

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
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Failed to load properties:', error);
      setIsLoading(false);
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
      const [kpiRes, trendRes, expenseRes, channelRes, annualRes, detailedExpenseRes] = await Promise.all([
        api.getKPIs(selectedProperty, startDate, endDate),
        api.getRevenueTrend(selectedProperty, selectedYear),
        api.getExpenseBreakdown(selectedProperty, startDate, endDate),
        api.getChannelMix(selectedProperty, startDate, endDate),
        api.getAnnualRevenue({ property_id: selectedProperty, start_date: startDate, end_date: endDate }).catch(() => ({ data: null })),
        api.getDetailedExpenseReport(selectedProperty, startDate, endDate).catch(() => ({ data: null })),
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
      setAnnualRevenue(annualRes.data);
      setDetailedExpenseReport(detailedExpenseRes.data);
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

  // Calculate combined totals
  const getCombinedRevenue = () => {
    const shortTerm = toNum(kpis?.total_revenue);
    const annual = toNum(annualRevenue?.total_cleared);
    return shortTerm + annual;
  };

  const getCombinedNOI = () => {
    const shortTermNOI = toNum(kpis?.noi);
    const annualCleared = toNum(annualRevenue?.total_cleared);
    return shortTermNOI + annualCleared;
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const periodLabel = getReportPeriodLabel();

    if (reportType === 'tenancy') {
      // Tenancy Only Report
      const summaryData = [
        ['Annual Tenancy Report - ' + propertyName],
        ['Period: ' + periodLabel],
        ['Generated: ' + format(new Date(), 'MMM d, yyyy')],
        [],
        ['TENANCY REVENUE'],
        ['Metric', 'Value'],
        ['Cleared Cheques', formatCurrency(annualRevenue?.total_cleared)],
        ['Pending Cheques', formatCurrency(annualRevenue?.total_pending)],
        ['Total Contract Value', formatCurrency(annualRevenue?.total_contract_value)],
        ['Active Tenancies', annualRevenue?.active_tenancies || 0],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

      saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]),
        `Tenancy_Report_${propertyName}_${selectedYear}.xlsx`);
      return;
    }

    if (reportType === 'expenses') {
      // Detailed Expenses Excel Report
      const summaryData = [
        ['Expense Report - ' + propertyName],
        ['Period: ' + periodLabel],
        ['Generated: ' + format(new Date(), 'MMM d, yyyy')],
        [],
        ['SUMMARY'],
        ['Total Expenses', formatCurrency(detailedExpenseReport?.summary?.total_expenses)],
        ['Total Paid', formatCurrency(detailedExpenseReport?.summary?.total_paid)],
        ['Outstanding', formatCurrency(detailedExpenseReport?.summary?.total_unpaid)],
        ['Expense Count', detailedExpenseReport?.summary?.expense_count || 0],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

      // Category Breakdown Sheet
      const categoryHeaders = ['Category', 'Total', 'Paid', 'Unpaid', 'Count', '%'];
      const categoryRows = (detailedExpenseReport?.category_breakdown || []).map(c => [
        c.category,
        c.total,
        c.paid,
        c.unpaid,
        c.count,
        `${c.percentage}%`
      ]);
      const categorySheet = XLSX.utils.aoa_to_sheet([categoryHeaders, ...categoryRows]);
      XLSX.utils.book_append_sheet(wb, categorySheet, 'By Category');

      // Detailed Expenses Sheet
      const detailHeaders = ['Date', 'Vendor', 'Category', 'Description', 'Amount', 'VAT', 'Total', 'Paid', 'Payment Method'];
      const detailRows = (detailedExpenseReport?.expenses || []).map(e => [
        e.date,
        e.vendor,
        e.category,
        e.description,
        e.amount,
        e.vat,
        e.total,
        e.is_paid ? 'Yes' : 'No',
        e.payment_method || '-'
      ]);
      const detailSheet = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
      XLSX.utils.book_append_sheet(wb, detailSheet, 'All Expenses');

      // Unpaid Expenses Sheet
      const unpaidExpenses = (detailedExpenseReport?.expenses || []).filter(e => !e.is_paid);
      if (unpaidExpenses.length > 0) {
        const unpaidRows = unpaidExpenses.map(e => [
          e.date,
          e.vendor,
          e.category,
          e.description,
          e.amount,
          e.vat,
          e.total
        ]);
        const unpaidSheet = XLSX.utils.aoa_to_sheet([
          ['UNPAID EXPENSES'],
          [],
          ['Date', 'Vendor', 'Category', 'Description', 'Amount', 'VAT', 'Total'],
          ...unpaidRows
        ]);
        XLSX.utils.book_append_sheet(wb, unpaidSheet, 'Unpaid');
      }

      saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]),
        `Expense_Report_${propertyName}_${periodLabel.replace(' ', '_')}.xlsx`);
      return;
    }

    if (reportType === 'revenue') {
      // Revenue Only Report
      const summaryData = [
        ['Revenue Report - ' + propertyName],
        ['Period: ' + periodLabel],
        ['Generated: ' + format(new Date(), 'MMM d, yyyy')],
        [],
        ['SHORT-TERM REVENUE'],
        ['Total Revenue', formatCurrency(kpis?.total_revenue)],
        ['Net Revenue', formatCurrency(kpis?.net_revenue)],
        ['Total Bookings', kpis?.total_bookings || 0],
        ['Total Nights', kpis?.total_nights || 0],
        ['Occupancy Rate', `${toNum(kpis?.occupancy_rate).toFixed(1)}%`],
        ['ADR', formatCurrency(kpis?.adr)],
        ['RevPAR', formatCurrency(kpis?.revpar)],
        [],
        ['ANNUAL TENANCY REVENUE'],
        ['Cleared Cheques', formatCurrency(annualRevenue?.total_cleared)],
        ['Pending Cheques', formatCurrency(annualRevenue?.total_pending)],
        [],
        ['COMBINED TOTAL'],
        ['Total Revenue', formatCurrency(getCombinedRevenue())],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

      // Channel Performance Sheet
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

      saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]),
        `Revenue_Report_${propertyName}_${selectedYear}.xlsx`);
      return;
    }

    // Full P&L Report
    const summaryData = [
      ['P&L Report - ' + propertyName],
      ['Period: ' + periodLabel],
      ['Generated: ' + format(new Date(), 'MMM d, yyyy')],
      [],
      ['KEY PERFORMANCE INDICATORS'],
      ['Metric', 'Value'],
      ['Short-Term Revenue', formatCurrency(kpis?.total_revenue)],
      ['Annual Tenancy Revenue', formatCurrency(annualRevenue?.total_cleared)],
      ['Combined Revenue', formatCurrency(getCombinedRevenue())],
      ['Net Revenue (Short-Term)', formatCurrency(kpis?.net_revenue)],
      ['Total Expenses', formatCurrency(kpis?.total_expenses)],
      ['Net Operating Income', formatCurrency(kpis?.noi)],
      ['Combined NOI', formatCurrency(getCombinedNOI())],
      ['Occupancy Rate', `${toNum(kpis?.occupancy_rate).toFixed(1)}%`],
      ['ADR', formatCurrency(kpis?.adr)],
      ['RevPAR', formatCurrency(kpis?.revpar)],
      ['Total Bookings', kpis?.total_bookings || 0],
      ['Total Nights', kpis?.total_nights || 0],
      ['Active Tenancies', annualRevenue?.active_tenancies || 0],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    const monthlyHeaders = ['Month', 'Gross Revenue', 'Net Revenue', 'Expenses', 'NOI'];
    const monthlyRows = monthlyData.map(m => [m.month, toNum(m.gross_revenue), toNum(m.net_revenue), toNum(m.expenses), toNum(m.noi)]);
    const monthlySheet = XLSX.utils.aoa_to_sheet([monthlyHeaders, ...monthlyRows]);
    XLSX.utils.book_append_sheet(wb, monthlySheet, 'Monthly P&L');

    const expenseHeaders = ['Category', 'Amount', 'Percentage'];
    const expenseRows = expenseBreakdown.map(e => [e.category_name, toNum(e.amount), `${toNum(e.percentage).toFixed(1)}%`]);
    const expenseSheet = XLSX.utils.aoa_to_sheet([expenseHeaders, ...expenseRows]);
    XLSX.utils.book_append_sheet(wb, expenseSheet, 'Expenses');

    const channelHeaders = ['Channel', 'Bookings', 'Nights', 'Revenue', 'Percentage'];
    const channelRows = channelMix.map(c => [c.channel_name, c.bookings, c.nights, toNum(c.revenue), `${toNum(c.percentage).toFixed(1)}%`]);
    const channelSheet = XLSX.utils.aoa_to_sheet([channelHeaders, ...channelRows]);
    XLSX.utils.book_append_sheet(wb, channelSheet, 'Channel Mix');

    // Tenancy Sheet
    const tenancyData = [
      ['ANNUAL TENANCY SUMMARY'],
      ['Metric', 'Value'],
      ['Cleared Cheques', toNum(annualRevenue?.total_cleared)],
      ['Pending Cheques', toNum(annualRevenue?.total_pending)],
      ['Total Contract Value', toNum(annualRevenue?.total_contract_value)],
      ['Active Tenancies', annualRevenue?.active_tenancies || 0],
    ];
    const tenancySheet = XLSX.utils.aoa_to_sheet(tenancyData);
    XLSX.utils.book_append_sheet(wb, tenancySheet, 'Tenancy Revenue');

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([excelBuffer]), `PnL_Report_${propertyName}_${selectedYear}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const periodLabel = getReportPeriodLabel();

    if (reportType === 'tenancy') {
      // Tenancy Only PDF
      doc.setFontSize(20);
      doc.text('Annual Tenancy Report', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.text(propertyName, pageWidth / 2, 28, { align: 'center' });
      doc.text(`Period: ${periodLabel}`, pageWidth / 2, 35, { align: 'center' });
      doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy')}`, pageWidth / 2, 42, { align: 'center' });

      doc.setFontSize(14);
      doc.text('Tenancy Revenue Summary', 14, 55);

      autoTable(doc, {
        startY: 60,
        head: [['Metric', 'Value']],
        body: [
          ['Cleared Cheques', formatCurrency(annualRevenue?.total_cleared)],
          ['Pending Cheques', formatCurrency(annualRevenue?.total_pending)],
          ['Total Contract Value', formatCurrency(annualRevenue?.total_contract_value)],
          ['Active Tenancies', annualRevenue?.active_tenancies || 0],
        ],
        theme: 'striped',
        headStyles: { fillColor: [2, 132, 199] },
      });

      doc.save(`Tenancy_Report_${propertyName}_${selectedYear}.pdf`);
      return;
    }

    if (reportType === 'expenses') {
      // Detailed Expenses PDF
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Expense Report', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(propertyName, pageWidth / 2, 28, { align: 'center' });
      doc.text(`Period: ${periodLabel}`, pageWidth / 2, 35, { align: 'center' });
      doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy')}`, pageWidth / 2, 42, { align: 'center' });

      // Summary Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', 14, 55);

      const summaryData = detailedExpenseReport?.summary;
      autoTable(doc, {
        startY: 60,
        head: [['Total Expenses', 'Total Paid', 'Outstanding', 'Expense Count']],
        body: [[
          formatCurrency(summaryData?.total_expenses),
          formatCurrency(summaryData?.total_paid),
          formatCurrency(summaryData?.total_unpaid),
          `${summaryData?.expense_count || 0} items`
        ]],
        theme: 'grid',
        headStyles: { fillColor: [185, 28, 28], textColor: 255 },
        styles: { halign: 'center' }
      });

      // Category Breakdown
      let yPos = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.text('Expense Breakdown by Category', 14, yPos);

      const categoryData = detailedExpenseReport?.category_breakdown || [];
      autoTable(doc, {
        startY: yPos + 5,
        head: [['Category', 'Total', 'Paid', 'Unpaid', '%']],
        body: categoryData.map(c => [
          c.category,
          formatCurrency(c.total),
          formatCurrency(c.paid),
          formatCurrency(c.unpaid),
          `${c.percentage}%`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [185, 28, 28] },
      });

      // Detailed Expenses Table
      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Check if we need a new page
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.text('Detailed Expenses', 14, yPos);

      const expenseDetails = detailedExpenseReport?.expenses || [];
      autoTable(doc, {
        startY: yPos + 5,
        head: [['Date', 'Vendor', 'Category', 'Description', 'Amount', 'VAT', 'Total', 'Paid']],
        body: expenseDetails.map(e => [
          format(new Date(e.date), 'dd MMM yyyy'),
          e.vendor || '-',
          e.category,
          e.description.substring(0, 30) + (e.description.length > 30 ? '...' : ''),
          formatCurrency(e.amount),
          formatCurrency(e.vat),
          formatCurrency(e.total),
          e.is_paid ? '✓' : '✗'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [185, 28, 28], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 25 },
          2: { cellWidth: 28 },
          3: { cellWidth: 35 },
          4: { cellWidth: 20, halign: 'right' },
          5: { cellWidth: 18, halign: 'right' },
          6: { cellWidth: 22, halign: 'right' },
          7: { cellWidth: 12, halign: 'center' }
        }
      });

      // Unpaid Summary at the end
      const unpaidExpenses = expenseDetails.filter(e => !e.is_paid);
      if (unpaidExpenses.length > 0) {
        yPos = (doc as any).lastAutoTable.finalY + 15;

        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(185, 28, 28);
        doc.text(`Outstanding Payments: ${formatCurrency(summaryData?.total_unpaid)} (${unpaidExpenses.length} items)`, 14, yPos);
        doc.setTextColor(0, 0, 0);
      }

      doc.save(`Expense_Report_${propertyName}_${periodLabel.replace(' ', '_')}.pdf`);
      return;
    }

    if (reportType === 'revenue') {
      // Revenue Only PDF
      doc.setFontSize(20);
      doc.text('Revenue Report', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.text(propertyName, pageWidth / 2, 28, { align: 'center' });
      doc.text(`Period: ${periodLabel}`, pageWidth / 2, 35, { align: 'center' });
      doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy')}`, pageWidth / 2, 42, { align: 'center' });

      doc.setFontSize(14);
      doc.text('Revenue Summary', 14, 55);

      autoTable(doc, {
        startY: 60,
        head: [['Metric', 'Value']],
        body: [
          ['Short-Term Revenue', formatCurrency(kpis?.total_revenue)],
          ['Net Revenue', formatCurrency(kpis?.net_revenue)],
          ['Annual Tenancy (Cleared)', formatCurrency(annualRevenue?.total_cleared)],
          ['Annual Tenancy (Pending)', formatCurrency(annualRevenue?.total_pending)],
          ['Combined Revenue', formatCurrency(getCombinedRevenue())],
          ['Total Bookings', kpis?.total_bookings || 0],
          ['Total Nights', kpis?.total_nights || 0],
          ['Occupancy Rate', `${toNum(kpis?.occupancy_rate).toFixed(1)}%`],
          ['ADR', formatCurrency(kpis?.adr)],
          ['RevPAR', formatCurrency(kpis?.revpar)],
        ],
        theme: 'striped',
        headStyles: { fillColor: [21, 128, 61] },
      });

      const finalY1 = (doc as any).lastAutoTable.finalY || 60;
      doc.setFontSize(14);
      doc.text('Channel Performance', 14, finalY1 + 15);

      autoTable(doc, {
        startY: finalY1 + 20,
        head: [['Channel', 'Bookings', 'Nights', 'Revenue', '%']],
        body: channelMix.map(c => [
          c.channel_name,
          c.bookings,
          c.nights,
          formatCurrency(c.revenue),
          `${toNum(c.percentage).toFixed(1)}%`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [21, 128, 61] },
      });

      doc.save(`Revenue_Report_${propertyName}_${selectedYear}.pdf`);
      return;
    }

    // Full P&L Report
    doc.setFontSize(20);
    doc.text('P&L Report', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(propertyName, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Period: ${periodLabel}`, pageWidth / 2, 35, { align: 'center' });
    doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy')}`, pageWidth / 2, 42, { align: 'center' });

    doc.setFontSize(14);
    doc.text('Key Performance Indicators', 14, 55);

    autoTable(doc, {
      startY: 60,
      head: [['Metric', 'Value']],
      body: [
        ['Short-Term Revenue', formatCurrency(kpis?.total_revenue)],
        ['Annual Tenancy Revenue', formatCurrency(annualRevenue?.total_cleared)],
        ['Combined Revenue', formatCurrency(getCombinedRevenue())],
        ['Net Revenue', formatCurrency(kpis?.net_revenue)],
        ['Total Expenses', formatCurrency(kpis?.total_expenses)],
        ['Net Operating Income', formatCurrency(kpis?.noi)],
        ['Combined NOI', formatCurrency(getCombinedNOI())],
        ['Occupancy Rate', `${toNum(kpis?.occupancy_rate).toFixed(1)}%`],
        ['ADR', formatCurrency(kpis?.adr)],
        ['RevPAR', formatCurrency(kpis?.revpar)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [2, 132, 199] },
    });

    const finalY1 = (doc as any).lastAutoTable.finalY || 60;
    doc.setFontSize(14);
    doc.text('P&L Details', 14, finalY1 + 15);

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
      headStyles: { fillColor: [2, 132, 199] },
      styles: { fontSize: 8 },
    });

    doc.addPage();

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
      headStyles: { fillColor: [2, 132, 199] },
    });

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
      headStyles: { fillColor: [2, 132, 199] },
    });

    const finalY3 = (doc as any).lastAutoTable.finalY || 25;
    doc.setFontSize(14);
    doc.text('Annual Tenancy Revenue', 14, finalY3 + 15);

    autoTable(doc, {
      startY: finalY3 + 20,
      head: [['Metric', 'Value']],
      body: [
        ['Cleared Cheques', formatCurrency(annualRevenue?.total_cleared)],
        ['Pending Cheques', formatCurrency(annualRevenue?.total_pending)],
        ['Total Contract Value', formatCurrency(annualRevenue?.total_contract_value)],
        ['Active Tenancies', annualRevenue?.active_tenancies || 0],
      ],
      theme: 'striped',
      headStyles: { fillColor: [2, 132, 199] },
    });

    doc.save(`PnL_Report_${propertyName}_${selectedYear}.pdf`);
  };

  if (isLoading) {
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
        <h2 className="text-base font-semibold text-stone-800 mb-1">No Properties Yet</h2>
        <p className="text-sm text-stone-500 mb-4 text-center max-w-md">
          Add a property first to generate reports.
        </p>
        <Link
          to="/properties"
          className="flex items-center gap-2 px-3 py-1.5 bg-sky-600 text-white text-sm rounded hover:bg-sky-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Your First Property
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-stone-800">Reports</h1>
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="text-sm border border-stone-200 rounded px-2 py-1.5 focus:outline-none focus:border-sky-500"
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
            className="text-sm border border-stone-200 rounded px-2 py-1.5 focus:outline-none focus:border-sky-500"
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
            className="text-sm border border-stone-200 rounded px-2 py-1.5 focus:outline-none focus:border-sky-500"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as 'full' | 'expenses' | 'revenue' | 'tenancy')}
            className="text-sm border border-stone-200 rounded px-2 py-1.5 focus:outline-none focus:border-sky-500"
          >
            <option value="full">Full P&L Report</option>
            <option value="expenses">Expenses Only</option>
            <option value="revenue">Revenue Only</option>
            <option value="tenancy">Tenancy Only</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-700 text-white text-sm rounded hover:bg-green-800 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-700 text-white text-sm rounded hover:bg-red-800 transition-colors"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Period Badge */}
      <div>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
          {getReportPeriodLabel()}
        </span>
      </div>

      {/* KPIs Summary */}
      {(reportType === 'full' || reportType === 'revenue') && (
        <div className="bg-white border border-stone-200 rounded p-4">
          <h2 className="text-sm font-semibold text-stone-800 mb-3">Key Performance Indicators</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-stone-50 border border-stone-200 rounded">
              <p className="text-xs text-stone-500 mb-1">Short-Term Revenue</p>
              <p className="text-base font-semibold text-stone-800 tabular-nums">{formatCurrency(kpis?.total_revenue)}</p>
            </div>
            <div className="p-3 bg-stone-50 border border-stone-200 rounded">
              <p className="text-xs text-stone-500 mb-1">Annual Tenancy</p>
              <p className="text-base font-semibold text-stone-800 tabular-nums">{formatCurrency(annualRevenue?.total_cleared)}</p>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-xs text-green-700 mb-1">Combined Revenue</p>
              <p className="text-base font-semibold text-green-700 tabular-nums">{formatCurrency(getCombinedRevenue())}</p>
            </div>
            <div className="p-3 bg-stone-50 border border-stone-200 rounded">
              <p className="text-xs text-stone-500 mb-1">Net Revenue</p>
              <p className="text-base font-semibold text-stone-800 tabular-nums">{formatCurrency(kpis?.net_revenue)}</p>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-xs text-red-700 mb-1">Total Expenses</p>
              <p className="text-base font-semibold text-red-700 tabular-nums">{formatCurrency(kpis?.total_expenses)}</p>
            </div>
            <div className="p-3 bg-stone-50 border border-stone-200 rounded">
              <p className="text-xs text-stone-500 mb-1">NOI</p>
              <p className="text-base font-semibold text-stone-800 tabular-nums">{formatCurrency(kpis?.noi)}</p>
            </div>
            <div className="p-3 bg-stone-50 border border-stone-200 rounded">
              <p className="text-xs text-stone-500 mb-1">Occupancy</p>
              <p className="text-base font-semibold text-stone-800 tabular-nums">{toNum(kpis?.occupancy_rate).toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-stone-50 border border-stone-200 rounded">
              <p className="text-xs text-stone-500 mb-1">ADR</p>
              <p className="text-base font-semibold text-stone-800 tabular-nums">{formatCurrency(kpis?.adr)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tenancy Revenue Section */}
      {(reportType === 'full' || reportType === 'tenancy') && annualRevenue && (
        <div className="bg-white border border-stone-200 rounded p-4">
          <h2 className="text-sm font-semibold text-stone-800 mb-3">Annual Tenancy Revenue</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-xs text-green-700 mb-1">Cleared Cheques</p>
              <p className="text-base font-semibold text-green-700 tabular-nums">{formatCurrency(annualRevenue.total_cleared)}</p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded">
              <p className="text-xs text-amber-700 mb-1">Pending Cheques</p>
              <p className="text-base font-semibold text-amber-700 tabular-nums">{formatCurrency(annualRevenue.total_pending)}</p>
            </div>
            <div className="p-3 bg-stone-50 border border-stone-200 rounded">
              <p className="text-xs text-stone-500 mb-1">Total Contract Value</p>
              <p className="text-base font-semibold text-stone-800 tabular-nums">{formatCurrency(annualRevenue.total_contract_value)}</p>
            </div>
            <div className="p-3 bg-stone-50 border border-stone-200 rounded">
              <p className="text-xs text-stone-500 mb-1">Active Tenancies</p>
              <p className="text-base font-semibold text-stone-800 tabular-nums">{annualRevenue.active_tenancies}</p>
            </div>
          </div>
        </div>
      )}

      {/* Monthly P&L Table */}
      {reportType === 'full' && (
        <div className="bg-white border border-stone-200 rounded">
          <div className="px-4 py-3 border-b border-stone-200">
            <h2 className="text-sm font-semibold text-stone-800">
              {selectedMonth === 0 ? 'Monthly P&L Statement' : 'P&L Statement'}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Month</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">Gross Revenue</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">Net Revenue</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">Expenses</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">NOI</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-stone-500">
                      No data for this period
                    </td>
                  </tr>
                ) : (
                  <>
                    {monthlyData.map((row, index) => (
                      <tr key={index} className="border-b border-stone-100 hover:bg-stone-50">
                        <td className="px-4 py-2.5 text-sm font-medium text-stone-800">{row.month}</td>
                        <td className="px-4 py-2.5 text-sm text-right text-stone-600 tabular-nums">{formatCurrency(row.gross_revenue)}</td>
                        <td className="px-4 py-2.5 text-sm text-right text-stone-600 tabular-nums">{formatCurrency(row.net_revenue)}</td>
                        <td className="px-4 py-2.5 text-sm text-right text-red-600 tabular-nums">{formatCurrency(row.expenses)}</td>
                        <td className="px-4 py-2.5 text-sm text-right font-medium text-stone-800 tabular-nums">{formatCurrency(row.noi)}</td>
                      </tr>
                    ))}
                    {monthlyData.length > 1 && (
                      <tr className="bg-stone-100 font-medium">
                        <td className="px-4 py-2.5 text-sm text-stone-800">TOTAL</td>
                        <td className="px-4 py-2.5 text-sm text-right text-stone-800 tabular-nums">{formatCurrency(monthlyData.reduce((sum, m) => sum + toNum(m.gross_revenue), 0))}</td>
                        <td className="px-4 py-2.5 text-sm text-right text-stone-800 tabular-nums">{formatCurrency(monthlyData.reduce((sum, m) => sum + toNum(m.net_revenue), 0))}</td>
                        <td className="px-4 py-2.5 text-sm text-right text-red-600 tabular-nums">{formatCurrency(monthlyData.reduce((sum, m) => sum + toNum(m.expenses), 0))}</td>
                        <td className="px-4 py-2.5 text-sm text-right text-stone-800 tabular-nums">{formatCurrency(monthlyData.reduce((sum, m) => sum + toNum(m.noi), 0))}</td>
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
      <div className="grid md:grid-cols-2 gap-4">
        {/* Expense Breakdown - Enhanced */}
        {(reportType === 'full' || reportType === 'expenses') && (
          <div className="bg-white border border-stone-200 rounded">
            <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-800">Expense Breakdown</h2>
              {reportType === 'expenses' && (
                <select
                  value={expenseFilter}
                  onChange={(e) => setExpenseFilter(e.target.value as 'all' | 'paid' | 'unpaid')}
                  className="text-xs border border-stone-200 rounded px-2 py-1"
                >
                  <option value="all">All Expenses</option>
                  <option value="paid">Paid Only</option>
                  <option value="unpaid">Unpaid Only</option>
                </select>
              )}
            </div>

            {/* Summary Cards for Expense Report */}
            {reportType === 'expenses' && detailedExpenseReport && (
              <div className="px-4 py-3 grid grid-cols-3 gap-3 border-b border-stone-100">
                <div className="p-2 bg-stone-50 rounded text-center">
                  <p className="text-xs text-stone-500">Total</p>
                  <p className="text-sm font-semibold text-stone-800">{formatCurrency(detailedExpenseReport.summary.total_expenses)}</p>
                </div>
                <div className="p-2 bg-green-50 rounded text-center">
                  <p className="text-xs text-green-600">Paid</p>
                  <p className="text-sm font-semibold text-green-700">{formatCurrency(detailedExpenseReport.summary.total_paid)}</p>
                </div>
                <div className="p-2 bg-red-50 rounded text-center">
                  <p className="text-xs text-red-600">Unpaid</p>
                  <p className="text-sm font-semibold text-red-700">{formatCurrency(detailedExpenseReport.summary.total_unpaid)}</p>
                </div>
              </div>
            )}

            <div className="p-4">
              {/* Category Breakdown */}
              {(detailedExpenseReport?.category_breakdown || expenseBreakdown).length === 0 ? (
                <p className="text-sm text-stone-500">No expenses for this period</p>
              ) : (
                <div className="space-y-2">
                  {(reportType === 'expenses' && detailedExpenseReport ? detailedExpenseReport.category_breakdown : expenseBreakdown.map(e => ({
                    category: e.category_name,
                    total: e.amount,
                    paid: 0,
                    unpaid: 0,
                    count: 0,
                    percentage: e.percentage
                  }))).map((expense, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                      <div>
                        <span className="text-sm text-stone-700">{expense.category || (expense as any).category_name}</span>
                        {reportType === 'expenses' && (
                          <span className="text-xs text-stone-400 ml-2">({expense.count} items)</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-stone-800 tabular-nums">{formatCurrency(expense.total || (expense as any).amount)}</span>
                        <span className="text-xs text-stone-500 ml-2 tabular-nums">({toNum(expense.percentage).toFixed(1)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Detailed Expense List for Expense Report */}
            {reportType === 'expenses' && detailedExpenseReport && (
              <div className="border-t border-stone-200">
                <div className="px-4 py-2 bg-stone-50">
                  <h3 className="text-xs font-medium text-stone-600 uppercase">Detailed Expenses</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-stone-200">
                        <th className="px-3 py-2 text-left text-xs font-medium text-stone-500">Date</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-stone-500">Vendor</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-stone-500">Description</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-stone-500">Total</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-stone-500">Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedExpenseReport.expenses
                        .filter(e => expenseFilter === 'all' || (expenseFilter === 'paid' ? e.is_paid : !e.is_paid))
                        .map((expense) => (
                        <tr key={expense.id} className="border-b border-stone-100 hover:bg-stone-50">
                          <td className="px-3 py-2 text-xs text-stone-600">{format(new Date(expense.date), 'dd MMM')}</td>
                          <td className="px-3 py-2 text-xs text-stone-800 font-medium">{expense.vendor || '-'}</td>
                          <td className="px-3 py-2 text-xs text-stone-600 truncate max-w-xs">{expense.description}</td>
                          <td className="px-3 py-2 text-xs text-stone-800 text-right tabular-nums">{formatCurrency(expense.total)}</td>
                          <td className="px-3 py-2 text-center">
                            {expense.is_paid ? (
                              <span className="text-green-600">✓</span>
                            ) : (
                              <span className="text-red-600">✗</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Channel Performance */}
        {(reportType === 'full' || reportType === 'revenue') && (
          <div className="bg-white border border-stone-200 rounded">
            <div className="px-4 py-3 border-b border-stone-200">
              <h2 className="text-sm font-semibold text-stone-800">Channel Performance</h2>
            </div>
            <div className="p-4">
              {channelMix.length === 0 ? (
                <p className="text-sm text-stone-500">No bookings for this period</p>
              ) : (
                <div className="space-y-2">
                  {channelMix.map((channel, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                      <div>
                        <span className="text-sm text-stone-700">{channel.channel_name}</span>
                        <span className="text-xs text-stone-500 ml-2 tabular-nums">({channel.bookings} bookings)</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-stone-800 tabular-nums">{formatCurrency(channel.revenue)}</span>
                        <span className="text-xs text-stone-500 ml-2 tabular-nums">({toNum(channel.percentage).toFixed(1)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
