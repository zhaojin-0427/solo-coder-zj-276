import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts'
import { statisticsAPI } from '../api.js'

const COLORS = ['#22c55e', '#84cc16', '#eab308', '#f59e0b', '#ef4444', '#3b82f6']

const healthColorMap = {
  excellent: '#22c55e',
  good: '#84cc16',
  fair: '#eab308',
  poor: '#f59e0b',
  critical: '#ef4444',
}

const healthLabelMap = {
  excellent: '非常健康',
  good: '良好',
  fair: '一般',
  poor: '较差',
  critical: '危急',
}

function Statistics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const res = await statisticsAPI.get()
      setData(res.data)
    } catch (err) {
      console.error('加载统计数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="card"><p>加载中...</p></div>
  }

  if (!data) {
    return <div className="card"><p>数据加载失败</p></div>
  }

  const { summary, room_health, health_distribution, repot_distribution, cost_trend, watering_delay_rate } = data

  const roomHealthData = room_health.map((r) => ({
    name: r.room,
    平均健康度: r.avg_health_percent,
    植物数量: r.count,
  }))

  const healthDistData = Object.entries(health_distribution).map(([key, value]) => ({
    name: healthLabelMap[key] || key,
    value: value,
  }))

  const repotDistData = Object.entries(repot_distribution).map(([key, value]) => ({
    name: key,
    植物数量: value,
  }))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📊 数据统计</h1>
          <p className="page-subtitle">全面了解家庭绿植的养护状况</p>
        </div>
        <button className="btn btn-secondary" onClick={loadData}>
          🔄 刷新
        </button>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="card stats-card" style={{ borderTop: '4px solid var(--primary-dark)' }}>
          <div className="stats-value">{summary.total_plants}</div>
          <div className="stats-label">植物总数</div>
        </div>
        <div className="card stats-card" style={{ borderTop: '4px solid var(--info)' }}>
          <div className="stats-value">{summary.total_species}</div>
          <div className="stats-label">品种数量</div>
        </div>
        <div className="card stats-card" style={{ borderTop: '4px solid var(--warning)' }}>
          <div className="stats-value">{watering_delay_rate}%</div>
          <div className="stats-label">浇水延迟率</div>
        </div>
        <div className="card stats-card" style={{ borderTop: '4px solid #8b5cf6' }}>
          <div className="stats-value">¥{parseFloat(summary.total_care_cost) + parseFloat(summary.total_purchase_cost)}</div>
          <div className="stats-label">总投入成本</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🏠 各房间植物健康度</h3>
          </div>
          {roomHealthData.length === 0 ? (
            <div className="empty-state"><p>暂无数据</p></div>
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roomHealthData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="平均健康度" fill="#22c55e" name="健康度(%)" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="植物数量" fill="#3b82f6" name="植物数" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">💧 浇水延迟率</h3>
          </div>
          <div style={{ padding: '20px 0' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 48, fontWeight: 700, color: watering_delay_rate > 30 ? 'var(--danger)' : watering_delay_rate > 15 ? 'var(--warning)' : 'var(--primary-dark)' }}>
                {watering_delay_rate}%
              </div>
              <p style={{ color: 'var(--text-light)', fontSize: 14 }}>
                共有 {summary.overdue_watering_count} 株植物浇水延迟，累计延迟 {summary.total_delay_days} 天
              </p>
            </div>
            <div className="progress-bar" style={{ height: 24, borderRadius: 12 }}>
              <div
                className={`progress-fill ${watering_delay_rate > 30 ? 'danger' : watering_delay_rate > 15 ? 'warning' : 'success'}`}
                style={{ width: `${Math.min(watering_delay_rate, 100)}%`, borderRadius: 12 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: 'var(--text-light)' }}>
              <span>0% 理想</span>
              <span>15% 注意</span>
              <span>30% 警告</span>
            </div>
            <div className="divider" />
            <div className="grid grid-3" style={{ textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary-dark)' }}>
                  {summary.total_plants - summary.overdue_watering_count}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-light)' }}>按时浇水</p>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--warning)' }}>
                  {summary.overdue_watering_count}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-light)' }}>浇水延迟</p>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--danger)' }}>
                  {summary.total_delay_days}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-light)' }}>累计延迟天数</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🪴 换盆周期分布</h3>
          </div>
          {repotDistData.length === 0 ? (
            <div className="empty-state"><p>暂无数据</p></div>
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={repotDistData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="植物数量"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {repotDistData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">💰 养护成本趋势</h3>
          </div>
          {cost_trend.length === 0 ? (
            <div className="empty-state"><p>暂无数据</p></div>
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cost_trend} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="purchase_cost" stroke="#8b5cf6" name="购买成本" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="care_cost" stroke="#22c55e" name="养护成本" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="total_cost" stroke="#3b82f6" name="总成本" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <h3 className="card-title">💚 植物健康状态分布</h3>
          </div>
          {healthDistData.length === 0 ? (
            <div className="empty-state"><p>暂无数据</p></div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 40, padding: '20px 0' }}>
              <div style={{ flex: 1, minHeight: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={healthDistData}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {healthDistData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={Object.values(healthColorMap)[index % 5]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ marginBottom: 16 }}>详细数据</h4>
                {Object.entries(health_distribution).map(([key, value]) => {
                  const percent = summary.total_plants > 0 ? ((value / summary.total_plants) * 100).toFixed(1) : 0
                  return (
                    <div key={key} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontWeight: 500 }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: healthColorMap[key],
                              marginRight: 8,
                            }}
                          />
                          {healthLabelMap[key]}
                        </span>
                        <span style={{ color: 'var(--text-light)' }}>
                          {value} 株 ({percent}%)
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill success"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: healthColorMap[key],
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">📋 概览信息</h3>
        <div className="grid grid-4" style={{ marginTop: 16 }}>
          <div>
            <p className="stats-label">摆放位置</p>
            <p className="stats-value" style={{ fontSize: 24 }}>{summary.total_locations}</p>
          </div>
          <div>
            <p className="stats-label">养护总花费</p>
            <p className="stats-value" style={{ fontSize: 24, color: '#8b5cf6' }}>¥{summary.total_care_cost}</p>
          </div>
          <div>
            <p className="stats-label">购买总花费</p>
            <p className="stats-value" style={{ fontSize: 24, color: '#3b82f6' }}>¥{summary.total_purchase_cost}</p>
          </div>
          <div>
            <p className="stats-label">平均每株投入</p>
            <p className="stats-value" style={{ fontSize: 24, color: 'var(--primary-dark)' }}>
              ¥{summary.total_plants > 0 ? ((parseFloat(summary.total_care_cost) + parseFloat(summary.total_purchase_cost)) / summary.total_plants).toFixed(2) : 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Statistics
