import { Building, Home, Users, FileText, Bell, Settings, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Properties", href: "/properties", icon: Building },
  { name: "Tenants", href: "/tenants", icon: Users },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  return (
    <div className="flex w-64 flex-col fixed left-0 top-0 h-full z-50">
      <div className="flex flex-col flex-grow bg-white/80 backdrop-blur-xl shadow-xl border-r border-white/20">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-6 py-8 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-primary to-blue-600 rounded-xl flex items-center justify-center">
              <Building className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Fullard</h1>
              <p className="text-sm text-gray-500">Property Management</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const [location] = useLocation();
            const isActive = location === item.href || (item.href === "/" && location === "/");
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-primary text-white"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon
                  className={cn(
                    "mr-3 h-5 w-5",
                    isActive ? "text-white" : "text-gray-400 group-hover:text-gray-500"
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="px-4 pb-6 border-t border-gray-200">
          <Button
            onClick={() => {
              localStorage.removeItem("isAuthenticated");
              localStorage.removeItem("user");
              window.location.reload();
            }}
            variant="outline"
            className="w-full mt-4 text-gray-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
