import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export const speciesAPI = {
  list: () => api.get('/species/'),
  get: (id) => api.get(`/species/${id}/`),
  create: (data) => api.post('/species/', data),
  update: (id, data) => api.put(`/species/${id}/`, data),
  delete: (id) => api.delete(`/species/${id}/`),
}

export const locationsAPI = {
  list: () => api.get('/locations/'),
  get: (id) => api.get(`/locations/${id}/`),
  create: (data) => api.post('/locations/', data),
  update: (id, data) => api.put(`/locations/${id}/`, data),
  delete: (id) => api.delete(`/locations/${id}/`),
}

export const plantsAPI = {
  list: (params = {}) => api.get('/plants/', { params }),
  get: (id) => api.get(`/plants/${id}/`),
  create: (data) => api.post('/plants/', data),
  update: (id, data) => api.put(`/plants/${id}/`, data),
  delete: (id) => api.delete(`/plants/${id}/`),
  markWatered: (id) => api.post(`/plants/${id}/mark_watered/`),
  markFertilized: (id, data) => api.post(`/plants/${id}/mark_fertilized/`, data),
  markRepotted: (id, data) => api.post(`/plants/${id}/mark_repotted/`, data),
  markPruned: (id, data) => api.post(`/plants/${id}/mark_pruned/`, data),
}

export const careLogsAPI = {
  list: (params = {}) => api.get('/care-logs/', { params }),
  get: (id) => api.get(`/care-logs/${id}/`),
  create: (data) => api.post('/care-logs/', data),
  update: (id, data) => api.put(`/care-logs/${id}/`, data),
  delete: (id) => api.delete(`/care-logs/${id}/`),
  summary: (params = {}) => api.get('/care-logs/summary/', { params }),
}

export const calendarAPI = {
  getWateringCalendar: (year, month) =>
    api.get('/watering-calendar/', { params: { year, month } }),
}

export const warningsAPI = {
  list: () => api.get('/warnings/'),
}

export const statisticsAPI = {
  get: () => api.get('/statistics/'),
}

export const carePlansAPI = {
  list: (params = {}) => api.get('/care-plans/', { params }),
  get: (id) => api.get(`/care-plans/${id}/`),
  create: (data) => api.post('/care-plans/', data),
  update: (id, data) => api.put(`/care-plans/${id}/`, data),
  delete: (id) => api.delete(`/care-plans/${id}/`),
  generate: (data) => api.post('/care-plans/generate/', data),
  cancel: (id) => api.post(`/care-plans/${id}/cancel/`),
}

export const carePlanTasksAPI = {
  list: (params = {}) => api.get('/care-plan-tasks/', { params }),
  get: (id) => api.get(`/care-plan-tasks/${id}/`),
  create: (data) => api.post('/care-plan-tasks/', data),
  update: (id, data) => api.put(`/care-plan-tasks/${id}/`, data),
  delete: (id) => api.delete(`/care-plan-tasks/${id}/`),
  complete: (id, data = {}) => api.post(`/care-plan-tasks/${id}/complete/`, data),
  skip: (id, data = {}) => api.post(`/care-plan-tasks/${id}/skip/`, data),
  reschedule: (id, data) => api.post(`/care-plan-tasks/${id}/reschedule/`, data),
  batchComplete: (taskIds) => api.post('/care-plan-tasks/batch_complete/', { task_ids: taskIds }),
  upcoming: (days = 7) => api.get('/care-plan-tasks/upcoming/', { params: { days } }),
  riskWarnings: () => api.get('/care-plan-tasks/risk_warnings/'),
  stats: () => api.get('/care-plan-tasks/stats/'),
}

export default api
