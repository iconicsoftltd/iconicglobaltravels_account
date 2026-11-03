"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {  ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { FaCheck, FaPlus, FaTrashAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import ButtonLoader from "@/components/loader/ButtonLoader";
import HomeLoader from "@/components/loader/HomeLoader";
import CreateParticularButton from "@/components/common/CreateParticularButton";
import {
  useGetAllAccountsParticularQuery,
  useGetAllParticularQuery,
} from "@/components/store/api/particularAccount/particularAccountApi";
import { useCreateVoucherMutation } from "@/components/store/api/voucher/receiptVoucherApi";
import { useAddThumbnailMutation } from "@/components/store/api/file/fileApi";
import { receiptVoucherSchema } from "@/schemas/voucher/voucherSchema";
import type { FormData } from "@/schemas/voucher/voucherSchema";
import { generateVoucherNo } from "@/utils/helper/randomValueGenerator";
import {
  focusNextVoucherAmount,
  focusNextVoucherParticular,
  focusVoucherParticularByIndex,
} from "@/utils/helper/voucherKeyboardFocus";
import { useSelector } from "react-redux";
import { selectDatePermission } from "@/components/store/store";

const isAllowedParticular = (item: any) => {
  const names = [
    item?.accountType,
    item?.name,
    item?.ledger?.ledgerType,
    item?.ledger?.group?.account,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());

  return !names.some(
    (name) =>
      name.includes("payable") ||
      name.includes("paid"),
  );
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

const isReceiptCreditParticular = (item: any) => {
  const ledgerName = String(item?.ledger?.ledgerType || "").trim().toLowerCase();
  return ["sale", "obtaining short term loan", "obtaining long term loan"].includes(ledgerName);
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

const CreateReceiptVoucherList = () => {
  const [particularSearch, setParticularSearch] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const navigate = useNavigate();
  const datePermission = useSelector(selectDatePermission);

  const [createVoucher, { isLoading: createVoucherLoading }] =
    useCreateVoucherMutation();
  const [uploadFile, { isLoading: fileUploading }] = useAddThumbnailMutation();

  const { data: accounts, isLoading: accountsLoading } =
    useGetAllAccountsParticularQuery({});
  const { data: allParticulars, isLoading: particularLoading } =
    useGetAllParticularQuery({ size: 1000 });

  const selectedBranch = localStorage.getItem("selectedBranch");
  const branchName = selectedBranch ? JSON.parse(selectedBranch)?.name : "";

  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(receiptVoucherSchema),
    defaultValues: {
      voucherNo: generateVoucherNo("RV", branchName),
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

  // ✅ FIX: real-time watch
  const watchEntries = useWatch({
    control,
    name: "entries",
  });

  // ✅ real-time totals
  const { totalDebit, totalCredit } = useMemo(() => {
    return (watchEntries || []).reduce(
      (acc, entry) => {
        const val = Number(entry?.amount) || 0;
        if (entry?.type === "Debit") acc.totalDebit += val;
        if (entry?.type === "Credit") acc.totalCredit += val;
        return acc;
      },
      { totalDebit: 0, totalCredit: 0 },
    );
  }, [watchEntries]);

  if (accountsLoading || particularLoading) return <HomeLoader />;

  const particularOptions =
    allParticulars?.data?.filter(isAllowedParticular) || [];
  const cashBankOptions = uniqueCashBankOptions(accounts?.data || []);

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
    if (totalDebit !== totalCredit) {
      toast.error("Debit and Credit totals must be equal!");
      return;
    }

    try {
      const attachments = selectedFiles.length
        ? await uploadFiles(selectedFiles)
        : [];

      if (selectedFiles.length && attachments.length !== selectedFiles.length) {
        throw new Error("One or more attachment uploads failed.");
      }

      const result = await createVoucher({
        ...data,
        attachments: [...(data.attachments || []), ...attachments],
      }).unwrap();
      if (result?.success) {
        toast.success("Voucher submitted successfully!");
        navigate("/receipt-voucher");
      }
    } catch (error: any) {
      const message = error?.data?.message || error?.message || "Submission failed.";
      toast.error(message.includes("upload") ? message : `Attachment upload failed: ${message}`);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="p-8 bg-slate-50 min-h-screen"
    >
      <div className="max-w-7xl mx-auto bg-white shadow-sm rounded-xl border border-gray-100 p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-700">
            Receipt Voucher Information
          </h2>
          <CreateParticularButton />
        </div>

        {/* HEADER */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <Label>Voucher No*</Label>
            <Controller
              control={control}
              name="voucherNo"
              render={({ field }) => <Input {...field} readOnly />}
            />
          </div>
          {/* Date */}
                 
          {(datePermission.read || datePermission.create) && (
            <div>
              <Label>Date*</Label>
              <Controller
                control={control}
                name="date"
                render={({ field }) => (
                  <Input
                    type="date"
                    value={field.value || ""}
                    disabled={!datePermission.create}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
            </div>
          )}
        </div>

        {/* TABLE */}
        <div className="border rounded-lg overflow-hidden">
          {fields.map((field, index) => {
            const entry = watchEntries?.[index];
            const entryType = entry?.type;

            // Receipt rule: Debit side = only Cash/Bank particulars, Credit side = everything else
            const options =
              entryType === "Debit"
                ? cashBankOptions
                : particularOptions.filter(isReceiptCreditParticular);

            const selectedParticular = options?.find(
              (opt: any) => opt.id === entry?.particularId,
            );

            return (
              <div
                key={field.id}
                className="grid grid-cols-12 gap-4 p-4 border-b"
              >
                {/* TYPE */}
                <div className="col-span-2">
                  <Controller
                    control={control}
                    name={`entries.${index}.type`}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger onKeyDown={(event) => {
                          if (event.key === "Tab" && !event.shiftKey) {
                            event.preventDefault();
                            focusVoucherParticularByIndex(index);
                          }
                        }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Debit">Dr</SelectItem>
                          <SelectItem value="Credit">Cr</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* PARTICULAR */}
                <div className="col-span-4">
                  <Controller
                    control={control}
                    name={`entries.${index}.particularId`}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full"
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
                            {selectedParticular?.accountType ||
                              selectedParticular?.name ||
                              selectedParticular?.ledger?.ledgerType ||
                              selectedParticular?.ledger?.group?.account ||
                              "Select Particular"}
                            <ChevronsUpDown />
                          </Button>
                        </PopoverTrigger>

                        <PopoverContent className="w-[300px] p-0">
                          <Command>
                            <CommandInput data-voucher-search-index={index} placeholder="Search..." value={particularSearch} onValueChange={setParticularSearch} />
                            <CommandList>
                              <CommandEmpty>No results</CommandEmpty>
                              <CommandGroup>{options?.filter((item: any) =>
                          String(item?.accountType || "").toLowerCase().includes(particularSearch.toLowerCase())
                        ).map((item: any) => (
                                  <CommandItem
                                    key={item.id}
                                    onSelect={() => {
                                      field.onChange(item.id);
                                      focusNextVoucherParticular(index);
                                    }}
                                  >
                                    <FaCheck
                                      className={cn(
                                        "mr-2",
                                        field.value === item.id
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    {item.accountType || item.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </div>

                {/* DEBIT */}
                <div className="col-span-2">
                  <Controller
                    control={control}
                    name={`entries.${index}.amount`}
                    render={({ field }) => (
                      <Input
                        type="number"
                        data-voucher-amount-index={index}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            focusNextVoucherAmount(index);
                          }
                        }}
                        disabled={entryType !== "Debit"}
                        value={entryType === "Debit" ? field.value || "" : ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? 0 : Number(e.target.value),
                          )
                        }
                      />
                    )}
                  />
                </div>

                {/* CREDIT */}
                <div className="col-span-3">
                  <Controller
                    control={control}
                    name={`entries.${index}.amount`}
                    render={({ field }) => (
                      <Input
                        type="number"
                        data-voucher-amount-index={index}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            focusNextVoucherAmount(index);
                          }
                        }}
                        disabled={entryType !== "Credit"}
                        value={entryType === "Credit" ? field.value || "" : ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? 0 : Number(e.target.value),
                          )
                        }
                      />
                    )}
                  />
                </div>

                {/* ACTION */}
                <div className="col-span-1 flex gap-2">
                  {index >= 2 && (
                    <Button type="button" onClick={() => remove(index)}>
                      <FaTrashAlt />
                    </Button>
                  )}
                  {index === fields.length - 1 && (
                    <Button
                      type="button"
                      onClick={() =>
                        append({
                          particularId: 0,
                          type: "Credit",
                          amount: 0,
                        })
                      }
                    >
                      <FaPlus />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {/* TOTAL */}
          <div className="grid grid-cols-12 p-4 bg-gray-50 font-bold">
            <div className="col-span-6 text-right">Total</div>
            <div className="col-span-2 text-center">{totalDebit}</div>
            <div className="col-span-3 text-center">{totalCredit}</div>
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
                  onChange={(event) =>
                    setSelectedFiles(Array.from(event.target.files || []))
                  }
                />
                Choose Files
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedFiles.map((file, index) => (
                  <span
                    key={`${file.name}-${index}`}
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

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" onClick={() => navigate(-1)}>
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={
              createVoucherLoading ||
              fileUploading ||
              totalDebit !== totalCredit ||
              totalDebit === 0
            }
          >
            {createVoucherLoading || fileUploading ? <ButtonLoader /> : "Submit"}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default CreateReceiptVoucherList;
