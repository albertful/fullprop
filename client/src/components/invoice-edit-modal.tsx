import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CalendarIcon, Eye, Save, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface InvoiceEditModalProps {
  invoiceId: number;
  isOpen: boolean;
  onClose: () => void;
}

interface InvoiceFormData {
  invoiceNumber: string;
  amount: string;
  description: string;
  invoiceDate: Date;
  dueDate: Date;
  rentPeriodStart: Date;
  rentPeriodEnd: Date;
}

export default function InvoiceEditModal({ invoiceId, isOpen, onClose }: InvoiceEditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<InvoiceFormData>({
    invoiceNumber: "",
    amount: "",
    description: "",
    invoiceDate: new Date(),
    dueDate: new Date(),
    rentPeriodStart: new Date(),
    rentPeriodEnd: new Date(),
  });

  const { data: invoice, isLoading } = useQuery<any>({
    queryKey: ["/api/invoices", invoiceId],
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${invoiceId}`);
      if (!response.ok) throw new Error('Failed to fetch invoice');
      return response.json();
    },
    enabled: isOpen && !!invoiceId,
  });

  const { data: property } = useQuery<any>({
    queryKey: ["/api/properties", Array.isArray(invoice) ? invoice[0]?.propertyId : invoice?.propertyId],
    enabled: !!(Array.isArray(invoice) ? invoice[0]?.propertyId : invoice?.propertyId),
  });

  // Prefill form when invoice data loads
  useEffect(() => {
    if (invoice) {
      // Handle if invoice comes as array or single object
      const invoiceData = Array.isArray(invoice) ? invoice[0] : invoice;
      
      const safeDate = (dateValue: any) => {
        if (!dateValue) return new Date();
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? new Date() : date;
      };

      const newFormData = {
        invoiceNumber: invoiceData?.invoiceNumber || "",
        amount: invoiceData?.amount || "",
        description: invoiceData?.description || "",
        invoiceDate: safeDate(invoiceData?.invoiceDate),
        dueDate: safeDate(invoiceData?.dueDate),
        rentPeriodStart: safeDate(invoiceData?.rentPeriodStart),
        rentPeriodEnd: safeDate(invoiceData?.rentPeriodEnd),
      };
      
      setFormData(newFormData);
    }
  }, [invoice]);

  const updateInvoiceMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await apiRequest("PATCH", `/api/invoices/${invoiceId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invoice Updated",
        description: "Invoice details have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update invoice. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    updateInvoiceMutation.mutate({
      invoiceNumber: formData.invoiceNumber,
      amount: formData.amount,
      description: formData.description,
      invoiceDate: formData.invoiceDate.toISOString(),
      dueDate: formData.dueDate.toISOString(),
      rentPeriodStart: formData.rentPeriodStart.toISOString(),
      rentPeriodEnd: formData.rentPeriodEnd.toISOString(),
    });
  };

  const handlePreviewPDF = () => {
    window.open(`/api/invoices/${invoiceId}/pdf`, '_blank');
  };

  const updateFormField = (field: keyof InvoiceFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading || !invoice) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center p-8">
            Loading invoice details...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Invoice {Array.isArray(invoice) ? invoice[0]?.invoiceNumber : invoice?.invoiceNumber || 'Loading...'}
            {(Array.isArray(invoice) ? invoice[0]?.isNew : invoice?.isNew) && (
              <Badge className="bg-green-500 text-white">New</Badge>
            )}
            <Badge variant={(Array.isArray(invoice) ? invoice[0]?.status : invoice?.status) === 'sent' ? 'default' : 'secondary'}>
              {Array.isArray(invoice) ? invoice[0]?.status : invoice?.status || 'draft'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Invoice Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={(e) => updateFormField('invoiceNumber', e.target.value)}
                placeholder="Enter invoice number"
              />
            </div>

            <div>
              <Label htmlFor="amount">Amount (ZAR)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => updateFormField('amount', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateFormField('description', e.target.value)}
                placeholder="Enter invoice description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Invoice Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.invoiceDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.invoiceDate ? format(formData.invoiceDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.invoiceDate}
                      onSelect={(date) => date && updateFormField('invoiceDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dueDate ? format(formData.dueDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.dueDate}
                      onSelect={(date) => date && updateFormField('dueDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Right Column - Rental Period */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3">Rental Period</h3>
            </div>

            <div>
              <Label>Period Start</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.rentPeriodStart && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.rentPeriodStart ? format(formData.rentPeriodStart, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.rentPeriodStart}
                    onSelect={(date) => date && updateFormField('rentPeriodStart', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Period End</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.rentPeriodEnd && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.rentPeriodEnd ? format(formData.rentPeriodEnd, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.rentPeriodEnd}
                    onSelect={(date) => date && updateFormField('rentPeriodEnd', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Property Info */}
            {property && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Property Details</h4>
                <p className="text-sm text-gray-600">{property?.name || 'N/A'}</p>
                <p className="text-sm text-gray-600">{property?.address || 'N/A'}</p>
                <p className="text-sm text-gray-600">Tenant: {property?.tenantName || 'N/A'}</p>
                <p className="text-sm text-gray-600">Email: {property?.tenantEmail || 'N/A'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePreviewPDF}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview PDF
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={updateInvoiceMutation.isPending}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateInvoiceMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateInvoiceMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}