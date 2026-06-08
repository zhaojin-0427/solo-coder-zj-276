import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

const navItems = [
  { path: '/plants', label: '植物档案', icon: '🌿' },
  { path: '/calendar', label: '浇水日历', icon: '📅' },
  { path: '/care-logs', label: '养护日志', icon: '📝' },
  { path: '/warnings', label: '枯萎预警', icon: '⚠️' },
  { path: '/statistics', label: '数据统计', icon: '📊' },
]

function Layout({ children }) {
  const navigate = useNavigate()

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>
            <span className="icon">🌱</span>
            <span>绿植养护</span>
          </h1>
        </div>
        <ul className="nav-menu">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </aside>
      <main className="main-content">
        <Outlet />
        {children}
      </main>
    </div>
  )
}

export default Layout
