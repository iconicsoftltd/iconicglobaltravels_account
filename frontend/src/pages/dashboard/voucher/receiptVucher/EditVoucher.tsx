"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { format, parseISO } from "date-fns";
import { FaPlus, FaTrashAlt } from "react-icons/fa";
import { CalendarIcon } from "lucide-react";
import { GrNotes } from "react-icons/gr";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";

import {
  useGetAllAccountsParticularQuery,
  useGetAllParticularQuery,
} from "@/components/store/api/particularAccount/particularAccountApi";
import {
  useGetVoucherByIdQuery,
  useUpdateVoucherMutation,
} from "@/components/store/api/voucher/receiptVoucherApi";
import { useAddThumbnailMutation } from "@/components/store/api/file/fileApi";

import { generateVoucherNo } from "@/utils/helper/randomValueGenerator";
import {
  focusNextVoucherAmount,
  focusNextVoucherParticular,
  focusVoucherParticularByIndex,
} from "@/utils/helper/voucherKeyboardFocus";
import HomeLoader from "@/components/loader/HomeLoader";
import ButtonLoader from "@/components/loader/ButtonLoader";
import { zodResolver } from "@hookform/resolvers/zod";
import { receiptVoucherSchema } from "@/schemas/voucher/voucherSchema";
import type { FormData } from "@/schemas/voucher/voucherSchema";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectDatePermission } from "@/components/store/store";
const getVoucherOptionLabel = (item: any) => {
  const particular = item?.accountType || item?.name || "";
  const ledger = item?.ledger?.ledgerType || "";
  return particular && ledger ? `${particular} (${ledger})` : particular || ledger || "Unnamed";
};
const isCashOrBank = (item: any) => {
  // const accountType = String(item?.accountType || item?.name || "")
  //   .trim()
  //   .toLowerCase();
  const ledgerType = String(item?.ledger?.ledgerType || "")
    .trim()
    .toLowerCase();

  return ["cash", "bank", "bkash", "nagad"].includes(ledgerType);
};

