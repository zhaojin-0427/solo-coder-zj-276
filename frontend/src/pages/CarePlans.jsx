import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import {
  carePlansAPI,
  carePlanTasksAPI,
  plantsAPI,
  locationsAPI,
} from '../api.js'
import Modal from '../components/Modal.jsx'

const careTypeMap = {
  water: { text: '💧 浇水', class: 'badge-info', color: '#3b82f6' },
  fertilize: { text: '🌱 施肥', class: 'badge-success', color: '#22c55e' },
  repot: { text: '🪴 换盆', class: 'badge-warning', color: '#f59e0b' },
  prune: { text: '✂️ 修剪', class: 'badge-gray', color: '#6b7280' },
}

const taskStatusMap = {
  pending: { text: '待执行', class: 'badge-info' },
  completed: { text: '已完成', class: 'badge-success' },
  skipped: { text: '已跳过', class: 'badge-gray' },
  overdue: { text: '已逾期', class: 'badge-danger' },
  rescheduled: { text: '已改期', class: 'badge-warning' },
}

const planStatusMap = {
  draft: { text: '草稿', class: 'badge-gray' },
  active: { text: '生效中', class: 'badge-success' },
  completed: { text: '已完成', class: 'badge-info' },
  cancelled: { text: '已取消', class: 'badge-danger' },
}

