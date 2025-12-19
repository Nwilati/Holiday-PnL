import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { api } from '../api/client';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.getUsers();
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Delete user ${user.email}?`)) return;

    try {
      await api.deleteUser(user.id);
      setUsers(users.filter(u => u.id !== user.id));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      owner: 'bg-sky-50 text-sky-700 border border-sky-200',
      admin: 'bg-stone-100 text-stone-700 border border-stone-200',
      viewer: 'bg-stone-50 text-stone-600 border border-stone-200',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[role] || styles.viewer}`}>
        {role}
      </span>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-stone-500">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-800">User Management</h1>
          <p className="text-sm text-stone-500">{users.length} users</p>
        </div>
        <button
          onClick={() => { setEditingUser(null); setShowForm(true); }}
          className="flex items-center gap-2 px-3 py-1.5 bg-sky-600 text-white text-sm rounded hover:bg-sky-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded text-sm">{error}</div>
      )}

      {/* Users Table */}
      <div className="bg-white border border-stone-200 rounded overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">User</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Email</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Role</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-stone-100 hover:bg-stone-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-stone-200 rounded flex items-center justify-center">
                      <span className="text-stone-600 text-sm font-medium">
                        {(user.full_name || user.email)[0].toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-stone-800">{user.full_name || 'No name'}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-stone-600">{user.email}</td>
                <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => { setEditingUser(user); setShowForm(true); }}
                    className="p-1.5 text-sky-600 hover:bg-sky-50 rounded transition-colors mr-1"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Form Modal */}
      {showForm && (
        <UserForm
          user={editingUser}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); loadUsers(); }}
        />
      )}
    </div>
  );
}

// User Form Component
interface UserFormProps {
  user: User | null;
  onClose: () => void;
  onSave: () => void;
}

function UserForm({ user, onClose, onSave }: UserFormProps) {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    password: '',
    full_name: user?.full_name || '',
    role: user?.role || 'viewer',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (user) {
        // Update existing user
        await api.updateUser(user.id, {
          email: formData.email,
          password: formData.password || undefined,
          full_name: formData.full_name,
          role: formData.role,
        });
      } else {
        // Create new user
        if (!formData.password) {
          setError('Password is required');
          setSaving(false);
          return;
        }
        await api.createUser({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
        });
      }
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded shadow-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
          <h2 className="text-base font-semibold text-stone-800">{user ? 'Edit User' : 'New User'}</h2>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 p-2 rounded text-sm">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Full Name</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-sky-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-sky-500"
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">
              Password {user && <span className="text-stone-400 font-normal">(leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-sky-500"
              placeholder={user ? '' : 'Enter password'}
              required={!user}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-sky-500"
            >
              <option value="viewer">Viewer - Can view data only</option>
              <option value="admin">Admin - Can manage data</option>
              <option value="owner">Owner - Full access</option>
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
            {saving ? 'Saving...' : user ? 'Update User' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}
