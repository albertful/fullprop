import { useState, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPropertySchema, type InsertProperty, type CompanySettings } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Upload, FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddPropertyModal({ isOpen, onClose }: AddPropertyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{
    rentalAgreement?: string;
    agreementTemplate?: string;
  }>({});
  const rentalAgreementRef = useRef<HTMLInputElement>(null);
  const agreementTemplateRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch company settings for dynamic VAT rate
  const { data: companySettings } = useQuery<CompanySettings>({
    queryKey: ['/api/company-settings'],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const form = useForm<InsertProperty>({
    resolver: zodResolver(insertPropertySchema),
    defaultValues: {
      name: "",
      address: "",
      propertyType: "apartment",
      rentExcludingVat: "",
      rentIncludingVat: "",
      tenantName: "",
      tenantPhone: "",
      tenantEmail: "",
      leaseStartDate: "",
      leaseEndDate: "",
      isOccupied: false,
      isVatExempt: false,
      rentalAgreementPath: "",
      agreementTemplatePath: "",
    },
  });

  const handleFileUpload = async (file: File, fieldName: string) => {
    const formData = new FormData();
    formData.append(fieldName, file);
    
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload file");
      }
      
      const result = await response.json();
      setUploadedFiles(prev => ({
        ...prev,
        [fieldName]: result.files[fieldName]
      }));
      
      toast({
        title: "File uploaded",
        description: `${file.name} uploaded successfully`,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const createPropertyMutation = useMutation({
    mutationFn: async (data: InsertProperty) => {
      const propertyData = {
        ...data,
        rentalAgreementPath: uploadedFiles.rentalAgreement || null,
        agreementTemplatePath: uploadedFiles.agreementTemplate || null,
      };
      const response = await apiRequest("POST", "/api/properties", propertyData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Property Added",
        description: "Property has been successfully added to your portfolio.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      form.reset();
      setUploadedFiles({});
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add property. Please try again.",
        variant: "destructive",
      });
      console.error("Property creation error:", error);
    }
  });

  const onSubmit = async (data: InsertProperty) => {
    setIsSubmitting(true);
    try {
      // Determine if property is occupied based on tenant information
      const isOccupied = !!(data.tenantName || data.tenantEmail || data.tenantPhone);
      
      await createPropertyMutation.mutateAsync({
        ...data,
        isOccupied,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-calculate VAT when rent excluding VAT changes
  const watchRentExVat = form.watch("rentExcludingVat");
  const watchIsVatExempt = form.watch("isVatExempt");
  
  // Get dynamic VAT rate from company settings
  const getVatMultiplier = () => {
    const vatRate = parseFloat(companySettings?.vatRate || '15.00');
    return 1 + (vatRate / 100);
  };
  
  const handleRentExVatChange = (value: string) => {
    form.setValue("rentExcludingVat", value);
    const isVatExempt = form.getValues("isVatExempt");
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      if (isVatExempt) {
        form.setValue("rentIncludingVat", value);
      } else {
        const vatMultiplier = getVatMultiplier();
        const rentIncVat = (numValue * vatMultiplier).toFixed(2);
        form.setValue("rentIncludingVat", rentIncVat);
      }
    }
  };

  const handleRentIncVatChange = (value: string) => {
    form.setValue("rentIncludingVat", value);
    const isVatExempt = form.getValues("isVatExempt");
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      if (isVatExempt) {
        form.setValue("rentExcludingVat", value);
      } else {
        const vatMultiplier = getVatMultiplier();
        const rentExVat = (numValue / vatMultiplier).toFixed(2);
        form.setValue("rentExcludingVat", rentExVat);
      }
    }
  };

  const handleVatExemptChange = (checked: boolean) => {
    form.setValue("isVatExempt", checked);
    const rentExVat = form.getValues("rentExcludingVat");
    
    if (rentExVat) {
      const numValue = parseFloat(rentExVat);
      if (!isNaN(numValue) && numValue > 0) {
        if (checked) {
          form.setValue("rentIncludingVat", rentExVat);
        } else {
          const vatMultiplier = getVatMultiplier();
          const rentIncVat = (numValue * vatMultiplier).toFixed(2);
          form.setValue("rentIncludingVat", rentIncVat);
        }
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Add New Property</DialogTitle>
          <p className="text-gray-500">Fill in the details for your new property</p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Property Basic Information */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Riverside Apartments" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="propertyType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="apartment">Apartment</SelectItem>
                            <SelectItem value="house">House</SelectItem>
                            <SelectItem value="townhouse">Townhouse</SelectItem>
                            <SelectItem value="penthouse">Penthouse</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Address *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="123 Main Street, City, Postcode" 
                          rows={2}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Details</h3>
                
                <div className="mb-4">
                  <FormField
                    control={form.control}
                    name="isVatExempt"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleVatExemptChange(checked as boolean);
                            }}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            This property does not collect VAT
                          </FormLabel>
                          <p className="text-xs text-gray-500">
                            Check this if the property is VAT-exempt
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rentExcludingVat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {watchIsVatExempt ? "Monthly Rent *" : "Monthly Rent (Excluding VAT) *"}
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                            <Input 
                              type="number" 
                              placeholder="12000.00" 
                              className="pl-8"
                              {...field}
                              onChange={(e) => handleRentExVatChange(e.target.value)}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {!watchIsVatExempt && (
                    <FormField
                      control={form.control}
                      name="rentIncludingVat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Rent (Including VAT) *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                              <Input 
                                type="number" 
                                placeholder="14400.00" 
                                className="pl-8"
                                {...field}
                                onChange={(e) => handleRentIncVatChange(e.target.value)}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tenant Information */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tenant Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <FormField
                    control={form.control}
                    name="tenantName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tenant Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="tenantPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+27 82 123 4567" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="tenantEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="tenant@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Lease Information */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Lease Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="leaseStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lease Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="leaseEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lease End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Document Upload */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rental Agreement (PDF)
                    </label>
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                      onClick={() => rentalAgreementRef.current?.click()}
                    >
                      {uploadedFiles.rentalAgreement ? (
                        <div className="flex items-center justify-center">
                          <FileText className="h-8 w-8 text-green-600 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-green-600">File uploaded</p>
                            <p className="text-xs text-gray-500">{uploadedFiles.rentalAgreement}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedFiles(prev => ({ ...prev, rentalAgreement: undefined }));
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600">Drop PDF file here or click to browse</p>
                          <p className="text-xs text-gray-500 mt-1">Maximum file size: 10MB</p>
                        </>
                      )}
                      <input 
                        ref={rentalAgreementRef}
                        type="file" 
                        accept=".pdf" 
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file, 'rentalAgreement');
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Agreement Template (DOCX)
                    </label>
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                      onClick={() => agreementTemplateRef.current?.click()}
                    >
                      {uploadedFiles.agreementTemplate ? (
                        <div className="flex items-center justify-center">
                          <FileText className="h-8 w-8 text-green-600 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-green-600">Agreement Template (DOCX)</p>
                            <p className="text-xs text-gray-500">{uploadedFiles.agreementTemplate}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedFiles(prev => ({ ...prev, agreementTemplate: undefined }));
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600">Drop DOCX file here or click to browse</p>
                          <p className="text-xs text-gray-500 mt-1">Maximum file size: 10MB</p>
                        </>
                      )}
                      <input 
                        ref={agreementTemplateRef}
                        type="file" 
                        accept=".docx" 
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file, 'agreementTemplate');
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Property
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
