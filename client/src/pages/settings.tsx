import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Settings, Building, Globe, Save, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CompanySettings, InsertCompanySettings } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch company settings
  const { data: companySettings, isLoading } = useQuery({
    queryKey: ['/api/company-settings'],
    select: (data) => data as CompanySettings | null,
  });

  // Default values for company settings
  const defaultSettings: InsertCompanySettings = {
    companyName: "NEWALD FULLARD TRUST",
    registrationNumber: "IT3469/1996",
    vatNumber: "4820187534",
    addressLine1: "P.O. Box 3016",
    addressLine2: "Paarl, 7646",
    contactPerson: "Newald Fullard",
    phone: "0711426452",
    email: "fullardpropertymgmt@gmail.com",
    vatRate: "15.00",
    notifyLeaseExpiry: true,
    notifyInvoiceGeneration: true,
    notificationEmail: "fullardpropertymgmt@gmail.com",
  };

  // Form state
  const [formData, setFormData] = useState<InsertCompanySettings>(defaultSettings);

  // Update form when data loads
  useEffect(() => {
    if (companySettings) {
      setFormData({
        companyName: companySettings.companyName,
        registrationNumber: companySettings.registrationNumber,
        vatNumber: companySettings.vatNumber,
        addressLine1: companySettings.addressLine1,
        addressLine2: companySettings.addressLine2,
        contactPerson: companySettings.contactPerson,
        phone: companySettings.phone,
        email: companySettings.email,
        vatRate: companySettings.vatRate,
        notifyLeaseExpiry: companySettings.notifyLeaseExpiry ?? true,
        notifyInvoiceGeneration: companySettings.notifyInvoiceGeneration ?? true,
        notificationEmail: companySettings.notificationEmail ?? "fullardpropertymgmt@gmail.com",
      });
    }
  }, [companySettings]);

  // Update company settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: InsertCompanySettings) => {
      const response = await fetch('/api/company-settings', {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to update settings');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company-settings'] });
      toast({
        title: "Success",
        description: "Company settings updated successfully",
      });
    },
    onError: (error) => {
      console.error("Error updating settings:", error);
      toast({
        title: "Error",
        description: "Failed to update company settings",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof InsertCompanySettings, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 ml-64 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center space-x-3">
            <Settings className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-slate-600 mt-1">Manage your company information and system preferences</p>
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Building className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-800">Company Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-slate-700">Company Name</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => handleInputChange("companyName", e.target.value)}
                className="bg-white/50 border-white/20 rounded-xl"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="registrationNumber" className="text-slate-700">Registration Number</Label>
              <Input
                id="registrationNumber"
                value={formData.registrationNumber}
                onChange={(e) => handleInputChange("registrationNumber", e.target.value)}
                className="bg-white/50 border-white/20 rounded-xl"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="vatNumber" className="text-slate-700">VAT Number</Label>
              <Input
                id="vatNumber"
                value={formData.vatNumber}
                onChange={(e) => handleInputChange("vatNumber", e.target.value)}
                className="bg-white/50 border-white/20 rounded-xl"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="bg-white/50 border-white/20 rounded-xl"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-700">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className="bg-white/50 border-white/20 rounded-xl"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contactPerson" className="text-slate-700">Contact Person</Label>
              <Input
                id="contactPerson"
                value={formData.contactPerson}
                onChange={(e) => handleInputChange("contactPerson", e.target.value)}
                className="bg-white/50 border-white/20 rounded-xl"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="addressLine1" className="text-slate-700">Address Line 1</Label>
              <Input
                id="addressLine1"
                value={formData.addressLine1}
                onChange={(e) => handleInputChange("addressLine1", e.target.value)}
                className="bg-white/50 border-white/20 rounded-xl"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="addressLine2" className="text-slate-700">Address Line 2</Label>
              <Input
                id="addressLine2"
                value={formData.addressLine2}
                onChange={(e) => handleInputChange("addressLine2", e.target.value)}
                className="bg-white/50 border-white/20 rounded-xl"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* VAT Rate Settings */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Globe className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-800">Tax Settings</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="vatRate" className="text-slate-700">VAT Rate (%)</Label>
              <Input
                id="vatRate"
                value={formData.vatRate}
                onChange={(e) => handleInputChange("vatRate", e.target.value)}
                className="bg-white/50 border-white/20 rounded-xl"
                disabled={isLoading}
              />
              <p className="text-sm text-slate-600">South African standard VAT rate</p>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Bell className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-800">Email Notification Settings</h2>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="notificationEmail" className="text-slate-700">Notification Email Address</Label>
              <Input
                id="notificationEmail"
                type="email"
                value={formData.notificationEmail}
                onChange={(e) => handleInputChange("notificationEmail", e.target.value)}
                className="bg-white/50 border-white/20 rounded-xl"
                disabled={isLoading}
                placeholder="fullardpropertymgmt@gmail.com"
              />
              <p className="text-sm text-slate-600">Email address where notifications will be sent</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifyLeaseExpiry" className="text-slate-700 font-medium">Lease Expiry Notifications</Label>
                  <p className="text-sm text-slate-600">Receive email alerts when leases are expiring soon</p>
                </div>
                <Switch
                  id="notifyLeaseExpiry"
                  checked={formData.notifyLeaseExpiry}
                  onCheckedChange={(checked) => handleInputChange("notifyLeaseExpiry", checked)}
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifyInvoiceGeneration" className="text-slate-700 font-medium">Invoice Generation Notifications</Label>
                  <p className="text-sm text-slate-600">Receive email alerts when invoices are automatically generated</p>
                </div>
                <Switch
                  id="notifyInvoiceGeneration"
                  checked={formData.notifyInvoiceGeneration}
                  onCheckedChange={(checked) => handleInputChange("notifyInvoiceGeneration", checked)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveSettings}
              disabled={updateSettingsMutation.isPending || isLoading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}