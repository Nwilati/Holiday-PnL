import { useState, useEffect } from 'react';
import { Plus, Building2, MapPin, Users, Bed, Trash2, X } from 'lucide-react';
import { api } from '../api/client';

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
  unit_type: string;
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
    return <div className="flex items-center justify-center h-64 text-stone-500">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-800">Properties</h1>
          <p className="text-sm text-stone-500">{properties.length} properties</p>
        </div>
        <button
          onClick={() => {
            setSelectedProperty(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-sky-600 text-white text-sm rounded hover:bg-sky-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Property
        </button>
      </div>

      {/* Property Cards */}
      {properties.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded p-8 text-center">
          <Building2 className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h2 className="text-base font-medium text-stone-800 mb-1">No Properties Yet</h2>
          <p className="text-sm text-stone-500 mb-4">Add your first property to get started</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-600 text-white text-sm rounded hover:bg-sky-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Property
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((property) => (
            <div
              key={property.id}
              onClick={() => {
                setSelectedProperty(property);
                setShowForm(true);
              }}
              className="bg-white border border-stone-200 rounded p-4 cursor-pointer hover:border-stone-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-stone-100 rounded">
                  <Building2 className="w-5 h-5 text-stone-500" />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                    property.is_active
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}>
                    {property.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={(e) => handleDelete(property.id, e)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-sm font-medium text-stone-800 mb-2">{property.name}</h3>
              <div className="space-y-1.5 text-xs text-stone-500">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{property.area || property.city || 'No location'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bed className="w-3.5 h-3.5" />
                  <span className="tabular-nums">{property.bedrooms}</span> bedroom{property.bedrooms !== 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  <span>Max <span className="tabular-nums">{property.max_guests}</span> guests</span>
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
    unit_type: property?.unit_type || 'standard',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded shadow-lg w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
          <h2 className="text-base font-semibold text-stone-800">
            {property ? 'Edit Property' : 'New Property'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Property Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-sky-500"
              placeholder="e.g., Marina View Apartment"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Type</label>
              <select
                value={formData.property_type}
                onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-sky-500"
              >
                <option value="apartment">Apartment</option>
                <option value="villa">Villa</option>
                <option value="studio">Studio</option>
                <option value="townhouse">Townhouse</option>
                <option value="penthouse">Penthouse</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Area</label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-sky-500"
                placeholder="e.g., Dubai Marina"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Address</label>
            <input
              type="text"
              value={formData.address_line1}
              onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-sky-500"
              placeholder="Building name, street"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Bedrooms</label>
              <input
                type="number"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-sky-500 tabular-nums"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Bathrooms</label>
              <input
                type="number"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-sky-500 tabular-nums"
                min="0"
                step="0.5"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Max Guests</label>
              <input
                type="number"
                value={formData.max_guests}
                onChange={(e) => setFormData({ ...formData, max_guests: parseInt(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-sky-500 tabular-nums"
                min="1"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Unit Type (Tourism Dirham Rate)</label>
            <select
              value={formData.unit_type}
              onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-sky-500"
            >
              <option value="standard">Standard (AED 10/bedroom/night)</option>
              <option value="deluxe">Deluxe (AED 15/bedroom/night)</option>
            </select>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-stone-200 bg-stone-50">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-3 py-1.5 text-sm bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Property'}
          </button>
        </div>
      </div>
    </div>
  );
}
