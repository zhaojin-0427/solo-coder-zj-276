import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { calendarAPI, carePlanTasksAPI } from '../api.js'

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const careTypeMap = {
  water: { text: '💧', class: 'calendar-event water' },
  fertilize: { text: '🌱', class: 'calendar-event fertilize' },
  repot: { text: '🪴', class: 'calendar-event repot' },
  prune: { text: '✂️', class: 'calendar-event prune' },
}

const taskStatusClass = {
  pending: '',
  completed: ' completed',
  skipped: ' skipped',
  overdue: ' overdue',
  rescheduled: ' rescheduled',
}

function Calendar() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(dayjs())
  const [calendarData, setCalendarData] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCalendar()
  }, [currentDate])

  const loadCalendar = async () => {
    setLoading(true)
    try {
      const res = await calendarAPI.getWateringCalendar(
        currentDate.year(),
        currentDate.month() + 1
      )
      setCalendarData(res.data.calendar || {})
    } catch (err) {
      console.error('加载日历失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const prevMonth = () => setCurrentDate(currentDate.subtract(1, 'month'))
  const nextMonth = () => setCurrentDate(currentDate.add(1, 'month'))
  const today = () => setCurrentDate(dayjs())

  const generateCalendarDays = () => {
    const year = currentDate.year()
    const month = currentDate.month()
    const firstDay = dayjs(`${year}-${month + 1}-01`)
    const startDay = firstDay.startOf('week')
    const days = []

    for (let i = 0; i < 42; i++) {
      days.push(startDay.add(i, 'day'))
    }

    return days
  }

  const days = generateCalendarDays()

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📅 浇水日历</h1>
          <p className="page-subtitle">查看各月份的浇水安排，掌握每株植物的浇水时间</p>
        </div>
      </div>

      <div className="card">
        <div className="calendar-header">
          <div className="actions">
            <button className="btn btn-secondary" onClick={prevMonth}>
              ← 上月
            </button>
            <button className="btn btn-secondary" onClick={today}>
              今天
            </button>
            <button className="btn btn-secondary" onClick={nextMonth}>
              下月 →
            </button>
          </div>
          <h2 className="calendar-title">
            {currentDate.format('YYYY年 M月')}
          </h2>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13 }}><span className="badge badge-info">💧 浇水</span></span>
            <span style={{ fontSize: 13 }}><span className="badge badge-success">🌱 施肥</span></span>
            <span style={{ fontSize: 13 }}><span className="badge badge-warning">🪴 换盆</span></span>
            <span style={{ fontSize: 13 }}><span className="badge badge-gray">✂️ 修剪</span></span>
            <span style={{ fontSize: 13 }}><span className="badge badge-danger">⚠️ 已逾期</span></span>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            <p>加载中...</p>
          </div>
        ) : (
          <div className="calendar">
            <div className="calendar-grid">
              {weekdays.map((w) => (
                <div key={w} className="calendar-weekday">
                  {w}
                </div>
              ))}
              {days.map((day) => {
                const dateStr = day.format('YYYY-MM-DD')
                const events = calendarData[dateStr] || []
                const isCurrentMonth = day.month() === currentDate.month()
                const isToday = day.isSame(dayjs(), 'day')
                const planEvents = events.filter((e) => e.source === 'plan')
                const displayEvents = planEvents.length > 0 ? planEvents : events

                return (
                  <div
                    key={dateStr}
                    className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                  >
                    <div className="calendar-day-number">{day.date()}</div>
                    {displayEvents.slice(0, 3).map((event, idx) => {
                      const icon = event.icon || (event.type === 'water' ? '💧' : '📌')
                      const isOverdue = event.is_overdue
                      let eventClass = ''
                      if (event.source === 'plan') {
                        eventClass = `calendar-event ${event.type || 'water'}${taskStatusClass[event.status] || ''}`
                        if (isOverdue) eventClass += ' overdue'
                      } else {
                        eventClass = `calendar-event ${isOverdue ? 'overdue' : 'water'}`
                      }
                      return (
                        <div
                          key={idx}
                          className={eventClass}
                          onClick={() => event.task_id ? navigate('/care-plans') : navigate(`/plants/${event.plant_id}`)}
                          style={{ cursor: 'pointer' }}
                          title={event.status_label || ''}
                        >
                          {isOverdue && !event.icon ? '⚠️ ' : ''}{icon} {event.plant_name}
                        </div>
                      )
                    })}
                    {displayEvents.length > 3 && (
                      <div style={{ fontSize: 11, color: 'var(--text-light)' }}>
                        +{displayEvents.length - 3} 更多
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">💡 提示</h3>
        <div style={{ fontSize: 14, color: 'var(--text-light)', lineHeight: 1.8 }}>
          <p>• 系统会根据植物品种特性和当前季节自动计算浇水间隔</p>
          <p>• 夏季（6-8月）浇水频率增加约40%，冬季（12-2月）浇水频率减少约40%</p>
          <p>• 春秋季浇水频率在基础值上下微调约20%</p>
          <p>• 点击植物可查看详情并记录浇水</p>
        </div>
      </div>
    </div>
  )
}

export default Calendar
