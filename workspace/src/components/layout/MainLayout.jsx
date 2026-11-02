import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 transition-colors dark:bg-slate-950">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />

        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 transition-colors dark:bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout