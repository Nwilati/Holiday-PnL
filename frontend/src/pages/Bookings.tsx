import { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import DataTable from '../components/DataTable';
import { api } from '../api/client';
// Types defined inline
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
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
    }).format(value);
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
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
      checked_in: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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

  const totalBookings = filteredBookings.length;

  const columns = [
    {
      key: 'guest_name',
      header: 'Guest',
      render: (booking: Booking) => (
        <div>
          <div className="font-medium">{booking.guest_name || 'N/A'}</div>
          <div className="text-xs text-gray-500">{booking.booking_ref}</div>
        </div>
      ),
    },
    {
      key: 'channel_id',
      header: 'Channel',
      render: (booking: Booking) => getChannelName(booking.channel_id),
    },
    {
      key: 'check_in',
      header: 'Check In',
      render: (booking: Booking) => formatDate(booking.check_in),
    },
    {
      key: 'check_out',
      header: 'Check Out',
      render: (booking: Booking) => formatDate(booking.check_out),
    },
    {
      key: 'nights',
      header: 'Nights',
    },
    {
      key: 'status',
      header: 'Status',
      render: (booking: Booking) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
          {booking.status}
        </span>
      ),
    },
    {
      key: 'net_revenue',
      header: 'Net Revenue',
      render: (booking: Booking) => formatCurrency(booking.net_revenue || 0),
    },
    {
      key: 'is_paid',
      header: 'Paid',
      render: (booking: Booking) => (
        <span className={booking.is_paid ? 'text-green-600' : 'text-red-600'}>
          {booking.is_paid ? '✓' : '✗'}
        </span>
      ),
    },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500">
            {totalBookings} bookings
            {(filters.property_id || filters.status || filters.search) && (
              <span className="text-blue-600 ml-2">(filtered)</span>
            )}
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedBooking(null);
            setShowForm(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Booking
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search guest name or booking ref..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={filters.property_id}
            onChange={(e) => setFilters({ ...filters, property_id: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="checked_in">Checked In</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm">
        <DataTable
          columns={columns}
          data={filteredBookings}
          onRowClick={(booking) => {
            setSelectedBooking(booking);
            setShowForm(true);
          }}
        />
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

    // Clean up the data - convert NaN to 0
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">{booking ? 'Edit Booking' : 'New Booking'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
              <select
                value={formData.property_id}
                onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
              <select
                value={formData.channel_id}
                onChange={(e) => setFormData({ ...formData, channel_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              >
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Booking Ref</label>
              <input
                type="text"
                value={formData.booking_ref}
                onChange={(e) => setFormData({ ...formData, booking_ref: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name</label>
              <input
                type="text"
                value={formData.guest_name}
                onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check In</label>
              <input
                type="date"
                value={formData.check_in}
                onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check Out</label>
              <input
                type="date"
                value={formData.check_out}
                onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nightly Rate (AED)</label>
              <input
                type="number"
                value={formData.nightly_rate}
                onChange={(e) => setFormData({ ...formData, nightly_rate: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cleaning Fee (AED)</label>
              <input
                type="number"
                value={formData.cleaning_fee}
                onChange={(e) => setFormData({ ...formData, cleaning_fee: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platform Commission (AED)</label>
              <input
                type="number"
                value={formData.platform_commission}
                onChange={(e) => setFormData({ ...formData, platform_commission: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="is_paid" className="ml-2 text-sm text-gray-700">Payment Received</label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
