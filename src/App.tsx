import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// 导入页面
import ReviewerPage from './pages/ReviewerPage';
import DashboardPage from './pages/DashboardPage';
import RulesPage from './pages/RulesPage';
import RuleDetailPage from './pages/RuleDetailPage';

// 导入布局
import AdminLayout from './layouts/AdminLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 默认重定向到管理员仪表盘 */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
        
        {/* 审核员视图 (无左侧导航的独立页面) */}
        <Route path="/reviewer" element={<ReviewerPage />} />

        {/* 管理员视图 (带有左侧导航和顶栏的布局) */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="rules" element={<RulesPage />} />
          <Route path="rules/:ruleId" element={<RuleDetailPage />} />
          
          {/* 其他管理页面的占位路由 */}
          <Route path="tasks" element={<div className="flex h-full items-center justify-center text-surface-400">任务进度开发中...</div>} />
          <Route path="users" element={<div className="flex h-full items-center justify-center text-surface-400">用户管理开发中...</div>} />
          <Route path="settings" element={<div className="flex h-full items-center justify-center text-surface-400">系统设置开发中...</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
