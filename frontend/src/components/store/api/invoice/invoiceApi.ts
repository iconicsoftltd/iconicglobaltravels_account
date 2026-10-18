import { apiSlice } from "../../rootApi/apiSlice";

const selectedBranchId = () => {
  const selectedBranch = localStorage.getItem("selectedBranch");
  return selectedBranch ? JSON.parse(selectedBranch).id : "";
};

export const invoiceApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createInvoice: builder.mutation({
      query: (body) => ({ url: "/invoices", method: "POST", body: { ...body, branchId: selectedBranchId() } }),
      invalidatesTags: ["invoice"],
    }),
    getInvoices: builder.query({
      query: ({ page = 1, size = 10, search = "", status = "" }) => {
        const params = new URLSearchParams({ page: String(page), size: String(size) });
        const branchId = selectedBranchId();
        if (branchId) params.set("branchId", String(branchId));
        if (search) params.set("search", search);
        if (status) params.set("status", status);
        return { url: `/invoices?${params.toString()}`, method: "GET" };
      },
      providesTags: ["invoice"],
    }),
    getInvoiceById: builder.query({ query: (id) => ({ url: `/invoices/${id}`, method: "GET" }), providesTags: ["invoice"] }),
    getInvoiceSummaryReport: builder.query({
      query: ({ fromDate = "", toDate = "", status = "" }) => {
        const params = new URLSearchParams();
        const branchId = selectedBranchId();
        if (branchId) params.set("branchId", String(branchId));
        if (fromDate) params.set("fromDate", fromDate);
        if (toDate) params.set("toDate", toDate);
        if (status) params.set("status", status);
        return { url: `/invoices/reports/summary?${params.toString()}`, method: "GET" };
      },
      providesTags: ["invoice"],
    }),
    updateDraftInvoice: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/invoices/${id}`, method: "PUT", body: { ...body, branchId: selectedBranchId() } }),
      invalidatesTags: ["invoice"],
    }),
    finalizeDraftInvoice: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/invoices/${id}/finalize`, method: "POST", body: { ...body, branchId: selectedBranchId() } }),
      invalidatesTags: ["invoice"],
    }),
    cancelInvoice: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/invoices/${id}/cancel`, method: "POST", body: { ...body, branchId: selectedBranchId() } }),
      invalidatesTags: ["invoice"],
    }),
    restoreDraftInvoice: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/invoices/${id}/restore-draft`, method: "POST", body: { ...body, branchId: selectedBranchId() } }),
      invalidatesTags: ["invoice"],
    }),
    deleteInvoice: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/invoices/${id}`, method: "DELETE", body: { ...body, branchId: selectedBranchId() } }),
      invalidatesTags: ["invoice"],
    }),
    refundInvoice: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/invoices/${id}/refund`, method: "POST", body: { ...body, branchId: selectedBranchId() } }),
      invalidatesTags: ["invoice"],
    }),
    collectInvoicePayment: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/invoices/${id}/payments`, method: "POST", body: { ...body, branchId: selectedBranchId() } }),
      invalidatesTags: ["invoice"],
    }),
    updateInvoicePayment: builder.mutation({
      query: ({ id, paymentId, ...body }) => ({ url: `/invoices/${id}/payments/${paymentId}`, method: "PUT", body: { ...body, branchId: selectedBranchId() } }),
      invalidatesTags: ["invoice"],
    }),
  }),
});

export const { useCreateInvoiceMutation, useGetInvoicesQuery, useGetInvoiceByIdQuery, useGetInvoiceSummaryReportQuery, useUpdateDraftInvoiceMutation, useFinalizeDraftInvoiceMutation, useCancelInvoiceMutation, useRestoreDraftInvoiceMutation, useDeleteInvoiceMutation, useRefundInvoiceMutation, useCollectInvoicePaymentMutation, useUpdateInvoicePaymentMutation } = invoiceApi;

