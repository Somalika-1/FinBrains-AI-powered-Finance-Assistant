import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-blue-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4">{children || <Outlet />}</main>
      </div>
    </div>
  );
}
