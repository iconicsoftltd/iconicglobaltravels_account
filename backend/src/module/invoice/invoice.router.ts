import { Router } from "express";
import { verifyBranchPermissionCreate } from "../../middleware/verifyBranchPermissionCreate";
import { verifyBranchPermissionGet } from "../../middleware/verifyBranchPermissionGet";
import { verifyJwt } from "../../middleware/verifyJwt";
import { Action, Module, verifyPermission } from "../../middleware/verifyPermission";
import { cancelInvoice, collectInvoicePayment, createInvoice, deleteInvoice, finalizeDraftInvoice, getInvoiceById, getInvoices, getInvoiceSummaryReport, refundInvoice, restoreDraftInvoice, updateDraftInvoice, updateInvoicePayment } from "./invoice.controller";
import { verifyCancelInvoice, verifyCreateInvoice, verifyPayment, verifyRefundInvoice, verifyUpdateDraftInvoice, verifyUpdatePayment } from "./invoice.validation";

const router = Router();
router.post("/", verifyCreateInvoice, verifyJwt, verifyBranchPermissionCreate, verifyPermission(Module.Invoice, Action.create), createInvoice);
router.get("/", verifyJwt, verifyBranchPermissionGet, verifyPermission(Module.Invoice, Action.read), getInvoices);
router.get("/reports/summary", verifyJwt, verifyBranchPermissionGet, verifyPermission(Module.Invoice, Action.read), getInvoiceSummaryReport);
router.get("/:id", verifyJwt, verifyPermission(Module.Invoice, Action.read), getInvoiceById);
router.put("/:id", verifyUpdateDraftInvoice, verifyJwt, verifyBranchPermissionCreate, verifyPermission(Module.Invoice, Action.update), updateDraftInvoice);
router.post("/:id/finalize", verifyUpdateDraftInvoice, verifyJwt, verifyBranchPermissionCreate, verifyPermission(Module.Invoice, Action.update), finalizeDraftInvoice);
router.post("/:id/cancel", verifyCancelInvoice, verifyJwt, verifyBranchPermissionCreate, verifyPermission(Module.Invoice, Action.update), cancelInvoice);
router.post("/:id/restore-draft", verifyCancelInvoice, verifyJwt, verifyBranchPermissionCreate, verifyPermission(Module.Invoice, Action.update), restoreDraftInvoice);
router.delete("/:id", verifyCancelInvoice, verifyJwt, verifyBranchPermissionCreate, verifyPermission(Module.Invoice, Action.delete), deleteInvoice);
router.post("/:id/refund", verifyRefundInvoice, verifyJwt, verifyBranchPermissionCreate, verifyPermission(Module.Invoice, Action.update), refundInvoice);
router.post("/:id/payments", verifyPayment, verifyJwt, verifyBranchPermissionCreate, verifyPermission(Module.Invoice, Action.update), collectInvoicePayment);
router.put("/:id/payments/:paymentId", verifyUpdatePayment, verifyJwt, verifyBranchPermissionCreate, verifyPermission(Module.Invoice, Action.update), updateInvoicePayment);
export default router;

