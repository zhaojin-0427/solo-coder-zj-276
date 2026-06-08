import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { plantsAPI, careLogsAPI } from '../api.js'
import Modal from '../components/Modal.jsx'

const healthBadgeMap = {
  excellent: { text: '非常健康', class: 'badge-success' },
  good: { text: '良好', class: 'badge-success' },
  fair: { text: '一般', class: 'badge-warning' },
  poor: { text: '较差', class: 'badge-warning' },
  critical: { text: '危急', class: 'badge-danger' },
}

const careTypeMap = {
  water: { text: '💧 浇水', class: 'badge-info' },
  fertilize: { text: '🌱 施肥', class: 'badge-success' },
  repot: { text: '🪴 换盆', class: 'badge-warning' },
  prune: { text: '✂️ 修剪', class: 'badge-gray' },
  other: { text: '📝 其他', class: 'badge-gray' },
}

function PlantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [plant, setPlant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showActionModal, setShowActionModal] = useState(false)
  const [currentAction, setCurrentAction] = useState(null)
  const [actionForm, setActionForm] = useState({ cost: '', notes: '' })

  useEffect(() => {
    loadPlant()
  }, [id])

  const loadPlant = async () => {
    try {
      const res = await plantsAPI.get(id)
      setPlant(res.data)
    } catch (err) {
      console.error('加载植物详情失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const openActionModal = (action) => {
    setCurrentAction(action)
    setActionForm({ cost: '', notes: '' })
    setShowActionModal(true)
  }

  const handleAction = async () => {
    try {
      const actions = {
        water: plantsAPI.markWatered,
        fertilize: plantsAPI.markFertilized,
        repot: plantsAPI.markRepotted,
        prune: plantsAPI.markPruned,
      }
      const actionFn = actions[currentAction]
      if (actionFn) {
        if (currentAction === 'water') {
          await actionFn(id)
        } else {
          await actionFn(id, actionForm)
        }
      }
      setShowActionModal(false)
      loadPlant()
    } catch (err) {
      console.error('操作失败:', err)
      alert('操作失败')
    }
  }

  const handleDeleteLog = async (logId) => {
    if (!confirm('确定删除这条记录吗？')) return
    try {
      await careLogsAPI.delete(logId)
      loadPlant()
    } catch (err) {
      console.error('删除记录失败:', err)
    }
  }

  if (loading) {
    return <div className="card"><p>加载中...</p></div>
  }

  if (!plant) {
    return <div className="card"><p>植物不存在</p></div>
  }

  const badge = healthBadgeMap[plant.health_status] || healthBadgeMap.good
  const actionLabels = {
    water: { title: '记录浇水', showCost: false },
    fertilize: { title: '记录施肥', showCost: true },
    repot: { title: '记录换盆', showCost: true },
    prune: { title: '记录修剪', showCost: false },
  }
  const actionConfig = actionLabels[currentAction] || {}

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/plants')} style={{ marginBottom: 8 }}>
            ← 返回列表
          </button>
          <h1 className="page-title">🌿 {plant.name}</h1>
          <p className="page-subtitle">{plant.species_detail?.name} · {plant.location_detail?.room_type_display} - {plant.location_detail?.name}</p>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">基本信息</h3>
          </div>
          <div className="plant-info-item">
            <span className="plant-info-label">品种</span>
            <span className="plant-info-value">{plant.species_detail?.name}</span>
          </div>
          <div className="plant-info-item">
            <span className="plant-info-label">学名</span>
            <span className="plant-info-value">{plant.species_detail?.scientific_name || '-'}</span>
          </div>
          <div className="plant-info-item">
            <span className="plant-info-label">摆放位置</span>
            <span className="plant-info-value">{plant.location_detail?.room_type_display} - {plant.location_detail?.name}</span>
          </div>
          <div className="plant-info-item">
            <span className="plant-info-label">购买日期</span>
            <span className="plant-info-value">{plant.purchase_date}</span>
          </div>
          <div className="plant-info-item">
            <span className="plant-info-label">养护天数</span>
            <span className="plant-info-value">{plant.days_since_purchase} 天</span>
          </div>
          <div className="plant-info-item">
            <span className="plant-info-label">购买成本</span>
            <span className="plant-info-value">¥{plant.purchase_cost}</span>
          </div>
          <div className="plant-info-item">
            <span className="plant-info-label">健康状态</span>
            <span className={`badge ${badge.class}`}>{badge.text}</span>
          </div>
          {plant.notes && (
            <>
              <div className="divider" />
              <p style={{ fontSize: 14, color: 'var(--text-light)' }}>{plant.notes}</p>
            </>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">养护状态</h3>
          </div>
          <div className="plant-info-item">
            <span className="plant-info-label">基础浇水间隔</span>
            <span className="plant-info-value">{plant.species_detail?.base_watering_days} 天</span>
          </div>
          <div className="plant-info-item">
            <span className="plant-info-label">当季浇水间隔</span>
            <span className="plant-info-value">{plant.species_detail?.seasonal_watering_days} 天</span>
          </div>
          <div className="plant-info-item">
            <span className="plant-info-label">上次浇水</span>
            <span className="plant-info-value">{plant.last_watered || '未记录'}</span>
          </div>
          <div className="plant-info-item">
            <span className="plant-info-label">下次浇水</span>
            <span className="plant-info-value">
              {plant.is_overdue_watering ? (
                <span className="badge badge-danger">
                  已延迟 {plant.watering_delay_days} 天
                </span>
              ) : (
                <span className="badge badge-info">
                  {plant.days_until_watering} 天后 ({plant.next_watering_date})
                </span>
              )}
            </span>
          </div>
          <div className="plant-info-item">
            <span className="plant-info-label">上次施肥</span>
            <span className="plant-info-value">{plant.last_fertilized || '未记录'}</span>
          </div>
          <div className="plant-info-item">
            <span className="plant-info-label">上次换盆</span>
            <span className="plant-info-value">{plant.last_repotted || '未记录'}</span>
          </div>
          <div className="plant-info-item">
            <span className="plant-info-label">上次修剪</span>
            <span className="plant-info-value">{plant.last_pruned || '未记录'}</span>
          </div>
          <div className="divider" />
          <div className="plant-info-item">
            <span className="plant-info-label">光照需求</span>
            <span className="plant-info-value">{plant.species_detail?.sunlight_display}</span>
          </div>
          <div className="plant-info-item">
            <span className="plant-info-label">耐受温度</span>
            <span className="plant-info-value">{plant.species_detail?.min_temperature}℃ ~ {plant.species_detail?.max_temperature}℃</span>
          </div>
          <div className="plant-info-item">
            <span className="plant-info-label">养护难度</span>
            <span className="plant-info-value">{'⭐'.repeat(plant.species_detail?.difficulty || 3)}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">快捷养护操作</h3>
        </div>
        <div className="actions" style={{ flexWrap: 'wrap', gap: 12 }}>
          <button className="btn btn-primary" onClick={() => openActionModal('water')}>
            💧 记录浇水
          </button>
          <button className="btn btn-primary" onClick={() => openActionModal('fertilize')}>
            🌱 记录施肥
          </button>
          <button className="btn btn-primary" onClick={() => openActionModal('repot')}>
            🪴 记录换盆
          </button>
          <button className="btn btn-primary" onClick={() => openActionModal('prune')}>
            ✂️ 记录修剪
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">养护历史记录</h3>
          <span className="badge badge-gray">共 {plant.care_logs?.length || 0} 条</span>
        </div>
        {(!plant.care_logs || plant.care_logs.length === 0) ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <p>暂无养护记录</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>类型</th>
                <th>花费</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {plant.care_logs.map((log) => {
                const typeInfo = careTypeMap[log.care_type] || careTypeMap.other
                return (
                  <tr key={log.id}>
                    <td>{log.date}</td>
                    <td>
                      <span className={`badge ${typeInfo.class}`}>{typeInfo.text}</span>
                    </td>
                    <td>{log.cost > 0 ? `¥${log.cost}` : '-'}</td>
                    <td>{log.notes || '-'}</td>
                    <td>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteLog(log.id)}>
                        删除
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
        title={actionConfig.title}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowActionModal(false)}>
              取消
            </button>
            <button className="btn btn-primary" onClick={handleAction}>
              确认
            </button>
          </>
        }
      >
        {actionConfig.showCost && (
          <div className="form-group">
            <label className="form-label">花费金额（元）</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={actionForm.cost}
              onChange={(e) => setActionForm({ ...actionForm, cost: e.target.value })}
              placeholder="0.00"
            />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">备注</label>
          <textarea
            className="form-textarea"
            value={actionForm.notes}
            onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })}
            placeholder="记录一些细节..."
          />
        </div>
      </Modal>
    </div>
  )
}

export default PlantDetail