const normalizeOptionText = (value: unknown) => String(value ?? "").trim().toLowerCase();
const isReceiptCreditParticular = (item: any) => {
  const ledgerType = normalizeOptionText(item?.ledger?.ledgerType);
  const groupName = normalizeOptionText(item?.ledger?.group?.accountType);
  const groupAccount = normalizeOptionText(item?.ledger?.group?.account);
  if (ledgerType.includes("accounts payable")) return false;
  const isCurrentAsset = groupName.includes("current asset") ||
    (groupAccount === "assets" && !groupName.includes("fixed asset"));
  const isCashBank = ["cash", "cash in hand", "cash at bank", "bank", "bkash", "nagad"].includes(ledgerType);
  if (isCurrentAsset) return !isCashBank;
  return groupAccount === "income" || groupAccount === "liability" || groupAccount === "equity" ||
    /income|non.?operating|short.?term liability|long.?term liability|equity/.test(groupName);
};const uniqueCashBankOptions = (items: any[] = []) => {
  const optionMap = new Map<string, any>();

  items.filter(isCashOrBank).forEach((item) => {
    const key = String(item?.accountType || item?.name || item?.id)
      .trim()
      .toLowerCase();

    if (!optionMap.has(key)) optionMap.set(key, item);
  });

  return Array.from(optionMap.values()).sort((a, b) => { const order: Record<string, number> = { cash: 0, bank: 1, bkash: 2, nagad: 3 }; const aType = String(a?.ledger?.ledgerType || "").trim().toLowerCase(); const bType = String(b?.ledger?.ledgerType || "").trim().toLowerCase(); return (order[aType] ?? 99) - (order[bType] ?? 99); });
};
const EditVoucher = () => {
  const [particularSearch, setParticularSearch] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { id } = useParams();
  const datePermission = useSelector(selectDatePermission);
  const navigate = useNavigate();

  const [date, setDate] = useState<Date | undefined>(new Date());

  const [editVoucher, { isLoading: updateLoading }] =
    useUpdateVoucherMutation();
  const [uploadFile, { isLoading: fileUploading }] = useAddThumbnailMutation();

  const { data: accounts, isLoading: accountsLoading } =
    useGetAllAccountsParticularQuery({});
  const { data: allParticulars, isLoading: particularLoading } =
    useGetAllParticularQuery({ size: 1000 });
  const { data: singleVoucher, isLoading: voucherLoading } =
    useGetVoucherByIdQuery(id);

  const { control, handleSubmit, watch, reset, setValue } = useForm<FormData>({
    resolver: zodResolver(receiptVoucherSchema),
    defaultValues: {
      voucherNo: generateVoucherNo(),
      type: "RECEIPT",
      date: format(new Date(), "yyyy-MM-dd"),
      narration: "",
      attachments: [],
      entries: [
        { particularId: 0, type: "Debit", amount: 0 },
        { particularId: 0, type: "Credit", amount: 0 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "entries",
  });

  useEffect(() => {
    if (singleVoucher?.data) {
      const v = singleVoucher.data;
      setDate(v.date ? parseISO(v.date) : new Date());
      reset({
        voucherNo: v.voucherNo,
        type: v.type,
        date: format(parseISO(v.date), "yyyy-MM-dd"),
        narration: v.narration || "",
        attachments: (v.attachments || []).map((attachment: any) => ({
          fileName: attachment.fileName || attachment.originalName || "attachment",
          originalName: attachment.originalName || attachment.fileName || "attachment",
          mimeType: attachment.mimeType || "application/octet-stream",
          fileSize: Number(attachment.fileSize || 0),
          fileUrl: attachment.fileUrl || attachment.url || "",
        })),
        entries:
          v.particulars && v.particulars.length > 0
            ? v.particulars.map((p: any) => ({
                particularId: p.particularId,
                type: p.type,
                amount: p.amount,
              }))
            : [
                { particularId: 0, type: "Debit", amount: 0 },
                { particularId: 0, type: "Credit", amount: 0 },
              ],
      });
    }
  }, [singleVoucher, reset]);

  if (accountsLoading || particularLoading || voucherLoading)
    return <HomeLoader />;

  const entries = watch("entries");
  const existingAttachments = watch("attachments") || [];
  const cashBankOptions = uniqueCashBankOptions(accounts?.data || []);
  const receiptCreditOptions = allParticulars?.data?.filter(isReceiptCreditParticular) || [];

  const totalDebit = entries
    .filter((e) => e.type === "Debit")
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalCredit = entries
    .filter((e) => e.type === "Credit")
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return [];

    const uploaded: any[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("files", file);
      const response = await uploadFile(formData).unwrap();
      const payload = Array.isArray(response?.data)
        ? response.data
        : [response?.data].filter(Boolean);
      uploaded.push(...payload);
    }

    return uploaded;
  };

  const onSubmit = async (data: FormData) => {
    const payload = {
      ...data,
      date: date ? format(date, "yyyy-MM-dd") : undefined,
    };

    if (totalDebit !== totalCredit) {
      toast.error("Debit and Credit totals must be equal!");
      return;
    }

    try {
      const uploadedAttachments = selectedFiles.length
        ? await uploadFiles(selectedFiles)
        : [];

      if (selectedFiles.length && uploadedAttachments.length !== selectedFiles.length) {
        throw new Error("One or more attachment uploads failed.");
      }

      const attachments = [
        ...(data.attachments || []),
        ...uploadedAttachments,
      ];

      const result = await editVoucher({
        id,
        ...payload,
        attachments,
      }).unwrap();
      if (result?.success) {
        toast.success("Voucher updated successfully!");
        navigate("/receipt-voucher");
      }
    } catch (error: any) {
      const message = error?.data?.message || error?.message || "Update failed.";
      toast.error(message.includes("upload") ? message : `Attachment upload failed: ${message}`);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="p-6 bg-white shadow-sm rounded-lg border border-gray-200 text-sm"
    >
      <h2 className="text-lg font-semibold text-gray-700 mb-4">
        Edit Receipt Voucher
      </h2>

      {/* Voucher Info */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Voucher No */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Label className="text-gray-600">Voucher No*</Label>
            <Controller
              control={control}
              name="voucherNo"
              render={({ field }) => (
                <Input {...field} className="mt-1 bg-gray-50" />
              )}
            />
          </div>
        </div>

        {/* Date */}
        {(datePermission.read || datePermission.create) && (
          <div>
            <Label>Date*</Label>
            <Controller
              control={control}
              name="date"
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={!datePermission.create}
                      className={cn(
                        !datePermission.create &&
                          "opacity-60 cursor-not-allowed",
                      )}
                    >
                      {field.value
                        ? format(new Date(field.value), "dd-MM-yyyy")
                        : "Pick a date"}
                      <CalendarIcon />
                    </Button>
                  </PopoverTrigger>
                  {datePermission.create && (
                    <PopoverContent>
                      <Calendar
                        mode="single"
                        selected={
                          field.value ? new Date(field.value) : undefined
                        }
                        onSelect={(d) =>
                          field.onChange(d ? format(d, "yyyy-MM-dd") : "")
                        }
                      />
                    </PopoverContent>
                  )}
                </Popover>
              )}
            />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden border rounded-md">
        {/* Header */}
        <div className="grid grid-cols-12 bg-primary p-2 font-semibold text-white text-center">
          <div className="col-span-2">Dr / Cr</div>
          <div className="col-span-5">Particulars</div>
          <div className="col-span-2">Debit</div>
          <div className="col-span-2">Credit</div>
          <div className="col-span-1">Action</div>
        </div>

        {/* Rows */}
        {fields.map((field, index) => {
          const isAccount = index === 0;
          const options = isAccount ? cashBankOptions : receiptCreditOptions;

          return (
            <div
              key={field.id}
              className="grid grid-cols-12 items-start border-t p-2 gap-2 text-center"
            >
              {/* Dr / Cr */}
              <div className="col-span-2">
                <Controller
                  control={control}
                  name={`entries.${index}.type`}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger
                        className="border border-gray-400"
                        onKeyDown={(event) => {
                          if (event.key === "Tab" && !event.shiftKey) {
                            event.preventDefault();
                            focusVoucherParticularByIndex(index);
                          }
                        }}
                      >
                        <SelectValue placeholder="Select one" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Debit">Dr</SelectItem>
                        <SelectItem value="Credit">Cr</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Particulars */}
              <div className="col-span-5">
                <Controller
                  control={control}
                  name={`entries.${index}.particularId`}
                  render={({ field }) => (
                    <Select
                      onValueChange={(v) => {
                        field.onChange(Number(v));
                        focusNextVoucherParticular(index);
                      }}
                      value={field.value?.toString()}
                    >
                      <SelectTrigger
                        className="border border-gray-400"
                        data-voucher-particular-index={index}
                        onKeyDown={(event) => {
                          if (
                            event.key.length === 1 &&
                            !event.ctrlKey &&
                            !event.metaKey &&
                            !event.altKey
                          ) {
                            event.preventDefault();
                          }
                        }}
                      >
                        <SelectValue placeholder={"Select one"} />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <Input
                            data-voucher-search-index={index}
                            placeholder="Search..."
                            value={particularSearch}
                            onChange={(e) => setParticularSearch(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.currentTarget.dataset.navUsed) {
                                e.preventDefault();
                                const firstItem = e.currentTarget.closest("[role=\"listbox\"]")?.querySelector<HTMLElement>("[role=\"option\"]:not([data-disabled])");
                                firstItem?.click();
                                return;
                              }
                              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                                e.currentTarget.dataset.navUsed = "true";
                                return;
                              }
                              if (e.key !== "Escape") {
                                e.stopPropagation();
                              }
                            }}
                          />
                        </div>
                        {options?.filter((item: any) =>
                          String(item?.accountType || "").toLowerCase().includes(particularSearch.toLowerCase())
                        ).map((item: any) => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {getVoucherOptionLabel(item)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Debit */}
              <div className="col-span-2">
                <Controller
                  control={control}
                  name={`entries.${index}.amount`}
                  render={({ field }) => (
                    <Input
                      type="number"
                      data-voucher-amount-index={index}
                      className="text-center"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          focusNextVoucherAmount(index);
                        }
                      }}
                      disabled={watch(`entries.${index}.type`) !== "Debit"}
                      value={
                        watch(`entries.${index}.type`) === "Debit"
                          ? field.value || ""
                          : ""
                      }
                      onChange={(e) =>
                        field.onChange(Number(e.target.value) || 0)
                      }
                    />
                  )}
                />
              </div>

              {/* Credit */}
              <div className="col-span-2">
                <Controller
                  control={control}
                  name={`entries.${index}.amount`}
                  render={({ field }) => (
                    <Input
                      type="number"
                      data-voucher-amount-index={index}
                      className="text-center"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          focusNextVoucherAmount(index);
                        }
                      }}
                      disabled={watch(`entries.${index}.type`) !== "Credit"}
                      value={
                        watch(`entries.${index}.type`) === "Credit"
                          ? field.value || ""
                          : ""
                      }
                      onChange={(e) =>
                        field.onChange(Number(e.target.value) || 0)
                      }
                    />
                  )}
                />
              </div>

              {/* Action */}
              <div className="col-span-1 flex justify-center">
                {index === fields.length - 1 && (
                  <Button
                    size="icon"
                    variant="default"
                    type="button"
                    onClick={() =>
                      append({ particularId: 0, type: "Debit", amount: 0 })
                    }
                  >
                    <FaPlus className="text-white" />
                  </Button>
                )}
                {index > 1 && (
                  <Button
                    size="icon"
                    variant="outline"
                    type="button"
                    onClick={() => remove(index)}
                  >
                    <FaTrashAlt className="text-red-600" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {/* Totals */}
        <div className="grid grid-cols-12 gap-2 items-center border-t p-2 font-semibold text-center text-gray-700 bg-gray-50">
          <div className="col-span-7 text-right pr-4">Total</div>
          <div className="col-span-2">
            <Input
              readOnly
              value={totalDebit}
              className="text-center bg-white"
            />
          </div>
          <div className="col-span-2">
            <Input
              readOnly
              value={totalCredit}
              className="text-center bg-white"
            />
          </div>
          <div className="col-span-1"></div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-medium text-slate-700">Attachments</p>
              <p className="text-xs text-slate-500">Images, PDF, DOC, DOCX, XLS, XLSX, CSV</p>
            </div>
            <label className="cursor-pointer rounded-md border border-primary bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10">
              <input
                type="file"
                multiple
                className="hidden"
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
              />
              Add Files
            </label>
          </div>

          {(existingAttachments.length > 0 || selectedFiles.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {existingAttachments.map((attachment: any, index: number) => (
                <span
                  key={`existing-${attachment.fileUrl || attachment.originalName || index}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700"
                >
                  <a
                    href={attachment.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {attachment.originalName || attachment.fileName || "Attachment"}
                  </a>
                  <button
                    type="button"
                    aria-label={`Remove ${attachment.originalName || attachment.fileName || "attachment"}`}
                    onClick={() => {
                      setValue(
                        "attachments",
                        (watch("attachments") || []).filter((_, i) => i !== index),
                        { shouldDirty: true }
                      );
                    }}
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600 hover:bg-red-200"
                  >
                    ×
                  </button>
                </span>
              ))}
              {selectedFiles.map((file, index) => (
                <span
                  key={`new-${file.name}-${index}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700"
                >
                  <span>{file.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== index))}
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600 hover:bg-red-200"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label className="text-gray-600">Note</Label>
          <Controller
            control={control}
            name="narration"
            render={({ field }) => (
              <Textarea
                {...field}
                placeholder="Add any notes or remarks..."
                className="mt-1 border border-secondary/20 focus-visible:ring-0 focus-visible:border-secondary transition-colors"
              />
            )}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button
          type="button"
          disabled={updateLoading || fileUploading}
          variant="red_outeline"
          onClick={() => navigate("/receipt-voucher")}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={updateLoading || fileUploading}
          type="submit"
        >
          {updateLoading || fileUploading ? <ButtonLoader /> : <GrNotes className="" />}
          Update
        </Button>
      </div>
    </form>
  );
};

export default EditVoucher;
