import { type Property } from "@shared/schema";
import { getDaysUntilExpiry } from "./date-utils";

export type PropertyStatus = "leased" | "expiring-soon" | "critical" | "available";

export function getPropertyStatus(property: Property): PropertyStatus {
  if (!property.isOccupied) return "available";
  if (!property.leaseEndDate) return "leased";
  
  const daysUntilExpiry = getDaysUntilExpiry(property.leaseEndDate);
  
  if (daysUntilExpiry <= 30) return "critical";
  if (daysUntilExpiry <= 60) return "expiring-soon";
  return "leased";
}

export function getPropertyStatusLabel(status: PropertyStatus): string {
  switch (status) {
    case "leased":
      return "Leased";
    case "expiring-soon":
      return "Expiring Soon";
    case "critical":
      return "Critical";
    case "available":
      return "Available";
    default:
      return "Unknown";
  }
}

export function getPropertyStatusColor(status: PropertyStatus): string {
  switch (status) {
    case "leased":
      return "status-badge-leased";
    case "expiring-soon":
      return "status-badge-expiring-soon";
    case "critical":
      return "status-badge-critical";
    case "available":
      return "bg-gray-500";
    default:
      return "bg-gray-500";
  }
}

export function sortPropertiesByStatus(properties: Property[]): Property[] {
  return properties.sort((a, b) => {
    const statusA = getPropertyStatus(a);
    const statusB = getPropertyStatus(b);
    
    // Priority order: critical > expiring-soon > leased > available
    const statusPriority = {
      critical: 0,
      "expiring-soon": 1,
      leased: 2,
      available: 3,
    };
    
    return statusPriority[statusA] - statusPriority[statusB];
  });
}

export function filterPropertiesByStatus(
  properties: Property[], 
  status: PropertyStatus | "all"
): Property[] {
  if (status === "all") return properties;
  
  return properties.filter(property => getPropertyStatus(property) === status);
}

export function calculateTotalRevenue(properties: Property[]): number {
  return properties
    .filter(p => p.isOccupied)
    .reduce((sum, p) => sum + parseFloat(p.rentIncludingVat), 0);
}

export function getOccupancyRate(properties: Property[]): number {
  if (properties.length === 0) return 0;
  const occupiedCount = properties.filter(p => p.isOccupied).length;
  return Math.round((occupiedCount / properties.length) * 100);
}
