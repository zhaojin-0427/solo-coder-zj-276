import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { careLogsAPI, plantsAPI } from '../api.js'
import Modal from '../components/Modal.jsx'

const careTypeMap = {
  water: { text: '💧 浇水', class: 'badge-info' },
  fertilize: { text: '🌱 施肥', class: 'badge-success' },
  repot: { text: '🪴 换盆', class: 'badge-warning' },
  prune: { text: '✂️ 修剪', class: 'badge-gray' },
  other: { text: '📝 其他', class: 'badge-gray' },
}

function CareLogs() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [plants, setPlants] = useState([])
  const [summary, setSummary] = useState({
    total_count: 0,
    water_count: 0,
    fertilize_count: 0,
    total_cost: 0,
  })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filters, setFilters] = useState({ plant: '', type: '', start_date: '', end_date: '' })
  const [formData, setFormData] = useState({
    plant: '',
    care_type: 'water',
    date: new Date().toISOString().split('T')[0],
    cost: '',
    notes: '',
  })

  useEffect(() => {
    loadData()
  }, [filters])

  const loadData = async () => {
    try {
      const params = {}
      Object.keys(filters).forEach(key => {
        if (filters[key]) params[key] = filters[key]
      })
      const [logsRes, plantsRes, summaryRes] = await Promise.all([
        careLogsAPI.list(params),
        plantsAPI.list(),
        careLogsAPI.summary(params),
      ])
      setLogs(logsRes.data.results || logsRes.data)
      setPlants(plantsRes.data.results || plantsRes.data)
      setSummary(summaryRes.data)
    } catch (err) {
      console.error('加载数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const submitData = { ...formData }
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '') delete submitData[key]
      })
      await careLogsAPI.create(submitData)
      setShowModal(false)
      setFormData({
        plant: '',
        care_type: 'water',
        date: new Date().toISOString().split('T')[0],
        cost: '',
        notes: '',
      })
      loadData()
    } catch (err) {
      alert('添加失败')
    }
  }

  const handleDelete = async (logId) => {
    if (!confirm('确定删除这条记录吗？')) return
    try {
      await careLogsAPI.delete(logId)
      loadData()
    } catch (err) {
      console.error('删除失败:', err)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📝 养护日志</h1>
          <p className="page-subtitle">记录每一次养护操作，追踪植物养护历史</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + 添加记录
        </button>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="card stats-card">
          <div className="stats-value">{summary.total_count}</div>
          <div className="stats-label">总记录数</div>
        </div>
        <div className="card stats-card">
          <div className="stats-value">{summary.water_count}</div>
          <div className="stats-label">浇水次数</div>
        </div>
        <div className="card stats-card">
          <div className="stats-value">{summary.fertilize_count}</div>
          <div className="stats-label">施肥次数</div>
        </div>
        <div className="card stats-card">
          <div className="stats-value">¥{summary.total_cost}</div>
          <div className="stats-label">养护总花费</div>
        </div>
      </div>

      <div className="card">
        <div className="filter-bar">
          <select
            className="form-select"
            value={filters.plant}
            onChange={(e) => setFilters({ ...filters, plant: e.target.value })}
          >
            <option value="">所有植物</option>
            {plants.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            className="form-select"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="">所有类型</option>
            <option value="water">💧 浇水</option>
            <option value="fertilize">🌱 施肥</option>
            <option value="repot">🪴 换盆</option>
            <option value="prune">✂️ 修剪</option>
            <option value="other">📝 其他</option>
          </select>
          <input
            type="date"
            className="form-input"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            placeholder="开始日期"
          />
          <input
            type="date"
            className="form-input"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            placeholder="结束日期"
          />
        </div>

        {loading ? (
          <p>加载中...</p>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <p>暂无养护记录</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>日期</th>
                  <th>植物</th>
                  <th>类型</th>
                  <th>花费</th>
                  <th>备注</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const typeInfo = careTypeMap[log.care_type] || careTypeMap.other
                  return (
                    <tr key={log.id}>
                      <td>{log.date}</td>
                      <td
                        style={{ cursor: 'pointer', color: 'var(--primary-dark)', fontWeight: 500 }}
                        onClick={() => navigate(`/plants/${log.plant}`)}
                      >
                        {log.plant_name || `植物 #${log.plant}`}
                      </td>
                      <td>
                        <span className={`badge ${typeInfo.class}`}>{typeInfo.text}</span>
                      </td>
                      <td>{log.cost > 0 ? `¥${log.cost}` : '-'}</td>
                      <td>{log.notes || '-'}</td>
                      <td>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(log.id)}>
                          删除
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div style={{ marginTop: 16, textAlign: 'center', color: 'var(--text-light)', fontSize: 13 }}>
              共 {logs.length} 条记录
            </div>
          </>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="添加养护记录"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
              取消
            </button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              确认添加
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">植物 *</label>
            <select
              className="form-select"
              value={formData.plant}
              onChange={(e) => setFormData({ ...formData, plant: e.target.value })}
              required
            >
              <option value="">请选择植物</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">养护类型 *</label>
              <select
                className="form-select"
                value={formData.care_type}
                onChange={(e) => setFormData({ ...formData, care_type: e.target.value })}
                required
              >
                <option value="water">💧 浇水</option>
                <option value="fertilize">🌱 施肥</option>
                <option value="repot">🪴 换盆</option>
                <option value="prune">✂️ 修剪</option>
                <option value="other">📝 其他</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">日期 *</label>
              <input
                type="date"
                className="form-input"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">花费金额（元）</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label className="form-label">备注</label>
            <textarea
              className="form-textarea"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="记录一些细节..."
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default CareLogs
