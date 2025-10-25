import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Image,
  Settings,
  FileText,
  Users,
  Package,
  Home
} from "lucide-react";
import { LanguageSelector } from "../../components/ui/language-selector";

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();

  const menuItems = [
    { path: "/admin/promo-spots", label: "Spot Promozionali", icon: <Image className="h-5 w-5" /> },
  ];

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white hidden md:block">
        <div className="h-full flex flex-col">
          <div className="h-16 border-b flex items-center px-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              ProjectPro Admin
            </Link>
          </div>
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link href={item.path}>
                    <a
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        location === item.path
                          ? "bg-blue-600 text-white"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-t p-4">
            <Link href="/">
              <a className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-50">
                <Home className="h-5 w-5" />
                Torna al sito
              </a>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="h-16 border-b flex items-center justify-between px-6 sticky top-0 bg-white z-10">
          <h1 className="font-semibold text-lg md:hidden">ProjectPro Admin</h1>
          <div className="flex gap-4 items-center">
            <LanguageSelector />
            {/* Header content/actions can go here */}
          </div>
        </div>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}