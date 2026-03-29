import React, { useRef, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileCheck2, Settings, Users, LogOut, Search, Bell, ChevronDown, ArrowUpRight, Download } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { exportElementToSvg } from '../utils/exportSvg';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AdminLayout() {
  const location = useLocation();
  const layoutRef = useRef<HTMLDivElement>(null);

  const navigation = [
    { name: '控制台首页', href: '/admin', icon: LayoutDashboard },
    { name: '规则管理', href: '/admin/rules', icon: FileCheck2 },
    { name: '任务进度', href: '/admin/tasks', icon: Search },
    { name: '用户管理', href: '/admin/users', icon: Users },
    { name: '系统设置', href: '/admin/settings', icon: Settings },
  ];

  const handleExportSvg = () => {
    const name = location.pathname === '/admin' ? 'admin-dashboard' : location.pathname.replace(/^\//, '').replace(/\//g, '-');
    exportElementToSvg(layoutRef.current, name);
  };

  return (
    <div ref={layoutRef} className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      {/* 侧边栏 */}
      <aside className="w-64 bg-white border-r border-surface-200 flex flex-col shrink-0 z-20">
        <div className="h-16 flex items-center px-6 border-b border-surface-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <FileCheck2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-surface-900 tracking-wide">智能评审管理台</span>
          </div>
        </div>
        
        <div className="p-4 flex-1">
          <nav className="space-y-1.5 mt-2">
            {navigation.map((item) => {
              const isActive = item.href === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                    isActive 
                      ? "bg-blue-50 text-blue-700" 
                      : "text-surface-600 hover:bg-surface-50 hover:text-surface-900"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-blue-600" : "text-surface-400 group-hover:text-surface-600"
                  )} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-surface-100">
          <div className="flex items-center gap-3 px-3 py-2 hover:bg-surface-50 rounded-xl transition-colors cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-surface-900 truncate">系统超级管理员</p>
              <p className="text-xs text-surface-500 truncate">admin@chint.com</p>
            </div>
            <LogOut className="w-4 h-4 text-surface-400" />
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F8FAFC]">
        {/* 顶部导航 */}
        <header className="h-16 bg-white border-b border-surface-200 flex items-center justify-between px-8 shrink-0 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-surface-100 rounded-lg px-4 py-2 w-96 border border-transparent focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100 transition-all">
              <Search className="w-4 h-4 text-surface-400" />
              <input 
                type="text" 
                placeholder="搜索资源、任务或设置..." 
                className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-full placeholder:text-surface-400 outline-none"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleExportSvg}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-surface-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="导出当前页面为 SVG"
            >
              <Download className="w-4 h-4" /> 导出 SVG
            </button>
            <Link to="/reviewer" className="text-sm font-medium text-surface-600 hover:text-blue-600 flex items-center gap-1 transition-colors">
              前往审核复核页预览 <ArrowUpRight className="w-4 h-4" />
            </Link>
            <div className="h-5 w-[1px] bg-surface-200"></div>
            <button className="relative p-2 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* 路由页面内容 */}
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
