import { useState, useEffect } from 'react';
import { Plus, Search, Trash2, X } from 'lucide-react';
import { api } from '../api/client';

type Property = { id: string; name: string; };
type Channel = { id: string; name: string; color_hex: string; };
type Booking = {
  id: string;
  property_id: string;
  channel_id: string;
  booking_ref: string;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  nights: number;
  status: string;
  nightly_rate: number;
  gross_revenue: number;
  net_revenue: number;
  cleaning_fee: number;
  platform_commission: number;
  is_paid: boolean;
};

export default function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [filters, setFilters] = useState({
    property_id: '',
    status: '',
    search: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [bookingsRes, propertiesRes, channelsRes] = await Promise.all([
        api.getBookings(),
        api.getProperties(),
        api.getChannels(),
      ]);
      setBookings(bookingsRes.data);
      setProperties(propertiesRes.data);
      setChannels(channelsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const getChannelName = (channelId: string) => {
    return channels.find(c => c.id === channelId)?.name || 'Unknown';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      confirmed: 'bg-green-50 text-green-700',
      pending: 'bg-amber-50 text-amber-700',
      cancelled: 'bg-red-50 text-red-700',
      completed: 'bg-sky-50 text-sky-700',
      checked_in: 'bg-sky-50 text-sky-700',
    };
    return colors[status] || 'bg-stone-100 text-stone-600';
  };

  const handleDelete = async (bookingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this booking?')) return;

    try {
      await api.deleteBooking(bookingId);
      loadData();
    } catch (error) {
      console.error('Failed to delete booking:', error);
      alert('Failed to delete booking');
    }
  };

  // Filter bookings
  const filteredBookings = bookings.filter(booking => {
    if (filters.property_id && booking.property_id !== filters.property_id) return false;
    if (filters.status && booking.status !== filters.status) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const matchesGuest = booking.guest_name?.toLowerCase().includes(search);
      const matchesRef = booking.booking_ref?.toLowerCase().includes(search);
      if (!matchesGuest && !matchesRef) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Bookings</h1>
          <p className="text-sm text-stone-500">{filteredBookings.length} bookings</p>
        </div>
        <button
          onClick={() => {
            setSelectedBooking(null);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-600 text-white text-sm font-medium rounded hover:bg-sky-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Booking
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-3 py-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search guest or ref..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
        </div>
        <select
          value={filters.property_id}
          onChange={(e) => setFilters({ ...filters, property_id: e.target.value })}
          className="text-sm border border-stone-300 rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">All Properties</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="text-sm border border-stone-300 rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">All Status</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="checked_in">Checked In</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Guest</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Channel</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Check In</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Check Out</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">Nights</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">Revenue</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-stone-500 uppercase tracking-wide">Paid</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredBookings.map((booking) => (
              <tr
                key={booking.id}
                className="hover:bg-stone-50 cursor-pointer"
                onClick={() => {
                  setSelectedBooking(booking);
                  setShowForm(true);
                }}
              >
                <td className="px-4 py-2.5">
                  <div className="text-sm font-medium text-stone-900">{booking.guest_name || 'N/A'}</div>
                  <div className="text-xs text-stone-500">{booking.booking_ref}</div>
                </td>
                <td className="px-4 py-2.5 text-sm text-stone-600">{getChannelName(booking.channel_id)}</td>
                <td className="px-4 py-2.5 text-sm text-stone-600 tabular-nums">{formatDate(booking.check_in)}</td>
                <td className="px-4 py-2.5 text-sm text-stone-600 tabular-nums">{formatDate(booking.check_out)}</td>
                <td className="px-4 py-2.5 text-sm text-stone-600 text-right tabular-nums">{booking.nights}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-sm font-medium text-stone-900 text-right tabular-nums">
                  AED {formatCurrency(booking.net_revenue)}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {booking.is_paid ? (
                    <Check className="w-4 h-4 text-green-600 mx-auto" />
                  ) : (
                    <Minus className="w-4 h-4 text-stone-300 mx-auto" />
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={(e) => handleDelete(booking.id, e)}
                    className="p-1 text-stone-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredBookings.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-stone-500">
                  No bookings found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Booking Form Modal */}
      {showForm && (
        <BookingForm
          booking={selectedBooking}
          properties={properties}
          channels={channels}
          onClose={() => setShowForm(false)}
          onSave={() => {
            setShowForm(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Booking Form Component
interface BookingFormProps {
  booking: Booking | null;
  properties: Property[];
  channels: Channel[];
  onClose: () => void;
  onSave: () => void;
}

function BookingForm({ booking, properties, channels, onClose, onSave }: BookingFormProps) {
  const [formData, setFormData] = useState({
    property_id: booking?.property_id || properties[0]?.id || '',
    channel_id: booking?.channel_id || channels[0]?.id || '',
    booking_ref: booking?.booking_ref || '',
    guest_name: booking?.guest_name || '',
    guest_email: booking?.guest_email || '',
    check_in: booking?.check_in || '',
    check_out: booking?.check_out || '',
    nightly_rate: booking?.nightly_rate || 0,
    cleaning_fee: booking?.cleaning_fee || 0,
    platform_commission: booking?.platform_commission || 0,
    status: booking?.status || 'confirmed',
    is_paid: booking?.is_paid || false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const cleanData = {
      ...formData,
      nightly_rate: formData.nightly_rate || 0,
      cleaning_fee: formData.cleaning_fee || 0,
      platform_commission: formData.platform_commission || 0,
    };

    try {
      if (booking) {
        await api.updateBooking(booking.id, cleanData);
      } else {
        await api.createBooking(cleanData);
      }
      onSave();
    } catch (error) {
      console.error('Error saving booking:', error);
      alert('Error saving booking');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/30" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-stone-900">{booking ? 'Edit Booking' : 'New Booking'}</h2>
            <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Property</label>
              <select
                value={formData.property_id}
                onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Channel</label>
              <select
                value={formData.channel_id}
                onChange={(e) => setFormData({ ...formData, channel_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              >
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Booking Ref</label>
              <input
                type="text"
                value={formData.booking_ref}
                onChange={(e) => setFormData({ ...formData, booking_ref: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Guest Name</label>
              <input
                type="text"
                value={formData.guest_name}
                onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Check In</label>
              <input
                type="date"
                value={formData.check_in}
                onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Check Out</label>
              <input
                type="date"
                value={formData.check_out}
                onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Nightly Rate (AED)</label>
              <input
                type="number"
                value={formData.nightly_rate}
                onChange={(e) => setFormData({ ...formData, nightly_rate: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Cleaning Fee (AED)</label>
              <input
                type="number"
                value={formData.cleaning_fee}
                onChange={(e) => setFormData({ ...formData, cleaning_fee: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Platform Commission (AED)</label>
              <input
                type="number"
                value={formData.platform_commission}
                onChange={(e) => setFormData({ ...formData, platform_commission: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="checked_in">Checked In</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_paid"
              checked={formData.is_paid}
              onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked })}
              className="w-4 h-4 text-sky-600 rounded border-stone-300 focus:ring-sky-500"
            />
            <label htmlFor="is_paid" className="ml-2 text-sm text-stone-700">Payment Received</label>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-stone-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Booking'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
