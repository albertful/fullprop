import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Property, Notification } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Bell, BellRing, AlertTriangle, Info, CheckCircle2, Clock } from "lucide-react";
import { formatDate } from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";

export default function Notifications() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading: loadingNotifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: properties = [], isLoading: loadingProperties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiRequest("PUT", `/api/notifications/${notificationId}/read`, {});
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Success",
        description: "Notification marked as read",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to clear notifications');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Success",
        description: "All notifications cleared",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clear notifications",
        variant: "destructive",
      });
    },
  });

  const isLoading = loadingNotifications || loadingProperties;

  const filteredNotifications = notifications
    .filter((notification: Notification) => {
      const property = properties.find((p: Property) => p.id === notification.propertyId);
      const matchesSearch = property?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           notification.type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === "all" || 
                           (filter === "read" && notification.isRead) ||
                           (filter === "unread" && !notification.isRead);
      return matchesSearch && matchesFilter;
    })
    .sort((a: Notification, b: Notification) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "lease_expiry":
        return <AlertTriangle className="h-5 w-5" />;
      case "payment_due":
        return <Clock className="h-5 w-5" />;
      case "maintenance":
        return <Info className="h-5 w-5" />;
      case "invoice_sent":
        return <CheckCircle2 className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "lease_expiry":
        return "bg-red-500";
      case "payment_due":
        return "bg-yellow-500";
      case "maintenance":
        return "bg-blue-500";
      case "invoice_sent":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case "lease_expiry":
        return "Lease Expiry";
      case "payment_due":
        return "Payment Due";
      case "maintenance":
        return "Maintenance";
      case "invoice_sent":
        return "Invoice Sent";
      default:
        return "Notification";
    }
  };

  const handleMarkAsRead = (notificationId: number, isRead: boolean) => {
    if (!isRead) {
      markAsReadMutation.mutate(notificationId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 ml-64 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
                Notifications
              </h1>
              <p className="text-slate-600 mt-1">Stay updated with property alerts and reminders</p>
            </div>
            <div className="flex items-center space-x-4">
              {unreadCount > 0 && (
                <div className="flex items-center space-x-2">
                  <BellRing className="h-5 w-5 text-blue-600" />
                  <Badge className="bg-blue-600 text-white">
                    {unreadCount} unread
                  </Badge>
                </div>
              )}
              {notifications.length > 0 && (
                <Button
                  onClick={() => clearAllMutation.mutate()}
                  disabled={clearAllMutation.isPending}
                  variant="outline"
                  className="bg-red-50 hover:bg-red-100 text-red-600 border-red-200 hover:border-red-300"
                >
                  {clearAllMutation.isPending ? "Clearing..." : "Clear All"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search notifications by property, message, or type..."
                className="pl-10 bg-white/50 border-white/20 rounded-xl h-12 text-slate-700 placeholder:text-slate-400 focus:bg-white/80 transition-all duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filter} onValueChange={(value: "all" | "unread" | "read") => setFilter(value)}>
              <SelectTrigger className="w-full md:w-48 bg-white/50 border-white/20 rounded-xl h-12 text-slate-700 focus:bg-white/80 transition-all duration-200">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Notifications</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="text-slate-400 mb-4">
                <Bell className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">No notifications found</h3>
              <p className="text-slate-600 mb-6 max-w-md">
                {searchTerm || filter !== "all" ? "No notifications match your search criteria." : "You're all caught up! Notifications will appear here when there are updates."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification: Notification) => {
              const property = properties.find((p: Property) => p.id === notification.propertyId);
              const notificationColor = getNotificationColor(notification.type);
              const notificationIcon = getNotificationIcon(notification.type);
              const typeLabel = getNotificationTypeLabel(notification.type);
              
              return (
                <div 
                  key={notification.id} 
                  className={`bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer ${
                    !notification.isRead ? 'ring-2 ring-blue-200' : ''
                  }`}
                  onClick={() => handleMarkAsRead(notification.id, notification.isRead)}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`${notificationColor} p-3 rounded-xl text-white flex-shrink-0`}>
                      {notificationIcon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-800">{typeLabel}</h3>
                          <p className="text-sm text-slate-600">{property?.name || "Unknown Property"}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!notification.isRead && (
                            <Badge className="bg-blue-600 text-white text-xs">
                              New
                            </Badge>
                          )}
                          <span className="text-xs text-slate-500">
                            {formatDate(new Date(notification.createdAt))}
                          </span>
                        </div>
                      </div>
                      
                      <div className="bg-white/30 rounded-xl p-3 mb-3">
                        <p className="text-sm text-slate-700">{notification.message}</p>
                      </div>

                      {property && (
                        <div className="text-xs text-slate-500">
                          <span className="font-medium">Property:</span> {property.address}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}