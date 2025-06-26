import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Property, CompanySettings } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Edit } from "lucide-react";
import AddPropertyModal from "@/components/property/add-property-modal";
import EditPropertyModal from "@/components/property/edit-property-modal";
import { getPropertyStatus, getPropertyStatusColor } from "@/lib/property-utils";
import { formatCurrency } from "@/lib/date-utils";

export default function Properties() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: companySettings } = useQuery<CompanySettings>({
    queryKey: ['/api/company-settings'],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Calculate correct VAT amounts using current company settings
  const getCorrectRentAmount = (property: Property) => {
    const vatRate = parseFloat(companySettings?.vatRate || '15.00');
    const vatMultiplier = 1 + (vatRate / 100);
    
    if (property.isVatExempt) {
      return parseFloat(property.rentExcludingVat);
    } else {
      // Use the excluding VAT amount as base and calculate including VAT
      const baseAmount = parseFloat(property.rentExcludingVat);
      return baseAmount * vatMultiplier;
    }
  };

  const filteredProperties = properties.filter((property: Property) =>
    property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (property.tenantName && property.tenantName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleEditProperty = (property: Property) => {
    setSelectedProperty(property);
    setShowEditModal(true);
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
                Properties
              </h1>
              <p className="text-slate-600 mt-1">Manage your property portfolio</p>
            </div>
            <Button 
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search properties..."
              className="pl-10 bg-white/50 border-white/20 rounded-xl h-12 text-slate-700 placeholder:text-slate-400 focus:bg-white/80 transition-all duration-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Properties Grid */}
        {filteredProperties.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="text-slate-400 mb-4">
                <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">No properties found</h3>
              <p className="text-slate-600 mb-6 max-w-md">
                {searchTerm ? "No properties match your search criteria." : "Get started by adding your first property to begin managing your portfolio."}
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Property
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property: Property) => {
              const status = getPropertyStatus(property);
              const statusColor = getPropertyStatusColor(status);
              
              return (
                <div key={property.id} className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">{property.name}</h3>
                      <p className="text-sm text-slate-600">{property.address}</p>
                    </div>
                    <Badge variant="secondary" className={`${statusColor} text-white font-medium`}>
                      {status.replace('-', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-500">Monthly Rent</p>
                      <p className="text-lg font-semibold text-slate-800">{formatCurrency(getCorrectRentAmount(property).toString())}</p>
                    </div>
                    
                    {property.tenantName && (
                      <div>
                        <p className="text-sm text-slate-500">Tenant</p>
                        <p className="text-sm font-medium text-slate-700">{property.tenantName}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditProperty(property)}
                        className="bg-white/50 border-white/20 hover:bg-white/80 transition-all duration-200"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modals */}
        <AddPropertyModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
        
        {selectedProperty && (
          <EditPropertyModal
            property={selectedProperty}
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedProperty(null);
            }}
          />
        )}
      </div>
    </div>
  );
}