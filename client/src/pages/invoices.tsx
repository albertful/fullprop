import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Property, Invoice } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, FileText, DollarSign, Calendar, CheckCircle, Clock, AlertCircle, Edit, Eye, Send, Trash2 } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";
import InvoiceEditModal from "@/components/invoice-edit-modal";
import SendInvoiceModal from "@/components/send-invoice-modal";

export default function Invoices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "draft" | "sent" | "paid">("all");
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [sendingInvoiceId, setSendingInvoiceId] = useState<number | null>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: properties = [], isLoading: loadingProperties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const updateInvoiceStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PUT", `/api/invoices/${id}/status`, { status });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoice status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice status",
        variant: "destructive",
      });
    },
  });

  const isLoading = loadingInvoices || loadingProperties;

  const filteredInvoices = invoices.filter((invoice: Invoice) => {
    const property = properties.find((p: Property) => p.id === invoice.propertyId);
    const matchesSearch = property?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property?.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "all" || invoice.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-4 w-4" />;
      case "sent":
        return <Clock className="h-4 w-4" />;
      case "pending":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500";
      case "sent":
        return "bg-blue-500";
      case "pending":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleStatusChange = (invoiceId: number, newStatus: string) => {
    updateInvoiceStatusMutation.mutate({ id: invoiceId, status: newStatus });
  };

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const response = await apiRequest("DELETE", `/api/invoices/${invoiceId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoice deleted successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to delete invoice",
        variant: "destructive"
      });
    }
  });

  const handleDeleteInvoice = (invoiceId: number) => {
    deleteInvoiceMutation.mutate(invoiceId);
    setDeletingInvoiceId(null);
  };

  const handleSendInvoice = (invoiceId: number) => {
    setSendingInvoiceId(invoiceId);
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
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              Invoices
            </h1>
            <p className="text-slate-600 mt-1">Track and manage property invoices</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search by property, address, or invoice number..."
                className="pl-10 bg-white/50 border-white/20 rounded-xl h-12 text-slate-700 placeholder:text-slate-400 focus:bg-white/80 transition-all duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filter} onValueChange={(value: "all" | "draft" | "sent" | "paid") => setFilter(value)}>
              <SelectTrigger className="w-full md:w-48 bg-white/50 border-white/20 rounded-xl h-12 text-slate-700 focus:bg-white/80 transition-all duration-200">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Invoices</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Invoices Grid */}
        {filteredInvoices.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="text-slate-400 mb-4">
                <FileText className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">No invoices found</h3>
              <p className="text-slate-600 mb-6 max-w-md">
                {searchTerm || filter !== "all" ? "No invoices match your search criteria." : "Invoices will appear here when generated from properties."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInvoices.map((invoice: Invoice) => {
              const property = properties.find((p: Property) => p.id === invoice.propertyId);
              const statusColor = getStatusColor(invoice.status);
              const statusIcon = getStatusIcon(invoice.status);
              
              return (
                <div key={invoice.id} className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">{invoice.invoiceNumber}</h3>
                      <p className="text-sm text-slate-600">{property?.name || "Unknown Property"}</p>
                    </div>
                    <Badge variant="secondary" className={`${statusColor} text-white font-medium flex items-center gap-1`}>
                      {statusIcon}
                      {invoice.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white/30 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-1">Property Address</p>
                      <p className="text-sm font-medium text-slate-700">{property?.address || "Address not found"}</p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <DollarSign className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Amount</p>
                        <p className="text-lg font-semibold text-slate-800">{formatCurrency(invoice.amount)}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Due Date</p>
                        <p className="text-sm font-medium text-slate-700">{formatDate(new Date(invoice.dueDate))}</p>
                      </div>
                    </div>

                    {invoice.sentDate && (
                      <div className="flex items-center space-x-3">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">Sent Date</p>
                          <p className="text-sm font-medium text-slate-700">{formatDate(new Date(invoice.sentDate))}</p>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="bg-white/50 border-white/20 hover:bg-blue-50"
                          onClick={() => setEditingInvoiceId(invoice.id)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="bg-white/50 border-white/20 hover:bg-green-50"
                          onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="bg-white/50 border-white/20 hover:bg-red-50 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-white/95 backdrop-blur-xl border-white/20">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-slate-800">Delete Invoice</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-600">
                                Are you sure you want to delete invoice {invoice.invoiceNumber}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-white/50 border-white/20 hover:bg-slate-50">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleDeleteInvoice(invoice.id)}
                              >
                                Delete Invoice
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        {invoice.status === 'draft' && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                            onClick={() => handleSendInvoice(invoice.id)}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Send
                          </Button>
                        )}
                      </div>
                      
                      <Select value={invoice.status} onValueChange={(value) => handleStatusChange(invoice.id, value)}>
                        <SelectTrigger className="w-full bg-white/50 border-white/20 rounded-xl text-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invoice Edit Modal */}
      {editingInvoiceId && (
        <InvoiceEditModal
          invoiceId={editingInvoiceId}
          isOpen={!!editingInvoiceId}
          onClose={() => setEditingInvoiceId(null)}
        />
      )}

      {/* Send Invoice Modal */}
      {sendingInvoiceId && (
        <SendInvoiceModal
          invoiceId={sendingInvoiceId}
          isOpen={!!sendingInvoiceId}
          onClose={() => setSendingInvoiceId(null)}
        />
      )}
    </div>
  );
}