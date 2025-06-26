import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Property } from "@shared/schema";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import StatsCards from "@/components/dashboard/stats-cards";
import PropertyCard from "@/components/property/property-card";
import AddPropertyModal from "@/components/property/add-property-modal";
import EditPropertyModal from "@/components/property/edit-property-modal";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Grid3X3, List } from "lucide-react";

type ViewMode = "grid" | "list";
type FilterType = "all" | "leased" | "expiring-soon" | "critical" | "available";

export default function Dashboard() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<FilterType>("all");

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const getPropertyStatus = (property: Property) => {
    if (!property.isOccupied) return "available";
    if (!property.leaseEndDate) return "leased";
    
    const now = new Date();
    const leaseEndDate = typeof property.leaseEndDate === 'string' ? new Date(property.leaseEndDate) : property.leaseEndDate;
    const daysUntilExpiry = Math.ceil(
      (leaseEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilExpiry <= 30) return "critical";
    if (daysUntilExpiry <= 60) return "expiring-soon";
    return "leased";
  };

  const filteredProperties = properties.filter(property => {
    if (filter === "all") return true;
    const status = getPropertyStatus(property);
    return status === filter;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 ml-64 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <TopBar onAddProperty={() => setIsAddModalOpen(true)} />
        
        <main className="space-y-6">
          <StatsCards />
          
          {/* Properties Section */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Your Properties</h2>
            <div className="flex items-center space-x-3">
              <Select value={filter} onValueChange={(value: FilterType) => setFilter(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  <SelectItem value="leased">Leased</SelectItem>
                  <SelectItem value="expiring-soon">Expiring Soon</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="h-8 px-3"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-8 px-3"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Properties Grid */}
          {filteredProperties.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Properties Found</h3>
              <p className="text-gray-500 mb-6">
                {filter === "all" 
                  ? "Get started by adding your first property to the system."
                  : `No properties match the selected filter: ${filter.replace("-", " ")}.`}
              </p>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Property
              </Button>
            </div>
          ) : (
            <div className={
              viewMode === "grid" 
                ? "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
                : "space-y-4"
            }>
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  status={getPropertyStatus(property)}
                  onEdit={(property) => setEditingProperty(property)}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}
        </main>

        <AddPropertyModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
        />

        {editingProperty && (
          <EditPropertyModal
            property={editingProperty}
            isOpen={!!editingProperty}
            onClose={() => setEditingProperty(null)}
          />
        )}
      </div>
    </div>
  );
}
