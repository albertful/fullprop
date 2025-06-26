import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Property, CompanySettings } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Phone, Mail, Calendar } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/date-utils";
import { getPropertyStatus, getPropertyStatusColor } from "@/lib/property-utils";

export default function Tenants() {
  const [searchTerm, setSearchTerm] = useState("");

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
      const baseAmount = parseFloat(property.rentExcludingVat);
      return baseAmount * vatMultiplier;
    }
  };

  // Filter properties that have tenants
  const occupiedProperties = properties.filter((property: Property) => 
    property.isOccupied && property.tenantName
  );

  const filteredTenants = occupiedProperties.filter((property: Property) =>
    property.tenantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.tenantPhone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.tenantEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              Tenants
            </h1>
            <p className="text-slate-600 mt-1">Manage tenant information and contacts</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search tenants by name, phone, email, or property..."
              className="pl-10 bg-white/50 border-white/20 rounded-xl h-12 text-slate-700 placeholder:text-slate-400 focus:bg-white/80 transition-all duration-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tenants Grid */}
        {filteredTenants.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="text-slate-400 mb-4">
                <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">No tenants found</h3>
              <p className="text-slate-600 mb-6 max-w-md">
                {searchTerm ? "No tenants match your search criteria." : "No occupied properties with tenant information found."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTenants.map((property: Property) => {
              const status = getPropertyStatus(property);
              const statusColor = getPropertyStatusColor(status);
              
              return (
                <div key={property.id} className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">{property.tenantName}</h3>
                      <p className="text-sm text-slate-600">{property.name}</p>
                    </div>
                    <Badge variant="secondary" className={`${statusColor} text-white font-medium`}>
                      {status.replace('-', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white/30 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-1">Property Address</p>
                      <p className="text-sm font-medium text-slate-700">{property.address}</p>
                    </div>

                    {property.tenantPhone && (
                      <div className="flex items-center space-x-3">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">Phone</p>
                          <p className="text-sm font-medium text-slate-700">{property.tenantPhone}</p>
                        </div>
                      </div>
                    )}

                    {property.tenantEmail && (
                      <div className="flex items-center space-x-3">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">Email</p>
                          <p className="text-sm font-medium text-slate-700">{property.tenantEmail}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Lease Period</p>
                        <p className="text-sm font-medium text-slate-700">
                          {property.leaseStartDate && property.leaseEndDate 
                            ? `${formatDate(new Date(property.leaseStartDate))} - ${formatDate(new Date(property.leaseEndDate))}`
                            : "Not specified"
                          }
                        </p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-1">Monthly Rent</p>
                      <p className="text-lg font-semibold text-slate-800">{formatCurrency(getCorrectRentAmount(property).toString())}</p>
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