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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
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
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold w-40 text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="ml-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
      <div className="grid grid-cols-7 mb-2">
        {days.map((day) => (
          <div key={day} className="py-2 text-center text-sm font-semibold text-gray-600">
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
            className={`min-h-24 border border-gray-200 p-1 ${
              !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
            }`}
          >
            <div className={`text-sm mb-1 ${
              isToday
                ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
            }`}>
              {format(day, 'd')}
            </div>
            <div className="space-y-1">
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
                      borderLeft: `3px solid ${ANNUAL_TENANCY_COLOR}`
                    }}
                    title={`${tenancy.tenant_name} (Annual Tenancy)`}
                  >
                    {isContractStart ? '🏠 ' : ''}{tenancy.tenant_name}
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
                      borderLeft: `3px solid ${getChannelColor(booking.channel_id)}`
                    }}
                    title={`${booking.guest_name} (${getChannelName(booking.channel_id)})`}
                  >
                    {isCheckIn ? '✈ ' : ''}{booking.guest_name}
                  </div>
                );
              })}
              {totalItems > maxItems && (
                <div className="text-xs text-gray-500 px-1">
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
      <div className="flex flex-wrap gap-4 mt-4 items-center">
        {/* Annual Tenancy toggle */}
        <button
          onClick={() => setShowAnnualTenancy(!showAnnualTenancy)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
            showAnnualTenancy
              ? 'border-teal-500 bg-teal-50'
              : 'border-gray-300 bg-gray-50 opacity-60'
          }`}
        >
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: ANNUAL_TENANCY_COLOR }}
          />
          <span className="text-sm text-gray-700">Annual Tenancy</span>
          {showAnnualTenancy && tenancies.length > 0 && (
            <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">
              {tenancies.length}
            </span>
          )}
        </button>

        {/* Channel legend */}
        {channels.map((channel) => (
          <div key={channel.id} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: channel.color_hex }}
            />
            <span className="text-sm text-gray-600">{channel.name}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderBookingModal = () => {
    if (!selectedBooking) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold">Booking Details</h3>
            <button
              onClick={() => setSelectedBooking(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Guest</span>
              <p className="font-medium">{selectedBooking.guest_name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">Check-in</span>
                <p className="font-medium">{format(parseISO(selectedBooking.check_in), 'MMM d, yyyy')}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Check-out</span>
                <p className="font-medium">{format(parseISO(selectedBooking.check_out), 'MMM d, yyyy')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">Channel</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: getChannelColor(selectedBooking.channel_id) }}
                  />
                  <p className="font-medium">{getChannelName(selectedBooking.channel_id)}</p>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Status</span>
                <p className="font-medium capitalize">{selectedBooking.status}</p>
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-500">Nightly Rate</span>
              <p className="font-medium">AED {selectedBooking.nightly_rate}</p>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <a
              href={`/bookings?edit=${selectedBooking.id}`}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-center hover:bg-blue-700"
            >
              Edit Booking
            </a>
            <button
              onClick={() => setSelectedBooking(null)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: ANNUAL_TENANCY_COLOR + '20' }}>
                <Home className="w-5 h-5" style={{ color: ANNUAL_TENANCY_COLOR }} />
              </div>
              <h3 className="text-lg font-semibold">Annual Tenancy</h3>
            </div>
            <button
              onClick={() => setSelectedTenancy(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Tenant Name</span>
              <p className="font-medium">{selectedTenancy.tenant_name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">Contract Start</span>
                <p className="font-medium">{format(parseISO(selectedTenancy.contract_start), 'MMM d, yyyy')}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Contract End</span>
                <p className="font-medium">{format(parseISO(selectedTenancy.contract_end), 'MMM d, yyyy')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">Annual Rent</span>
                <p className="font-medium">{formatCurrency(selectedTenancy.annual_rent)}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Contract Value</span>
                <p className="font-medium">{formatCurrency(selectedTenancy.contract_value)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">Email</span>
                <p className="font-medium text-sm truncate">{selectedTenancy.tenant_email}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Phone</span>
                <p className="font-medium">{selectedTenancy.tenant_phone}</p>
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-500">Status</span>
              <p className="font-medium capitalize">{selectedTenancy.status}</p>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <Link
              to="/tenancies"
              className="flex-1 px-4 py-2 text-white rounded-lg text-center hover:opacity-90"
              style={{ backgroundColor: ANNUAL_TENANCY_COLOR }}
            >
              View Tenancy Details
            </Link>
            <button
              onClick={() => setSelectedTenancy(null)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
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
          Add a property first to view your booking calendar.
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
      {renderHeader()}
      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
