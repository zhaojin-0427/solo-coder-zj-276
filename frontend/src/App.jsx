import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Plants from './pages/Plants.jsx'
import PlantDetail from './pages/PlantDetail.jsx'
import Calendar from './pages/Calendar.jsx'
import CareLogs from './pages/CareLogs.jsx'
import Warnings from './pages/Warnings.jsx'
import Statistics from './pages/Statistics.jsx'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Plants />} />
        <Route path="/plants" element={<Plants />} />
        <Route path="/plants/:id" element={<PlantDetail />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/care-logs" element={<CareLogs />} />
        <Route path="/warnings" element={<Warnings />} />
        <Route path="/statistics" element={<Statistics />} />
      </Routes>
    </Layout>
  )
}

export default App
