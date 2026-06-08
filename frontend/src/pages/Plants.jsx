import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { plantsAPI, speciesAPI, locationsAPI } from '../api.js'
import Modal from '../components/Modal.jsx'

const healthBadgeMap = {
  excellent: { text: '非常健康', class: 'badge-success' },
  good: { text: '良好', class: 'badge-success' },
  fair: { text: '一般', class: 'badge-warning' },
  poor: { text: '较差', class: 'badge-warning' },
  critical: { text: '危急', class: 'badge-danger' },
}

function Plants() {
  const navigate = useNavigate()
  const [plants, setPlants] = useState([])
  const [species, setSpecies] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filters, setFilters] = useState({ health: '', location: '', species: '' })
  const [formData, setFormData] = useState({
    name: '',
    species: '',
    location: '',
    purchase_date: new Date().toISOString().split('T')[0],
    health_status: 'good',
    purchase_cost: '',
    notes: '',
    last_watered: '',
    last_fertilized: '',
    last_repotted: '',
    last_pruned: '',
  })

  useEffect(() => {
    loadData()
  }, [filters])

  const loadData = async () => {
    try {
      const [plantsRes, speciesRes, locationsRes] = await Promise.all([
        plantsAPI.list(filters),
        speciesAPI.list(),
        locationsAPI.list(),
      ])
      setPlants(plantsRes.data.results || plantsRes.data)
      setSpecies(speciesRes.data.results || speciesRes.data)
      setLocations(locationsRes.data.results || locationsRes.data)
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
      await plantsAPI.create(submitData)
      setShowModal(false)
      resetForm()
      loadData()
    } catch (err) {
      alert('添加失败：' + (err.response?.data?.detail || '未知错误'))
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      species: '',
      location: '',
      purchase_date: new Date().toISOString().split('T')[0],
      health_status: 'good',
      purchase_cost: '',
      notes: '',
      last_watered: '',
      last_fertilized: '',
      last_repotted: '',
      last_pruned: '',
    })
  }

  const handleWaterNow = async (e, plantId) => {
    e.stopPropagation()
    try {
      await plantsAPI.markWatered(plantId)
      loadData()
    } catch (err) {
      console.error('标记浇水失败:', err)
    }
  }

  const handleDelete = async (e, plantId) => {
    e.stopPropagation()
    if (!confirm('确定要删除这株植物吗？')) return
    try {
      await plantsAPI.delete(plantId)
      loadData()
    } catch (err) {
      console.error('删除失败:', err)
    }
  }

  if (loading) {
    return <div className="card"><p>加载中...</p></div>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🌿 植物档案</h1>
          <p className="page-subtitle">管理家中所有绿植的基本信息</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + 添加植物
        </button>
      </div>

      <div className="card">
        <div className="filter-bar">
          <select
            className="form-select"
            value={filters.health}
            onChange={(e) => setFilters({ ...filters, health: e.target.value })}
          >
            <option value="">所有健康状态</option>
            <option value="excellent">非常健康</option>
            <option value="good">良好</option>
            <option value="fair">一般</option>
            <option value="poor">较差</option>
            <option value="critical">危急</option>
          </select>
          <select
            className="form-select"
            value={filters.species}
            onChange={(e) => setFilters({ ...filters, species: e.target.value })}
          >
            <option value="">所有品种</option>
            {species.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            className="form-select"
            value={filters.location}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
          >
            <option value="">所有位置</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.room_type_display} - {l.name}</option>
            ))}
          </select>
        </div>

        {plants.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🪴</div>
            <p>还没有添加植物，点击"添加植物"开始吧</p>
          </div>
        ) : (
          <div className="grid grid-3">
            {plants.map((plant) => {
              const badge = healthBadgeMap[plant.health_status] || healthBadgeMap.good
              return (
                <div
                  key={plant.id}
                  className="plant-card"
                  onClick={() => navigate(`/plants/${plant.id}`)}
                >
                  <div className="plant-card-header">
                    <h3>{plant.name}</h3>
                    <p>{plant.species_detail?.name || '未知品种'}</p>
                  </div>
                  <div className="plant-card-body">
                    <div className="plant-info-item">
                      <span className="plant-info-label">位置</span>
                      <span className="plant-info-value">
                        {plant.location_detail?.name || '未知'}
                      </span>
                    </div>
                    <div className="plant-info-item">
                      <span className="plant-info-label">健康状态</span>
                      <span className={`badge ${badge.class}`}>{badge.text}</span>
                    </div>
                    <div className="plant-info-item">
                      <span className="plant-info-label">下次浇水</span>
                      <span className="plant-info-value">
                        {plant.is_overdue_watering ? (
                          <span className="badge badge-danger">
                            延迟 {plant.watering_delay_days} 天
                          </span>
                        ) : (
                          <span className="badge badge-info">
                            {plant.days_until_watering} 天后
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="plant-info-item">
                      <span className="plant-info-label">养护天数</span>
                      <span className="plant-info-value">{plant.days_since_purchase} 天</span>
                    </div>
                    <div className="divider" />
                    <div className="actions">
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={(e) => handleWaterNow(e, plant.id)}
                      >
                        💧 浇水
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={(e) => handleDelete(e, plant.id)}
                      >
                        🗑️ 删除
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="添加新植物"
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
            <label className="form-label">植物昵称 *</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="给它起个名字吧"
              required
            />
          </div>
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">品种 *</label>
              <select
                className="form-select"
                value={formData.species}
                onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                required
              >
                <option value="">请选择品种</option>
                {species.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">摆放位置 *</label>
              <select
                className="form-select"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              >
                <option value="">请选择位置</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.room_type_display} - {l.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">购买日期 *</label>
              <input
                type="date"
                className="form-input"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">购买成本（元）</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={formData.purchase_cost}
                onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">健康状态</label>
            <select
              className="form-select"
              value={formData.health_status}
              onChange={(e) => setFormData({ ...formData, health_status: e.target.value })}
            >
              <option value="excellent">非常健康</option>
              <option value="good">良好</option>
              <option value="fair">一般</option>
              <option value="poor">较差</option>
              <option value="critical">危急</option>
            </select>
          </div>
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">上次浇水日期</label>
              <input
                type="date"
                className="form-input"
                value={formData.last_watered}
                onChange={(e) => setFormData({ ...formData, last_watered: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">上次施肥日期</label>
              <input
                type="date"
                className="form-input"
                value={formData.last_fertilized}
                onChange={(e) => setFormData({ ...formData, last_fertilized: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">上次换盆日期</label>
              <input
                type="date"
                className="form-input"
                value={formData.last_repotted}
                onChange={(e) => setFormData({ ...formData, last_repotted: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">上次修剪日期</label>
              <input
                type="date"
                className="form-input"
                value={formData.last_pruned}
                onChange={(e) => setFormData({ ...formData, last_pruned: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">备注</label>
            <textarea
              className="form-textarea"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="记录一些养护注意事项..."
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Plants
