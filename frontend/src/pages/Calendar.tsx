import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Building2, X, Home } from 'lucide-react';
import { api } from '../api/client';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  parseISO
} from 'date-fns';

interface Booking {
  id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  channel_id: string;
  status: string;
  nightly_rate: number;
  property_id: string;
}

interface Channel {
  id: string;
  name: string;
  color_hex: string;
}

interface Property {
  id: string;
  name: string;
}

interface Tenancy {
  id: string;
  property_id: string;
  tenant_name: string;
  tenant_email: string;
  tenant_phone: string;
  contract_start: string;
  contract_end: string;
  annual_rent: number;
  contract_value: number;
  status: string;
}

// Annual Tenancy color (teal)
const ANNUAL_TENANCY_COLOR = '#14b8a6';

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedTenancy, setSelectedTenancy] = useState<Tenancy | null>(null);
  const [showAnnualTenancy, setShowAnnualTenancy] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProperties();
    loadChannels();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      loadBookings();
      loadTenancies();
    }
  }, [selectedProperty, currentMonth]);

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

  const loadChannels = async () => {
    try {
      const response = await api.getChannels();
      setChannels(response.data);
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  };

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      const start = format(startOfMonth(subMonths(currentMonth, 1)), 'yyyy-MM-dd');
      const end = format(endOfMonth(addMonths(currentMonth, 1)), 'yyyy-MM-dd');
      const response = await api.getBookings({
        property_id: selectedProperty,
        start_date: start,
        end_date: end
      });
      setBookings(response.data.filter((b: Booking) => b.status !== 'cancelled'));
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTenancies = async () => {
    try {
      const response = await api.getTenancies({ property_id: selectedProperty, status: 'active' });
      setTenancies(response.data || []);
    } catch (error) {
      console.error('Failed to load tenancies:', error);
      setTenancies([]);
    }
  };

  const getChannelColor = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    return channel?.color_hex || '#6B7280';
  };

  const getChannelName = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    return channel?.name || 'Unknown';
  };

  const getBookingsForDay = (day: Date) => {
    return bookings.filter(booking => {
      const checkIn = parseISO(booking.check_in);
      const checkOut = parseISO(booking.check_out);
      return isWithinInterval(day, { start: checkIn, end: addDays(checkOut, -1) }) ||
             isSameDay(day, checkIn);
    });
  };

  const getTenanciesForDay = (day: Date) => {
    if (!showAnnualTenancy) return [];
    return tenancies.filter(tenancy => {
      const contractStart = parseISO(tenancy.contract_start);
      const contractEnd = parseISO(tenancy.contract_end);
      return isWithinInterval(day, { start: contractStart, end: contractEnd }) ||
             isSameDay(day, contractStart) ||
             isSameDay(day, contractEnd);
    });
  };

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-stone-800">Calendar</h1>
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
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 hover:bg-stone-100 rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-stone-600" />
          </button>
          <h2 className="text-sm font-medium text-stone-800 w-32 text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 hover:bg-stone-100 rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-stone-600" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="ml-2 px-3 py-1.5 text-sm bg-sky-600 text-white rounded hover:bg-sky-700 transition-colors"
          >
            Today
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 border-b border-stone-200">
        {days.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-medium text-stone-500 uppercase tracking-wide">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const currentDay = day;
        const dayBookings = getBookingsForDay(currentDay);
        const dayTenancies = getTenanciesForDay(currentDay);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isToday = isSameDay(day, new Date());

        // Combine bookings and tenancies for display limit
        const totalItems = dayBookings.length + dayTenancies.length;
        const maxItems = 3;

        days.push(
          <div
            key={day.toString()}
            className={`min-h-24 border-r border-b border-stone-200 p-1 ${
              !isCurrentMonth ? 'bg-stone-50' : 'bg-white'
            }`}
          >
            <div className={`text-xs mb-1 ${
              isToday
                ? 'bg-sky-600 text-white w-5 h-5 rounded-full flex items-center justify-center'
                : isCurrentMonth ? 'text-stone-800' : 'text-stone-400'
            }`}>
              {format(day, 'd')}
            </div>
            <div className="space-y-0.5">
              {/* Render tenancies first (annual tenancy takes priority visually) */}
              {dayTenancies.slice(0, maxItems).map((tenancy) => {
                const isContractStart = isSameDay(parseISO(tenancy.contract_start), currentDay);
                return (
                  <div
                    key={`tenancy-${tenancy.id}`}
                    onClick={() => setSelectedTenancy(tenancy)}
                    className="text-xs px-1 py-0.5 rounded cursor-pointer truncate hover:opacity-80"
                    style={{
                      backgroundColor: ANNUAL_TENANCY_COLOR + '20',
                      borderLeft: `2px solid ${ANNUAL_TENANCY_COLOR}`
                    }}
                    title={`${tenancy.tenant_name} (Annual Tenancy)`}
                  >
                    {isContractStart ? '' : ''}{tenancy.tenant_name}
                  </div>
                );
              })}
              {/* Render bookings */}
              {dayBookings.slice(0, Math.max(0, maxItems - dayTenancies.length)).map((booking) => {
                const isCheckIn = isSameDay(parseISO(booking.check_in), currentDay);
                return (
                  <div
                    key={booking.id}
                    onClick={() => setSelectedBooking(booking)}
                    className="text-xs px-1 py-0.5 rounded cursor-pointer truncate hover:opacity-80"
                    style={{
                      backgroundColor: getChannelColor(booking.channel_id) + '20',
                      borderLeft: `2px solid ${getChannelColor(booking.channel_id)}`
                    }}
                    title={`${booking.guest_name} (${getChannelName(booking.channel_id)})`}
                  >
                    {isCheckIn ? '' : ''}{booking.guest_name}
                  </div>
                );
              })}
              {totalItems > maxItems && (
                <div className="text-xs text-stone-500 px-1">
                  +{totalItems - maxItems} more
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }
    return <div>{rows}</div>;
  };

  const renderLegend = () => {
    return (
      <div className="flex flex-wrap gap-3 mt-3 items-center">
        {/* Annual Tenancy toggle */}
        <button
          onClick={() => setShowAnnualTenancy(!showAnnualTenancy)}
          className={`flex items-center gap-2 px-2.5 py-1 rounded border text-sm transition-all ${
            showAnnualTenancy
              ? 'border-teal-500 bg-teal-50'
              : 'border-stone-200 bg-stone-50 opacity-60'
          }`}
        >
          <div
            className="w-2.5 h-2.5 rounded"
            style={{ backgroundColor: ANNUAL_TENANCY_COLOR }}
          />
          <span className="text-stone-700">Annual Tenancy</span>
          {showAnnualTenancy && tenancies.length > 0 && (
            <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full tabular-nums">
              {tenancies.length}
            </span>
          )}
        </button>

        {/* Channel legend */}
        {channels.map((channel) => (
          <div key={channel.id} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded"
              style={{ backgroundColor: channel.color_hex }}
            />
            <span className="text-xs text-stone-600">{channel.name}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderBookingModal = () => {
    if (!selectedBooking) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedBooking(null)} />
        <div className="relative bg-white rounded shadow-lg max-w-md w-full mx-4">
          <div className="flex justify-between items-center px-4 py-3 border-b border-stone-200">
            <h3 className="text-base font-semibold text-stone-800">Booking Details</h3>
            <button
              onClick={() => setSelectedBooking(null)}
              className="p-1 text-stone-400 hover:text-stone-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <span className="text-xs text-stone-500">Guest</span>
              <p className="text-sm font-medium text-stone-800">{selectedBooking.guest_name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-stone-500">Check-in</span>
                <p className="text-sm font-medium text-stone-800">{format(parseISO(selectedBooking.check_in), 'MMM d, yyyy')}</p>
              </div>
              <div>
                <span className="text-xs text-stone-500">Check-out</span>
                <p className="text-sm font-medium text-stone-800">{format(parseISO(selectedBooking.check_out), 'MMM d, yyyy')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-stone-500">Channel</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded"
                    style={{ backgroundColor: getChannelColor(selectedBooking.channel_id) }}
                  />
                  <p className="text-sm font-medium text-stone-800">{getChannelName(selectedBooking.channel_id)}</p>
                </div>
              </div>
              <div>
                <span className="text-xs text-stone-500">Status</span>
                <p className="text-sm font-medium text-stone-800 capitalize">{selectedBooking.status}</p>
              </div>
            </div>
            <div>
              <span className="text-xs text-stone-500">Nightly Rate</span>
              <p className="text-sm font-medium text-stone-800 tabular-nums">AED {selectedBooking.nightly_rate}</p>
            </div>
          </div>
          <div className="flex gap-2 px-4 py-3 border-t border-stone-200 bg-stone-50">
            <a
              href={`/bookings?edit=${selectedBooking.id}`}
              className="flex-1 px-3 py-1.5 bg-sky-600 text-white text-sm rounded text-center hover:bg-sky-700 transition-colors"
            >
              Edit Booking
            </a>
            <button
              onClick={() => setSelectedBooking(null)}
              className="flex-1 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTenancyModal = () => {
    if (!selectedTenancy) return null;

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('en-AE', {
        style: 'currency',
        currency: 'AED',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value || 0);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedTenancy(null)} />
        <div className="relative bg-white rounded shadow-lg max-w-md w-full mx-4">
          <div className="flex justify-between items-center px-4 py-3 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded" style={{ backgroundColor: ANNUAL_TENANCY_COLOR + '20' }}>
                <Home className="w-4 h-4" style={{ color: ANNUAL_TENANCY_COLOR }} />
              </div>
              <h3 className="text-base font-semibold text-stone-800">Annual Tenancy</h3>
            </div>
            <button
              onClick={() => setSelectedTenancy(null)}
              className="p-1 text-stone-400 hover:text-stone-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <span className="text-xs text-stone-500">Tenant Name</span>
              <p className="text-sm font-medium text-stone-800">{selectedTenancy.tenant_name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-stone-500">Contract Start</span>
                <p className="text-sm font-medium text-stone-800">{format(parseISO(selectedTenancy.contract_start), 'MMM d, yyyy')}</p>
              </div>
              <div>
                <span className="text-xs text-stone-500">Contract End</span>
                <p className="text-sm font-medium text-stone-800">{format(parseISO(selectedTenancy.contract_end), 'MMM d, yyyy')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-stone-500">Annual Rent</span>
                <p className="text-sm font-medium text-stone-800 tabular-nums">{formatCurrency(selectedTenancy.annual_rent)}</p>
              </div>
              <div>
                <span className="text-xs text-stone-500">Contract Value</span>
                <p className="text-sm font-medium text-stone-800 tabular-nums">{formatCurrency(selectedTenancy.contract_value)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-stone-500">Email</span>
                <p className="text-sm font-medium text-stone-800 truncate">{selectedTenancy.tenant_email}</p>
              </div>
              <div>
                <span className="text-xs text-stone-500">Phone</span>
                <p className="text-sm font-medium text-stone-800">{selectedTenancy.tenant_phone}</p>
              </div>
            </div>
            <div>
              <span className="text-xs text-stone-500">Status</span>
              <p className="text-sm font-medium text-stone-800 capitalize">{selectedTenancy.status}</p>
            </div>
          </div>
          <div className="flex gap-2 px-4 py-3 border-t border-stone-200 bg-stone-50">
            <Link
              to="/tenancies"
              className="flex-1 px-3 py-1.5 text-white text-sm rounded text-center hover:opacity-90 transition-colors"
              style={{ backgroundColor: ANNUAL_TENANCY_COLOR }}
            >
              View Tenancy Details
            </Link>
            <button
              onClick={() => setSelectedTenancy(null)}
              className="flex-1 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
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
          Add a property first to view your booking calendar.
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
      {renderHeader()}
      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="w-8 h-8 border-2 border-stone-200 border-t-sky-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="bg-white border border-stone-200 rounded overflow-hidden">
            {renderDays()}
            {renderCells()}
          </div>
          {renderLegend()}
        </>
      )}
      {renderBookingModal()}
      {renderTenancyModal()}
    </div>
  );
}
