import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPropertySchema, type InsertProperty, type Property, type CompanySettings } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Trash2, FileText, X, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EditPropertyModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditPropertyModal({ property, isOpen, onClose }: EditPropertyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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

  // Reset form when property changes
  useEffect(() => {
    if (property) {
      form.reset({
        name: property.name,
        address: property.address,
        propertyType: property.propertyType,
        rentExcludingVat: property.rentExcludingVat,
        rentIncludingVat: property.rentIncludingVat,
        tenantName: property.tenantName || "",
        tenantPhone: property.tenantPhone || "",
        tenantEmail: property.tenantEmail || "",
        leaseStartDate: property.leaseStartDate ? new Date(property.leaseStartDate).toISOString().split('T')[0] : "",
        leaseEndDate: property.leaseEndDate ? new Date(property.leaseEndDate).toISOString().split('T')[0] : "",
        isOccupied: property.isOccupied,
        isVatExempt: property.isVatExempt || false,
        rentalAgreementPath: property.rentalAgreementPath || "",
        agreementTemplatePath: property.agreementTemplatePath || "",
      });
      
      // Set existing files
      setUploadedFiles({
        rentalAgreement: property.rentalAgreementPath || undefined,
        agreementTemplate: property.agreementTemplatePath || undefined,
      });
    }
  }, [property, form]);

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

  const handleFileDelete = (fieldName: string) => {
    setUploadedFiles(prev => ({ ...prev, [fieldName]: undefined }));
    form.setValue(fieldName as keyof InsertProperty, "");
  };

  const updatePropertyMutation = useMutation({
    mutationFn: async (data: InsertProperty) => {
      const response = await apiRequest("PUT", `/api/properties/${property.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Property Updated",
        description: "Property has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update property. Please try again.",
        variant: "destructive",
      });
      console.error("Property update error:", error);
    }
  });

  const deletePropertyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/properties/${property.id}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Property Deleted",
        description: "Property has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete property. Please try again.",
        variant: "destructive",
      });
      console.error("Property deletion error:", error);
    }
  });

  const onSubmit = async (data: InsertProperty) => {
    setIsSubmitting(true);
    try {
      // Determine if property is occupied based on tenant information
      const isOccupied = !!(data.tenantName || data.tenantEmail || data.tenantPhone);
      
      const propertyData = {
        ...data,
        isOccupied,
        rentalAgreementPath: uploadedFiles.rentalAgreement || null,
        agreementTemplatePath: uploadedFiles.agreementTemplate || null,
      };
      
      await updatePropertyMutation.mutateAsync(propertyData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePropertyMutation.mutateAsync();
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Watch VAT exemption status
  const watchIsVatExempt = form.watch("isVatExempt");

  // Auto-calculate VAT when rent excluding VAT changes
  const handleRentExVatChange = (value: string) => {
    form.setValue("rentExcludingVat", value);
    const isVatExempt = form.getValues("isVatExempt");
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      if (isVatExempt) {
        form.setValue("rentIncludingVat", value);
      } else {
        const rentIncVat = (numValue * 1.15).toFixed(2);
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
        const rentExVat = (numValue / 1.15).toFixed(2);
        form.setValue("rentExcludingVat", rentExVat);
      }
    }
  };

  // Get dynamic VAT rate from company settings
  const getVatMultiplier = () => {
    const vatRate = parseFloat(companySettings?.vatRate || '15.00');
    return 1 + (vatRate / 100);
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
          <DialogTitle className="text-2xl font-bold">Edit Property</DialogTitle>
          <p className="text-gray-500">Update the details for {property.name}</p>
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
                        <Select onValueChange={field.onChange} value={field.value}>
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
                            <p className="text-xs text-gray-500">{uploadedFiles.rentalAgreement.split('/').pop()}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFileDelete('rentalAgreement');
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
                            <p className="text-xs text-gray-500">{uploadedFiles.agreementTemplate.split('/').pop()}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFileDelete('agreementTemplate');
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
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <Button 
                    type="button" 
                    variant="destructive" 
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Property
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 border-white/20">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-red-600 dark:text-red-400">
                      Delete Property
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
                      Are you sure you want to delete "{property.name}"? This action cannot be undone and will remove all associated data including invoices and notifications.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="hover:bg-gray-100 dark:hover:bg-gray-700">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700 text-white"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Deleting...
                        </>
                      ) : (
                        "Delete Property"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <div className="flex items-center space-x-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
