import { useState, useEffect } from 'react';
import { Plus, Building2, MapPin, Users, Bed, Trash2 } from 'lucide-react';
import { api } from '../api/client';
// Type defined inline
type Property = {
  id: string;
  name: string;
  property_type: string;
  address_line1: string;
  area: string;
  city: string;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  is_active: boolean;
};

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const response = await api.getProperties();
      setProperties(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading properties:', error);
      setLoading(false);
    }
  };

  const handleDelete = async (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this property? This will also delete all associated bookings and expenses.')) return;

    try {
      await api.deleteProperty(propertyId);
      loadProperties();
    } catch (error) {
      console.error('Failed to delete property:', error);
      alert('Failed to delete property');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-500">{properties.length} properties</p>
        </div>
        <button
          onClick={() => {
            setSelectedProperty(null);
            setShowForm(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Property
        </button>
      </div>

      {/* Property Cards */}
      {properties.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Properties Yet</h2>
          <p className="text-gray-500 mb-4">Add your first property to get started</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Property
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <div
              key={property.id}
              onClick={() => {
                setSelectedProperty(property);
                setShowForm(true);
              }}
              className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    property.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {property.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={(e) => handleDelete(property.id, e)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{property.name}</h3>
              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  {property.area || property.city || 'No location'}
                </div>
                <div className="flex items-center">
                  <Bed className="w-4 h-4 mr-2" />
                  {property.bedrooms} bedroom{property.bedrooms !== 1 ? 's' : ''}
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Max {property.max_guests} guests
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Property Form Modal */}
      {showForm && (
        <PropertyForm
          property={selectedProperty}
          onClose={() => setShowForm(false)}
          onSave={() => {
            setShowForm(false);
            loadProperties();
          }}
        />
      )}
    </div>
  );
}

// Property Form Component
interface PropertyFormProps {
  property: Property | null;
  onClose: () => void;
  onSave: () => void;
}

function PropertyForm({ property, onClose, onSave }: PropertyFormProps) {
  const [formData, setFormData] = useState({
    name: property?.name || '',
    property_type: property?.property_type || 'apartment',
    address_line1: property?.address_line1 || '',
    area: property?.area || '',
    city: property?.city || 'Dubai',
    bedrooms: property?.bedrooms || 1,
    bathrooms: property?.bathrooms || 1,
    max_guests: property?.max_guests || 2,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (property) {
        await api.updateProperty(property.id, formData);
      } else {
        await api.createProperty(formData);
      }
      onSave();
    } catch (error) {
      console.error('Error saving property:', error);
      alert('Error saving property');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">{property ? 'Edit Property' : 'New Property'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Marina View Apartment"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.property_type}
                onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="apartment">Apartment</option>
                <option value="villa">Villa</option>
                <option value="studio">Studio</option>
                <option value="townhouse">Townhouse</option>
                <option value="penthouse">Penthouse</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., Dubai Marina"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={formData.address_line1}
              onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Building name, street"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
              <input
                type="number"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
              <input
                type="number"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min="0"
                step="0.5"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Guests</label>
              <input
                type="number"
                value={formData.max_guests}
                onChange={(e) => setFormData({ ...formData, max_guests: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min="1"
                required
              />
            </div>
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
              {saving ? 'Saving...' : 'Save Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
