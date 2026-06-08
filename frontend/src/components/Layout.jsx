import React, { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

const navItems = [
  { path: '/plants', label: '植物档案', icon: '🌿' },
  { path: '/calendar', label: '浇水日历', icon: '📅' },
  { path: '/care-logs', label: '养护日志', icon: '📝' },
  { path: '/warnings', label: '枯萎预警', icon: '⚠️' },
  { path: '/statistics', label: '数据统计', icon: '📊' },
]

const MOBILE_BREAKPOINT = 768

function Layout({ children }) {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT
      setIsMobile(mobile)
      if (!mobile) {
        setSidebarOpen(false)
        document.body.classList.remove('sidebar-open')
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.classList.add('sidebar-open')
    } else {
      document.body.classList.remove('sidebar-open')
    }
  }, [sidebarOpen, isMobile])

  const showSidebar = !isMobile || sidebarOpen

  return (
    <div className="layout">
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="切换菜单"
      >
        <span className={`hamburger ${sidebarOpen ? 'open' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      {isMobile && sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {showSidebar && (
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
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </aside>
      )}
      <main className="main-content">
        <Outlet />
        {children}
      </main>
    </div>
  )
}

export default Layout
