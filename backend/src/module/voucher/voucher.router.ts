import { Router } from "express";
import { verifyJwt } from "../../middleware/verifyJwt";
import { Action, Module, verifyPermission } from "../../middleware/verifyPermission";
import { verifyBranchPermissionCreate } from "../../middleware/verifyBranchPermissionCreate";
import { verifyBranchPermissionGet } from "../../middleware/verifyBranchPermissionGet";
import { verifyVoucher } from "./voucher.validation";
import { archiveVoucher, createVoucher, deleteVoucher, getAllVouchers, getVoucherById, restoreVoucher, updateVoucher } from "./voucher.controller";
import { archiveRole, restoreRole } from "../role/role.controller";


const router = Router();

router.post(
    '/create-voucher',
    verifyVoucher,
    verifyJwt,
    verifyBranchPermissionCreate,
    verifyPermission(Module.Voucher, Action.create),
    createVoucher
)
router.get(
    '/get-voucher-all',
    verifyJwt,
    verifyBranchPermissionGet,
    verifyPermission(Module.Voucher, Action.read),
    getAllVouchers
)
router.get(
    '/get-voucher/:id',
    verifyJwt,
    verifyPermission(Module.Voucher, Action.read),
    getVoucherById
)
router.put(
    '/update-voucher/:id',
    verifyVoucher,
    verifyJwt,
    verifyBranchPermissionCreate,
    verifyPermission(Module.Voucher, Action.update),
    updateVoucher
)
router.delete(
    '/delete-voucher/:id',
    verifyJwt,
    verifyPermission(Module.Voucher, Action.delete),
    deleteVoucher
)

// newly added for archived
router.patch(
    '/archive-voucher/:id',
    verifyJwt,
    verifyPermission(Module.Voucher, Action.archive),
    archiveVoucher
)

router.patch(
    '/restore-voucher/:id',
    verifyJwt,
    verifyPermission(Module.Voucher, Action.restore),
    restoreVoucher
)

// নতুন দুটো route
router.patch(
    '/archive-role/:id',
    verifyJwt,
    verifyPermission(Module.Role, Action.archive),
    archiveRole
)
router.patch(
    '/restore-role/:id',
    verifyJwt,
    verifyPermission(Module.Role, Action.archive),
    restoreRole
)


export default router;