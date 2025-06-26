import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { type Property, type CompanySettings } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  MapPin, 
  MoreVertical, 
  FileText, 
  Receipt, 
  Eye,
  UserPlus,
  RefreshCw,
  AlertTriangle,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getDaysUntilExpiry, getLeaseProgress } from "@/lib/date-utils";

interface PropertyCardProps {
  property: Property;
  status: "leased" | "expiring-soon" | "critical" | "available";
  onEdit: (property: Property) => void;
  viewMode: "grid" | "list";
}

const statusConfig = {
  leased: {
    label: "Leased",
    badgeClass: "status-badge-leased text-white",
    icon: "circle"
  },
  "expiring-soon": {
    label: "Expiring Soon",
    badgeClass: "status-badge-expiring-soon text-white",
    icon: "exclamation-circle"
  },
  critical: {
    label: "Critical",
    badgeClass: "status-badge-critical text-white animate-pulse",
    icon: "exclamation-triangle"
  },
  available: {
    label: "Available",
    badgeClass: "bg-gray-500 text-white",
    icon: "circle"
  }
};

export default function PropertyCard({ property, status, onEdit, viewMode }: PropertyCardProps) {
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch company settings for dynamic VAT rate
  const { data: companySettings } = useQuery<CompanySettings>({
    queryKey: ['/api/company-settings'],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Calculate correct VAT amounts using current company settings
  const getCorrectVatAmounts = () => {
    const vatRate = parseFloat(companySettings?.vatRate || '15.00');
    const vatMultiplier = 1 + (vatRate / 100);
    
    if (property.isVatExempt) {
      return {
        excluding: parseFloat(property.rentExcludingVat),
        including: parseFloat(property.rentExcludingVat),
        vatRate
      };
    } else {
      // Use the excluding VAT amount as base and calculate including VAT
      const baseAmount = parseFloat(property.rentExcludingVat);
      const includingVat = baseAmount * vatMultiplier;
      return {
        excluding: baseAmount,
        including: includingVat,
        vatRate
      };
    }
  };

  const vatAmounts = getCorrectVatAmounts();

  const generateInvoiceMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      const response = await apiRequest("POST", `/api/properties/${propertyId}/invoice`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invoice Generated",
        description: "Invoice has been generated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate invoice. Please try again.",
        variant: "destructive",
      });
      console.error("Invoice generation error:", error);
    }
  });

  const handleGenerateInvoice = async () => {
    if (!property.tenantEmail) {
      toast({
        title: "Missing Email",
        description: "Please add tenant email address before generating invoice.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingInvoice(true);
    try {
      await generateInvoiceMutation.mutateAsync(property.id);
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleViewDocument = (documentPath: string, documentType: string) => {
    if (documentPath) {
      // Create proper URL for file serving endpoint
      const fileUrl = `/api/files/${documentPath}`;
      window.open(fileUrl, '_blank');
    } else {
      toast({
        title: "Document Not Found",
        description: `No ${documentType} document has been uploaded for this property.`,
        variant: "destructive",
      });
    }
  };

  const daysUntilExpiry = property.leaseEndDate ? getDaysUntilExpiry(property.leaseEndDate) : null;
  const leaseProgress = property.leaseStartDate && property.leaseEndDate 
    ? getLeaseProgress(property.leaseStartDate, property.leaseEndDate)
    : null;

  const statusInfo = statusConfig[status];

  if (viewMode === "list") {
    return (
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                <img 
                  src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200" 
                  alt={property.name}
                  className="w-full h-full object-cover"
                />
                <Badge className={cn("absolute top-1 left-1 text-xs", statusInfo.badgeClass)}>
                  {statusInfo.label}
                </Badge>
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{property.name}</h3>
                <p className="text-sm text-gray-500 flex items-center mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  {property.address}
                </p>
              </div>
              
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">
                  R{parseFloat(property.rentIncludingVat).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">per month</p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(property)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer">
      <div className="relative">
        <img 
          src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400" 
          alt={property.name}
          className="w-full h-48 object-cover"
        />
        <Badge className={cn("absolute top-4 left-4 shadow-lg", statusInfo.badgeClass)}>
          {statusInfo.label}
        </Badge>
        <Button 
          variant="ghost" 
          size="sm"
          className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
      
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors">
              {property.name}
            </h3>
            <p className="text-sm text-gray-500 flex items-center mt-1">
              <MapPin className="h-4 w-4 mr-1" />
              {property.address}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onEdit(property)}
            className="text-gray-400 hover:text-gray-600"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>

        <div className={`grid ${property.isVatExempt ? 'grid-cols-1' : 'grid-cols-2'} gap-4 mb-4`}>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">
              {property.isVatExempt ? 'Monthly Rent' : 'Monthly Rent (Ex VAT)'}
            </p>
            <p className="text-lg font-bold text-gray-900">
              R{vatAmounts.excluding.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          {!property.isVatExempt && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Monthly Rent (Inc VAT {vatAmounts.vatRate}%)</p>
              <p className="text-lg font-bold text-gray-900">
                R{vatAmounts.including.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">
              {property.isOccupied ? "Tenant Information" : "Property Status"}
            </p>
            <Badge variant={status === "critical" ? "destructive" : status === "expiring-soon" ? "default" : "secondary"}>
              {property.isOccupied ? "Active" : "Available"}
            </Badge>
          </div>
          
          {property.isOccupied && property.tenantName ? (
            <div className="space-y-1">
              <p className="text-sm text-gray-900 font-medium">{property.tenantName}</p>
              {property.tenantEmail && (
                <p className="text-xs text-gray-500">{property.tenantEmail}</p>
              )}
              {property.tenantPhone && (
                <p className="text-xs text-gray-500">{property.tenantPhone}</p>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <UserPlus className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">Ready for new tenant</p>
              <p className="text-xs text-gray-500 mt-1">Available now</p>
            </div>
          )}
        </div>

        {property.isOccupied && property.leaseStartDate && property.leaseEndDate && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Lease Period</span>
              <span className={cn(
                "font-medium",
                status === "critical" && "text-red-600",
                status === "expiring-soon" && "text-amber-600"
              )}>
                {daysUntilExpiry !== null && daysUntilExpiry > 0 
                  ? `${daysUntilExpiry} days remaining`
                  : daysUntilExpiry === 0 
                    ? "Expires today"
                    : "Expired"
                }
              </span>
            </div>
            {leaseProgress !== null && (
              <Progress 
                value={leaseProgress} 
                className="h-2 mb-2"
              />
            )}
            <div className="flex justify-between text-xs text-gray-500">
              <span>{(typeof property.leaseStartDate === 'string' ? new Date(property.leaseStartDate) : property.leaseStartDate).toLocaleDateString()}</span>
              <span>{(typeof property.leaseEndDate === 'string' ? new Date(property.leaseEndDate) : property.leaseEndDate).toLocaleDateString()}</span>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {/* File and action buttons row */}
          <div className="flex flex-wrap gap-2">
            {property.rentalAgreementPath && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-red-600 hover:bg-red-50 flex-shrink-0"
                onClick={() => handleViewDocument(property.rentalAgreementPath!, "rental agreement")}
              >
                <FileText className="h-4 w-4 mr-1" />
                PDF
              </Button>
            )}
            {property.agreementTemplatePath && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-blue-600 hover:bg-blue-50 flex-shrink-0"
                onClick={() => handleViewDocument(property.agreementTemplatePath!, "agreement template")}
              >
                <Download className="h-4 w-4 mr-1" />
                DOCX
              </Button>
            )}
            {property.isOccupied && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-primary hover:bg-primary/5 flex-shrink-0"
                onClick={handleGenerateInvoice}
                disabled={isGeneratingInvoice}
              >
                {isGeneratingInvoice ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Receipt className="h-4 w-4 mr-1" />
                )}
                Generate Invoice
              </Button>
            )}
          </div>
          
          {/* Main action button */}
          <div className="flex justify-end">
            {property.isOccupied ? (
              status === "critical" ? (
                <Button variant="destructive" size="sm" className="w-full">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Urgent Action Required
                </Button>
              ) : status === "expiring-soon" ? (
                <Button variant="default" className="bg-amber-600 hover:bg-amber-700 w-full" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Renew Lease
                </Button>
              ) : (
                <Button variant="default" size="sm" onClick={() => onEdit(property)} className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              )
            ) : (
              <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 w-full">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Tenant
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
