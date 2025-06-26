import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastUpdate(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastUpdate(new Date());
    };

    // Add event listeners for online/offline detection
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connection check by making a simple fetch to our API
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/dashboard/stats', {
          method: 'HEAD',
          cache: 'no-cache'
        });
        const wasOnline = isOnline;
        const nowOnline = response.ok;
        
        if (wasOnline !== nowOnline) {
          setIsOnline(nowOnline);
          setLastUpdate(new Date());
        }
      } catch (error) {
        if (isOnline) {
          setIsOnline(false);
          setLastUpdate(new Date());
        }
      }
    };

    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline]);

  return (
    <Badge 
      variant="outline" 
      className={`${
        isOnline 
          ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' 
          : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
      } transition-all duration-200 flex items-center space-x-1.5`}
    >
      {isOnline ? (
        <>
          <Wifi className="h-3 w-3" />
          <span className="text-xs font-medium">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span className="text-xs font-medium">Offline</span>
        </>
      )}
    </Badge>
  );
}