function CarePlans() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [tasks, setTasks] = useState([])
  const [plants, setPlants] = useState([])
  const [locations, setLocations] = useState([])
  const [stats, setStats] = useState(null)
  const [riskWarnings, setRiskWarnings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('plans')
  const [selectedTasks, setSelectedTasks] = useState([])
  const [dragTask, setDragTask] = useState(null)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false)
  const [currentTask, setCurrentTask] = useState(null)
  const [generateForm, setGenerateForm] = useState({
    name: '',
    scope_type: 'all',
    plant_ids: [],
    location_id: '',
    start_date: dayjs().format('YYYY-MM-DD'),
    days: 90,
    care_types: ['water', 'fertilize', 'repot', 'prune'],
    custom_rules: {},
    notes: '',
  })
  const [formErrors, setFormErrors] = useState({})

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [plansRes, tasksRes, plantsRes, locationsRes, statsRes, warningsRes] = await Promise.all([
        carePlansAPI.list(),
        carePlanTasksAPI.list(),
        plantsAPI.list(),
        locationsAPI.list(),
        carePlanTasksAPI.stats(),
        carePlanTasksAPI.riskWarnings(),
      ])
      setPlans(plansRes.data.results || plansRes.data)
      setTasks(tasksRes.data.results || tasksRes.data)
      setPlants(plantsRes.data.results || plantsRes.data)
      setLocations(locationsRes.data.results || locationsRes.data)
      setStats(statsRes.data)
      setRiskWarnings(warningsRes.data)
    } catch (err) {
      console.error('加载数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async (e) => {
    if (e) e.preventDefault()
    const errors = {}
    if (!generateForm.name.trim()) errors.name = '请输入计划名称'
    if (generateForm.scope_type === 'single' && generateForm.plant_ids.length === 0) {
      errors.plant_ids = '请选择至少一株植物'
    }
    if (generateForm.scope_type === 'room' && !generateForm.location_id) {
      errors.location_id = '请选择房间'
    }
    if (generateForm.care_types.length === 0) {
      errors.care_types = '请至少选择一种养护类型'
    }
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    try {
      const submitData = { ...generateForm }
      if (generateForm.scope_type !== 'single') delete submitData.plant_ids
      if (generateForm.scope_type !== 'room') delete submitData.location_id
      if (!submitData.name) {
        submitData.name = `养护计划 ${dayjs().format('YYYY-MM-DD')}`
      }
      await carePlansAPI.generate(submitData)
      setShowGenerateModal(false)
      loadAllData()
      alert('计划生成成功！')
    } catch (err) {
      alert('生成失败：' + (err.response?.data?.error || '未知错误'))
    }
  }

  const handleTaskComplete = async (taskId) => {
    try {
      await carePlanTasksAPI.complete(taskId)
      loadAllData()
    } catch (err) {
      console.error('完成任务失败:', err)
    }
  }

  const handleTaskSkip = async (taskId) => {
    if (!confirm('确定要跳过这个任务吗？')) return
    try {
      await carePlanTasksAPI.skip(taskId)
      loadAllData()
    } catch (err) {
      console.error('跳过任务失败:', err)
    }
  }

  const handleTaskReschedule = async (taskId, newDate) => {
    try {
      const res = await carePlanTasksAPI.reschedule(taskId, { scheduled_date: newDate })
      loadAllData()
      return { success: true, data: res.data }
    } catch (err) {
      alert(err.response?.data?.error || '改期失败')
      return { success: false, error: err.response?.data?.error }
    }
  }

  const handleBatchComplete = async () => {
    if (selectedTasks.length === 0) return
    if (!confirm(`确定批量完成选中的 ${selectedTasks.length} 个任务吗？`)) return
    try {
      await carePlanTasksAPI.batchComplete(selectedTasks)
      setSelectedTasks([])
      loadAllData()
    } catch (err) {
      console.error('批量完成失败:', err)
    }
  }

  const toggleTaskSelect = (taskId) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    )
  }

  const selectAllPendingTasks = () => {
    const pendingIds = tasks
      .filter((t) => t.status === 'pending' || t.status === 'overdue')
      .map((t) => t.id)
    setSelectedTasks(pendingIds)
  }

  const handleDragStart = (task) => {
    setDragTask(task)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = async (e, dateStr) => {
    e.preventDefault()
    if (!dragTask) return
    const result = await handleTaskReschedule(dragTask.id, dateStr)
    if (result.success) {
      setDragTask(null)
    }
  }

  const openTaskDetail = (task) => {
    setCurrentTask(task)
    setShowTaskDetailModal(true)
  }

  const handleCancelPlan = async (planId) => {
    if (!confirm('确定要取消这个计划吗？相关未执行任务将被标记为跳过。')) return
    try {
      await carePlansAPI.cancel(planId)
      loadAllData()
    } catch (err) {
      console.error('取消计划失败:', err)
    }
  }

  if (loading) {
    return <div className="card"><p>加载中...</p></div>
  }

  const today = dayjs()
  const next7Days = []
  for (let i = 0; i < 7; i++) {
    next7Days.push(today.add(i, 'day'))
  }

  const tasksByDate = {}
  next7Days.forEach((d) => {
    tasksByDate[d.format('YYYY-MM-DD')] = []
  })
  tasks.forEach((task) => {
    const dateKey = task.scheduled_date
    if (tasksByDate[dateKey] !== undefined) {
      tasksByDate[dateKey].push(task)
    }
  })

  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'overdue')
  const highRiskWarnings = riskWarnings.filter((w) => w.severity === 'high')

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 智能养护计划中心</h1>
          <p className="page-subtitle">智能生成养护计划，自动避让冲突，灵活管理每一株绿植</p>
        </div>
        <div className="actions">
          <button className="btn btn-secondary" onClick={loadAllData}>
            🔄 刷新
          </button>
          <button className="btn btn-primary" onClick={() => setShowGenerateModal(true)}>
            + 生成养护计划
          </button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="card stats-card" style={{ borderTop: '4px solid var(--primary-dark)' }}>
          <div className="stats-value">{stats?.total || 0}</div>
          <div className="stats-label">计划任务总数</div>
        </div>
        <div className="card stats-card" style={{ borderTop: '4px solid var(--info)' }}>
          <div className="stats-value">{stats?.completion_rate || 0}%</div>
          <div className="stats-label">任务完成率</div>
        </div>
        <div className="card stats-card" style={{ borderTop: '4px solid var(--warning)' }}>
          <div className="stats-value">{stats?.deviation_rate || 0}%</div>
          <div className="stats-label">执行偏差率</div>
        </div>
        <div className="card stats-card" style={{ borderTop: '4px solid var(--danger)' }}>
          <div className="stats-value">{stats?.upcoming_7days || 0}</div>
          <div className="stats-label">未来7天待办</div>
        </div>
      </div>

      {highRiskWarnings.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid var(--danger)', marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">🚨 高风险预警</h3>
            <span className="badge badge-danger">{highRiskWarnings.length} 项紧急任务</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {highRiskWarnings.slice(0, 6).map((w) => (
              <div
                key={w.task_id}
                className="warning-card"
                style={{ cursor: 'pointer', flex: '1 1 300px', marginBottom: 0 }}
                onClick={() => navigate(`/plants/${w.plant_id}`)}
              >
                <div style={{ fontWeight: 600 }}>
                  {careTypeMap[w.care_type]?.text} - {w.plant_name}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 4 }}>
                  {w.is_overdue ? `已逾期 ${Math.abs(w.days_until_due)} 天` : `${w.days_until_due} 天后到期`}
                  <span style={{ marginLeft: 8 }}>{w.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
            onClick={() => setActiveTab('plans')}
          >
            📄 养护计划
          </button>
          <button
            className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            ✅ 任务管理
          </button>
          <button
            className={`tab-btn ${activeTab === 'weekview' ? 'active' : ''}`}
            onClick={() => setActiveTab('weekview')}
          >
            📅 未来7天
          </button>
        </div>

        {activeTab === 'plans' && (
          <div>
            {plans.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <p>还没有养护计划，点击"生成养护计划"开始</p>
              </div>
            ) : (
              <div className="grid grid-2">
                {plans.map((plan) => {
                  const statusBadge = planStatusMap[plan.status] || planStatusMap.draft
                  const summary = plan.tasks_summary || {}
                  return (
                    <div key={plan.id} className="plan-card">
                      <div className="plan-card-header">
                        <div>
                          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{plan.name}</h3>
                          <div style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 4 }}>
                            {plan.scope_type_display}
                            {plan.plant_name && ` · ${plan.plant_name}`}
                            {plan.location_name && ` · ${plan.location_name}`}
                          </div>
                        </div>
                        <span className={`badge ${statusBadge.class}`}>{statusBadge.text}</span>
                      </div>
                      <div className="plan-card-body">
                        <div className="plant-info-item">
                          <span className="plant-info-label">计划周期</span>
                          <span className="plant-info-value">{plan.start_date} ~ {plan.end_date}</span>
                        </div>
                        <div className="progress-wrapper">
                          <div className="progress-bar" style={{ height: 10 }}>
                            <div
                              className="progress-fill success"
                              style={{ width: `${summary.completion_rate || 0}%`, borderRadius: 5 }}
                            />
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <span>完成率: {summary.completion_rate || 0}%</span>
                            <span>
                              {summary.completed || 0}完成 / {summary.pending || 0}待办 / {summary.skipped || 0}跳过
                              {summary.overdue > 0 && <span style={{ color: 'var(--danger)' }}> / {summary.overdue}逾期</span>}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="plan-card-footer">
                        <span style={{ fontSize: 12, color: 'var(--text-light)' }}>
                          创建于 {dayjs(plan.created_at).format('YYYY-MM-DD')}
                        </span>
                        {plan.status === 'active' && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleCancelPlan(plan.id)}
                          >
                            取消计划
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    onChange={selectAllPendingTasks}
                    checked={
                      pendingTasks.length > 0 &&
                      pendingTasks.every((t) => selectedTasks.includes(t.id))
                    }
                  />
                  全选待执行
                </label>
                {selectedTasks.length > 0 && (
                  <span className="badge badge-info">已选 {selectedTasks.length} 项</span>
                )}
              </div>
              {selectedTasks.length > 0 && (
                <button className="btn btn-primary btn-sm" onClick={handleBatchComplete}>
                  ✅ 批量完成选中任务
                </button>
              )}
            </div>
            {tasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <p>还没有任务，请先生成养护计划</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th>
                    <th>日期</th>
                    <th>植物</th>
                    <th>类型</th>
                    <th>状态</th>
                    <th>偏差</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => {
                    const typeInfo = careTypeMap[task.care_type] || careTypeMap.water
                    const statusInfo = taskStatusMap[task.status] || taskStatusMap.pending
                    const isOverdue = task.is_overdue || (task.status === 'pending' && dayjs(task.scheduled_date).isBefore(dayjs(), 'day'))
                    const canSelect = task.status === 'pending' || task.status === 'overdue'
                    return (
                      <tr
                        key={task.id}
                        draggable={canSelect}
                        onDragStart={() => handleDragStart(task)}
                        style={{ cursor: canSelect ? 'move' : 'default' }}
                      >
                        <td>
                          {canSelect && (
                            <input
                              type="checkbox"
                              checked={selectedTasks.includes(task.id)}
                              onChange={() => toggleTaskSelect(task.id)}
                            />
                          )}
                        </td>
                        <td
                          onClick={() => openTaskDetail(task)}
                          style={{ cursor: 'pointer', fontWeight: 500 }}
                        >
                          {task.scheduled_date}
                          {isOverdue && <span className="badge badge-danger" style={{ marginLeft: 8 }}>逾期</span>}
                        </td>
                        <td
                          style={{ cursor: 'pointer', color: 'var(--primary-dark)' }}
                          onClick={() => navigate(`/plants/${task.plant}`)}
                        >
                          {task.plant_name || `#${task.plant}`}
                        </td>
                        <td>
                          <span className={`badge ${typeInfo.class}`}>{typeInfo.text}</span>
                        </td>
                        <td>
                          <span className={`badge ${statusInfo.class}`}>{statusInfo.text}</span>
                        </td>
                        <td>
                          {task.status === 'completed' && task.deviation_days !== undefined
                            ? task.deviation_days > 1
                              ? <span style={{ color: 'var(--warning)' }}>+{task.deviation_days} 天</span>
                              : <span style={{ color: 'var(--primary-dark)' }}>准时</span>
                            : '-'}
                        </td>
                        <td>
                          <div className="actions" style={{ flexWrap: 'wrap' }}>
                            {canSelect && (
                              <>
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => handleTaskComplete(task.id)}
                                >
                                  完成
                                </button>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => handleTaskSkip(task.id)}
                                >
                                  跳过
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'weekview' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 16 }}>
              💡 提示：可拖动任务卡片到其他日期进行改期
            </p>
            <div className="week-grid">
              {next7Days.map((day, idx) => {
                const dateKey = day.format('YYYY-MM-DD')
                const dayTasks = tasksByDate[dateKey] || []
                const isToday = day.isSame(dayjs(), 'day')
                return (
                  <div
                    key={dateKey}
                    className={`week-day ${isToday ? 'today' : ''}`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, dateKey)}
                  >
                    <div className="week-day-header">
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {['日', '一', '二', '三', '四', '五', '六'][day.day()]}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: isToday ? 'var(--primary-dark)' : 'inherit' }}>
                        {day.date()}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-light)' }}>
                        {dayTasks.length} 项
                      </div>
                    </div>
                    <div className="week-day-body">
                      {dayTasks.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text-light)', textAlign: 'center', padding: 20 }}>
                          无任务
                        </div>
                      ) : (
                        dayTasks.map((task) => {
                          const typeInfo = careTypeMap[task.care_type] || careTypeMap.water
                          const isOverdue = task.status === 'pending' && day.isBefore(dayjs(), 'day')
                          const canDrag = task.status === 'pending' || task.status === 'overdue'
                          return (
                            <div
                              key={task.id}
                              className={`task-card ${isOverdue ? 'overdue' : ''}`}
                              draggable={canDrag}
                              onDragStart={() => handleDragStart(task)}
                              onClick={() => openTaskDetail(task)}
                              style={{ borderLeft: `3px solid ${typeInfo.color}` }}
                            >
                              <div style={{ fontSize: 12, fontWeight: 600 }}>
                                {typeInfo.text}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>
                                {task.plant_name}
                              </div>
                              <div style={{ marginTop: 4 }}>
                                <span className={`badge ${taskStatusMap[task.status]?.class || 'badge-info'}`} style={{ fontSize: 10 }}>
                                  {taskStatusMap[task.status]?.text}
                                </span>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">💡 使用说明</h3>
        <div style={{ fontSize: 14, color: 'var(--text-light)', lineHeight: 1.8 }}>
          <p><strong>智能生成：</strong>系统根据植物品种特性、最近养护记录、季节变化自动生成未来 90 天计划</p>
          <p><strong>冲突避让：</strong>同一天不会安排冲突操作（如换盆与施肥、换盆与修剪冲突）</p>
          <p><strong>自定义规则：</strong>可针对不同养护类型设置自定义间隔天数</p>
          <p><strong>拖拽改期：</strong>在"未来7天"视图中拖动任务到其他日期即可改期</p>
          <p><strong>批量操作：</strong>在"任务管理"中勾选多个任务可批量完成</p>
          <p><strong>实时联动：</strong>计划状态会同步到植物详情、浇水日历、养护日志和统计页</p>
        </div>
      </div>

      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="📋 生成智能养护计划"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowGenerateModal(false)}>
              取消
            </button>
            <button className="btn btn-primary" onClick={handleGenerate}>
              确认生成
            </button>
          </>
        }
      >
        <form onSubmit={handleGenerate}>
          <div className="form-group">
            <label className="form-label">计划名称</label>
            <input
              type="text"
              className={`form-input ${formErrors.name ? 'error' : ''}`}
              value={generateForm.name}
              onChange={(e) => setGenerateForm({ ...generateForm, name: e.target.value })}
              placeholder="例如：夏季养护计划、客厅绿植计划"
            />
            {formErrors.name && <div className="form-error">{formErrors.name}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">计划范围</label>
            <div className="grid grid-3" style={{ gap: 8 }}>
              {[
                { value: 'single', label: '单株植物' },
                { value: 'room', label: '按房间批量' },
                { value: 'all', label: '全部植物' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`radio-card ${generateForm.scope_type === opt.value ? 'active' : ''}`}
                  onClick={() => setGenerateForm({ ...generateForm, scope_type: opt.value })}
                >
                  <input
                    type="radio"
                    name="scope_type"
                    checked={generateForm.scope_type === opt.value}
                    onChange={() => setGenerateForm({ ...generateForm, scope_type: opt.value })}
                    style={{ display: 'none' }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {generateForm.scope_type === 'single' && (
            <div className="form-group">
              <label className="form-label">选择植物 *</label>
              <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                {plants.map((p) => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={generateForm.plant_ids.includes(p.id)}
                      onChange={(e) => {
                        const newIds = e.target.checked
                          ? [...generateForm.plant_ids, p.id]
                          : generateForm.plant_ids.filter((id) => id !== p.id)
                        setGenerateForm({ ...generateForm, plant_ids: newIds })
                      }}
                    />
                    <span>{p.name} ({p.species_detail?.name})</span>
                  </label>
                ))}
              </div>
              {formErrors.plant_ids && <div className="form-error">{formErrors.plant_ids}</div>}
            </div>
          )}

          {generateForm.scope_type === 'room' && (
            <div className="form-group">
              <label className="form-label">选择房间 *</label>
              <select
                className={`form-select ${formErrors.location_id ? 'error' : ''}`}
                value={generateForm.location_id}
                onChange={(e) => setGenerateForm({ ...generateForm, location_id: e.target.value })}
              >
                <option value="">请选择房间</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.room_type_display} - {l.name}
                  </option>
                ))}
              </select>
              {formErrors.location_id && <div className="form-error">{formErrors.location_id}</div>}
            </div>
          )}

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">开始日期</label>
              <input
                type="date"
                className="form-input"
                value={generateForm.start_date}
                onChange={(e) => setGenerateForm({ ...generateForm, start_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">计划天数（最长90天）</label>
              <input
                type="number"
                min="1"
                max="90"
                className="form-input"
                value={generateForm.days}
                onChange={(e) => setGenerateForm({ ...generateForm, days: Math.min(90, Math.max(1, parseInt(e.target.value) || 90)) })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">养护类型 *</label>
            <div className="grid grid-4" style={{ gap: 8 }}>
              {[
                { value: 'water', label: '💧 浇水' },
                { value: 'fertilize', label: '🌱 施肥' },
                { value: 'repot', label: '🪴 换盆' },
                { value: 'prune', label: '✂️ 修剪' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`radio-card ${generateForm.care_types.includes(opt.value) ? 'active' : ''}`}
                  onClick={() => {
                    const newTypes = generateForm.care_types.includes(opt.value)
                      ? generateForm.care_types.filter((t) => t !== opt.value)
                      : [...generateForm.care_types, opt.value]
                    setGenerateForm({ ...generateForm, care_types: newTypes })
                  }}
                >
                  <input
                    type="checkbox"
                    checked={generateForm.care_types.includes(opt.value)}
                    onChange={() => {}}
                    style={{ display: 'none' }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            {formErrors.care_types && <div className="form-error">{formErrors.care_types}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">备注</label>
            <textarea
              className="form-textarea"
              value={generateForm.notes}
              onChange={(e) => setGenerateForm({ ...generateForm, notes: e.target.value })}
              placeholder="可选，给计划添加备注说明..."
            />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showTaskDetailModal}
        onClose={() => setShowTaskDetailModal(false)}
        title="📋 任务详情"
        footer={
          currentTask && (currentTask.status === 'pending' || currentTask.status === 'overdue') ? (
            <>
              <button className="btn btn-secondary" onClick={() => handleTaskSkip(currentTask.id)}>
                跳过
              </button>
              <button className="btn btn-primary" onClick={() => { handleTaskComplete(currentTask.id); setShowTaskDetailModal(false) }}>
                标记完成
              </button>
            </>
          ) : null
        }
      >
        {currentTask && (
          <>
            <div className="plant-info-item">
              <span className="plant-info-label">植物</span>
              <span className="plant-info-value" style={{ cursor: 'pointer', color: 'var(--primary-dark)' }} onClick={() => navigate(`/plants/${currentTask.plant}`)}>
                {currentTask.plant_name}
              </span>
            </div>
            <div className="plant-info-item">
              <span className="plant-info-label">养护类型</span>
              <span className="plant-info-value">
                <span className={`badge ${careTypeMap[currentTask.care_type]?.class}`}>
                  {careTypeMap[currentTask.care_type]?.text}
                </span>
              </span>
            </div>
            <div className="plant-info-item">
              <span className="plant-info-label">计划日期</span>
              <span className="plant-info-value">{currentTask.scheduled_date}</span>
            </div>
            {currentTask.original_date !== currentTask.scheduled_date && (
              <div className="plant-info-item">
                <span className="plant-info-label">原始计划</span>
                <span className="plant-info-value">{currentTask.original_date}</span>
              </div>
            )}
            <div className="plant-info-item">
              <span className="plant-info-label">状态</span>
              <span className="plant-info-value">
                <span className={`badge ${taskStatusMap[currentTask.status]?.class}`}>
                  {taskStatusMap[currentTask.status]?.text}
                </span>
              </span>
            </div>
            {currentTask.status === 'completed' && (
              <>
                <div className="plant-info-item">
                  <span className="plant-info-label">实际完成</span>
                  <span className="plant-info-value">{currentTask.actual_date}</span>
                </div>
                <div className="plant-info-item">
                  <span className="plant-info-label">执行偏差</span>
                  <span className="plant-info-value">
                    {currentTask.deviation_days > 1 ? `延迟 ${currentTask.deviation_days} 天` : '准时'}
                  </span>
                </div>
              </>
            )}
            {currentTask.notes && (
              <>
                <div className="divider" />
                <p style={{ fontSize: 14, color: 'var(--text-light)' }}>{currentTask.notes}</p>
              </>
            )}

            {currentTask.status === 'pending' && (
              <>
                <div className="divider" />
                <div className="form-group">
                  <label className="form-label">改期（调整计划日期）</label>
                  <div className="actions">
                    <input
                      type="date"
                      className="form-input"
                      defaultValue={currentTask.scheduled_date}
                      id="reschedule-date"
                    />
                    <button
                      className="btn btn-primary"
                      onClick={async () => {
                        const newDate = document.getElementById('reschedule-date').value
                        if (newDate) {
                          const result = await handleTaskReschedule(currentTask.id, newDate)
                          if (result.success) {
                            setShowTaskDetailModal(false)
                          }
                        }
                      }}
                    >
                      确认改期
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}

export default CarePlans
