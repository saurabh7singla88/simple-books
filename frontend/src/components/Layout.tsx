import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles: string[];
}

const navGroups = [
  {
    label: null,
    items: [{ path: '/', label: 'Dashboard', icon: '⬛', roles: ['ADMIN', 'ACCOUNTANT', 'VIEWER'] }],
  },
  {
    label: 'Accounting',
    items: [
      { path: '/accounts', label: 'Chart of Accounts', icon: '📋', roles: ['ADMIN', 'ACCOUNTANT', 'VIEWER'] },
      { path: '/journals', label: 'Journal Entries', icon: '📓', roles: ['ADMIN', 'ACCOUNTANT'] },
    ],
  },
  {
    label: 'Sales',
    items: [
      { path: '/contacts?type=CUSTOMER', label: 'Customers', icon: '🏢', roles: ['ADMIN', 'ACCOUNTANT', 'VIEWER'] },
      { path: '/invoices', label: 'Invoices', icon: '🧾', roles: ['ADMIN', 'ACCOUNTANT', 'VIEWER'] },
    ],
  },
  {
    label: 'Purchases',
    items: [
      { path: '/contacts?type=VENDOR', label: 'Vendors', icon: '🏭', roles: ['ADMIN', 'ACCOUNTANT', 'VIEWER'] },
      { path: '/bills', label: 'Bills', icon: '📑', roles: ['ADMIN', 'ACCOUNTANT', 'VIEWER'] },
      { path: '/recurring-expenses', label: 'Recurring Expenses', icon: '🔄', roles: ['ADMIN', 'ACCOUNTANT', 'VIEWER'] },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { path: '/reports', label: 'Reports', icon: '📊', roles: ['ADMIN', 'ACCOUNTANT', 'VIEWER'] },
    ],
  },
  {
    label: 'Settings',
    items: [
      { path: '/contacts', label: 'All Contacts', icon: '👥', roles: ['ADMIN', 'ACCOUNTANT'] },
      { path: '/users', label: 'Users', icon: '🔑', roles: ['ADMIN'] },
    ],
  },
];

function NavItemLink({ item }: { item: NavItem }) {
  const basePath = item.path.split('?')[0];
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
          isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
      // match active state on base path for query-parameterized links

    >
      <span className="text-sm w-4 text-center">{item.icon}</span>
      {item.label}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">
        <div className="px-4 py-4 border-b border-gray-200 shrink-0">
          <h1 className="text-base font-bold text-gray-900">Accounts</h1>
          <p className="text-xs text-gray-400 mt-0.5">Financial Management</p>
        </div>

        <nav className="flex-1 p-2 space-y-3">
          {navGroups.map((group, gi) => {
            const visible = group.items.filter(i => user && i.roles.includes(user.role));
            if (!visible.length) return null;
            return (
              <div key={gi}>
                {group.label && (
                  <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">{group.label}</p>
                )}
                <div className="space-y-0.5">
                  {visible.map(item => <NavItemLink key={item.path} item={item} />)}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full text-left text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}

