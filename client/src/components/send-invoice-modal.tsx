import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Send, X } from "lucide-react";

interface SendInvoiceModalProps {
  invoiceId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function SendInvoiceModal({ invoiceId, isOpen, onClose }: SendInvoiceModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [ccEmail, setCcEmail] = useState("");

  const sendInvoiceMutation = useMutation({
    mutationFn: async () => {
      const ccEmails = ccEmail.trim() ? [ccEmail.trim()] : [];
      const response = await apiRequest("POST", `/api/invoices/${invoiceId}/send`, {
        ccEmails
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invoice Sent",
        description: "Invoice has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setCcEmail("");
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invoice",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    sendInvoiceMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Send className="h-5 w-5 text-blue-600" />
            <span>Send Invoice</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-2">
          <div className="space-y-2">
            <Label htmlFor="ccEmail">CC Email (optional)</Label>
            <Input
              id="ccEmail"
              type="email"
              placeholder="someone@example.com"
              value={ccEmail}
              onChange={(e) => setCcEmail(e.target.value)}
              disabled={sendInvoiceMutation.isPending}
            />
            <p className="text-sm text-gray-500">
              Add an email address to CC on this invoice
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              onClick={handleSend}
              disabled={sendInvoiceMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4 mr-2" />
              {sendInvoiceMutation.isPending ? "Sending..." : "Send Invoice"}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              disabled={sendInvoiceMutation.isPending}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}