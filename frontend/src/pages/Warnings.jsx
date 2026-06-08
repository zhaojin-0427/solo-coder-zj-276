import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { warningsAPI } from '../api.js'

function Warnings() {
  const navigate = useNavigate()
  const [warnings, setWarnings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWarnings()
  }, [])

  const loadWarnings = async () => {
    try {
      const res = await warningsAPI.list()
      setWarnings(res.data)
    } catch (err) {
      console.error('加载预警数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'danger'
      case 'medium': return ''
      default: return ''
    }
  }

  const getSeverityLabel = (severity) => {
    switch (severity) {
      case 'high': return 'badge-danger'
      case 'medium': return 'badge-warning'
      default: return 'badge-gray'
    }
  }

  const highCount = warnings.filter(w => w.warnings.some(wi => wi.severity === 'high')).length
  const mediumCount = warnings.filter(w => w.warnings.every(wi => wi.severity === 'medium')).length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚠️ 枯萎预警</h1>
          <p className="page-subtitle">及时发现需要关注的植物，避免枯萎</p>
        </div>
        <button className="btn btn-secondary" onClick={loadWarnings}>
          🔄 刷新
        </button>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <div className="card stats-card" style={{ borderTop: '4px solid var(--danger)' }}>
          <div className="stats-value" style={{ color: 'var(--danger)' }}>{highCount}</div>
          <div className="stats-label">高风险预警</div>
        </div>
        <div className="card stats-card" style={{ borderTop: '4px solid var(--warning)' }}>
          <div className="stats-value" style={{ color: 'var(--warning)' }}>{mediumCount}</div>
          <div className="stats-label">中风险预警</div>
        </div>
        <div className="card stats-card" style={{ borderTop: '4px solid var(--primary-dark)' }}>
          <div className="stats-value" style={{ color: 'var(--primary-dark)' }}>{warnings.length}</div>
          <div className="stats-label">需关注植物</div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p>加载中...</p>
        ) : warnings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎉</div>
            <h3 style={{ color: 'var(--primary-dark)', marginBottom: 8 }}>一切正常！</h3>
            <p>当前没有需要关注的植物，继续保持哦~</p>
          </div>
        ) : (
          warnings.map((warning, idx) => {
            const isHigh = warning.warnings.some(w => w.severity === 'high')
            return (
              <div
                key={idx}
                className={`warning-card ${getSeverityColor(isHigh ? 'high' : 'medium')}`}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/plants/${warning.plant_id}`)}
              >
                <div className="warning-header">
                  <div>
                    <span className="warning-plant-name">{warning.plant_name}</span>
                    <span style={{ color: 'var(--text-light)', fontSize: 13, marginLeft: 8 }}>
                      {warning.species_name} · {warning.location}
                    </span>
                  </div>
                  <button className="btn btn-sm btn-primary">
                    查看详情 →
                  </button>
                </div>
                <div className="warning-items">
                  {warning.warnings.map((w, i) => (
                    <span key={i} className={`badge ${getSeverityLabel(w.severity)}`}>
                      {w.message}
                    </span>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="card">
        <h3 className="card-title">💡 养护建议</h3>
        <div style={{ fontSize: 14, color: 'var(--text-light)', lineHeight: 1.8 }}>
          <p><strong>浇水延迟：</strong>及时检查土壤湿度，干透浇透，避免积水烂根</p>
          <p><strong>健康状态差：</strong>检查光照、温度是否适宜，观察是否有病虫害</p>
          <p><strong>定期检查：</strong>建议每周至少查看一次所有植物的状态</p>
          <p><strong>换季注意：</strong>季节变换时注意调整浇水频率和保暖/遮阳措施</p>
        </div>
      </div>
    </div>
  )
}

export default Warnings
