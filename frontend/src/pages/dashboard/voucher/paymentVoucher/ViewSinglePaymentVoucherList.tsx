import { useVoucherPrint } from "@/components/common/voucherPrintPdf/VoucherPrint";
import { downloadVoucherPdf } from "@/components/common/voucherPrintPdf/VoucherPdf";
import HomeLoader from "@/components/loader/HomeLoader";
import { useGetVoucherByIdQuery } from "@/components/store/api/voucher/receiptVoucherApi";
import Heading from "@/components/typography/Heading";
import { Button } from "@/components/ui/button";
import { appConfiguration } from "@/utils/constant/appConfiguration";
import { numberToBangladeshiCurrencyWords } from "@/utils/helper/numberToBangladeshiWords";
import { FaMailBulk } from "react-icons/fa";
import { FaEarthAfrica, FaFilePdf, FaLocationArrow, FaPhone } from "react-icons/fa6";
import { GrNotes } from "react-icons/gr";
import { useNavigate, useParams } from "react-router-dom";

const normalizeAttachmentUrl = (value?: string) => {
  if (!value) return "";
  const normalized = value.trim();
  if (!normalized) return "";
  const apiOrigin = (import.meta.env.VITE_API_URL || "http://localhost:4003/api/v1").replace(/\/api\/v1\/?$/, "");

  if (normalized.startsWith("/uploads") || normalized.startsWith("uploads/")) {
    return encodeURI(`${apiOrigin}/${normalized.replace(/^\/+/, "")}`);
  }

  // Older uploads may contain localhost URLs saved by the backend. Resolve
  // them against the current deployment instead of the user's own computer.
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(normalized)) {
    try {
      const parsed = new URL(normalized);
      return encodeURI(`${apiOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`);
    } catch {
      return encodeURI(normalized);
    }
  }

  return encodeURI(normalized);
};

const ViewSinglePaymentVoucherList = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: singleVoucher, isLoading: isSingleVoucherLoading } =
    useGetVoucherByIdQuery(id);
  const { printVoucher } = useVoucherPrint();

  if (isSingleVoucherLoading) return <HomeLoader />;
  if (!singleVoucher?.data) return <p>No voucher found</p>;

  const voucher = singleVoucher.data;
  const attachmentList = voucher.attachments || [];

  // ✅ Calculate totals
  const totalDebit = voucher.particulars
    .filter((p) => p.type === "Debit")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalCredit = voucher.particulars
    .filter((p) => p.type === "Credit")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // ✅ Convert total amount to words
  const amountInWords = numberToBangladeshiCurrencyWords(totalDebit || totalCredit);

  // ✅ Prepare data for print
  const voucherData = {
    voucherTitle: "Payment Voucher",
    config: {
      logo: appConfiguration?.logo,
      address: appConfiguration?.address,
      email: appConfiguration?.email,
      phone: appConfiguration?.phone,
      website: appConfiguration?.website,
    },
    voucherNo: voucher.voucherNo,
    date: new Date(voucher.date).toLocaleDateString(),
    rows: voucher.particulars.map((p) => ({
      type: p.type,
      particulars: p.particular?.accountType || "N/A",
      debit: p.type === "Debit" ? p.amount : 0,
      credit: p.type === "Credit" ? p.amount : 0,
    })),
    totalDebit,
    totalCredit,
    amountInWords,
    narration: voucher.narration,
  };

  return (
    <div className="p-6 bg-white shadow-sm rounded-lg border border-gray-200 text-sm">
      <Heading className="font-semibold mb-4">
        Payment Voucher Information
      </Heading>

      {/* Company Header */}
      <div className="items-center text-center border-b border-t py-5 border-gray-200 mb-6">
        <div className="flex justify-center items-center mb-2 w-48 mx-auto">
          <img
            src={appConfiguration?.logo}
            alt="logo"
            className="w-auto object-contain"
          />
        </div>

        <div className="flex justify-center items-center gap-2 text-gray-700 text-base font-medium mb-1">
          <FaLocationArrow className="text-gray-500" />
          <span>{appConfiguration?.address}</span>
        </div>

        <div className="flex justify-center items-center gap-4 text-gray-600 text-sm mb-1">
          <div className="flex items-center gap-2">
            <FaMailBulk className="text-gray-500" />
            <span>{appConfiguration?.email}</span>
          </div>
          <span>|</span>
          <div className="flex items-center gap-2">
            <FaPhone className="text-gray-500" />
            <span>{appConfiguration?.phone}</span>
          </div>
        </div>

        <div className="flex justify-center items-center gap-2 text-gray-600 text-sm">
          <FaEarthAfrica className="text-gray-500" />
          <span>{appConfiguration?.website}</span>
        </div>
      </div>

      {/* Header */}
      <h2 className="text-2xl text-secondary font-semibold text-center mb-4">
        Payment Voucher
      </h2>

      <div className="flex justify-between gap-4 mb-6 text-secondary font-medium">
        <div>
          <label className="block mb-1">Voucher No: {voucher.voucherNo}</label>
        </div>
        <div>
          <label className="block mb-1">
            Date: {new Date(voucher.date).toLocaleDateString()}
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        <div className="grid grid-cols-12 bg-primary p-2 font-semibold text-white text-center border-b border-primary">
          <div className="col-span-1 text-secondary font-medium">S/L</div>
          <div className="col-span-2 text-secondary font-medium">
            Debit / Credit
          </div>
          <div className="col-span-4 text-secondary font-medium">
            Particulars
          </div>
          <div className="col-span-2 text-secondary font-medium">Debit</div>
          <div className="col-span-3 text-secondary font-medium">Credit</div>
        </div>

        {voucher.particulars.map((p, index) => (
          <div
            key={p.id}
            className="grid grid-cols-12 items-center text-center gap-2"
          >
            <div className="px-3 py-2 col-span-1 border mt-2 font-medium text-gray-800">
              {index + 1}
            </div>
            <div className="col-span-2 px-3 py-2 border mt-2 font-medium text-gray-800">
              {p.type}
            </div>
            <div className="col-span-4 px-3 py-2 border mt-2 font-medium text-gray-800  pl-4 text-center">
              {p.particular?.accountType || "N/A"}
            </div>
            <div className="col-span-2 px-3 py-2 border mt-2 font-medium text-gray-800">
              {p.type === "Debit" ? p.amount.toFixed(2) : "0.00"}
            </div>
            <div className="col-span-3 px-3 py-2 border mt-2 font-medium text-gray-800">
              {p.type === "Credit" ? p.amount.toFixed(2) : "0.00"}
            </div>
          </div>
        ))}

        {/* Totals */}
        <div className="grid grid-cols-12 p-2 font-semibold text-center text-gray-700 bg-gray-50 gap-2">
          <div className="col-span-7 mt-2 text-right pr-4">Total Amount:</div>
          <div className="col-span-2 px-3 py-2 border border-secondary/20 font-medium text-gray-800">
            {totalDebit.toFixed(2)}
          </div>
          <div className="col-span-3 px-3 py-2 border border-secondary/20 font-medium text-gray-800">
            {totalCredit.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Amount in Words */}
      <div className="mt-4 p-3 bg-secondary/10 border border-gray-200 rounded-md">
        <p className="text-gray-700 font-medium text-center">
          (IN WORD: {amountInWords})
        </p>
      </div>

      {/* Notes */}
      {voucher.narration && (
        <div className="mt-6">
          <h3 className="font-semibold text-gray-700 mb-2">Notes</h3>
          <p>{voucher.narration}</p>
        </div>
      )}

      {attachmentList.length > 0 && (
        <div className="mt-6 rounded-md border border-gray-200 bg-slate-50 p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Attachments</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {attachmentList.map((attachment: any, index: number) => {
              const fileUrl = normalizeAttachmentUrl(attachment.fileUrl || attachment.url || "");
              const fileName = attachment.originalName || attachment.fileName || `Attachment ${index + 1}`;
              const attachmentHints = `${fileName} ${attachment.fileName || ""} ${attachment.originalName || ""} ${fileUrl}`;
              const extension = (fileName.split(".").pop() || "").toLowerCase();
              const isImage = /image\//i.test(String(attachment.mimeType || "")) || /\.(png|jpe?g|gif|webp|svg|bmp|ico|jfif|avif|heic|heif)$/i.test(attachmentHints);

              return (
                <div key={`${fileName}-${index}`} className="rounded-md border border-gray-200 bg-white p-3">
                  {fileUrl && isImage ? (
                    <img
                      src={fileUrl}
                      alt={fileName}
                      className="h-28 w-full rounded object-cover"
                      onError={(event) => {
                        const target = event.currentTarget as HTMLImageElement;
                        target.style.display = "none";
                        target.parentElement?.setAttribute("data-preview-failed", "true");
                      }}
                    />
                  ) : fileUrl ? (
                    <div className="flex h-28 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
                      {extension || "FILE"}
                    </div>
                  ) : null}
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-gray-700">{fileName}</span>
                    {fileUrl ? (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded bg-primary px-2 py-1 text-xs text-white hover:bg-primary/90"
                      >
                        Open
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-16 grid grid-cols-4 gap-6 text-sm">
        <p className="text-center whitespace-nowrap font-semibold underline">Prepared By</p>
        <p className="text-center whitespace-nowrap font-semibold underline">Accountant</p>
        <p className="text-center whitespace-nowrap font-semibold underline">Finance Director</p>
        <p className="text-center whitespace-nowrap font-semibold underline">Managing Director</p>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <Button
          onClick={() => printVoucher(voucherData)}
          variant="outline"
          className="hover:bg-secondary bg-primary hover:text-white text-white px-6 rounded-none flex items-center gap-2"
        >
          <span>Print</span>
          <GrNotes />
        </Button>
        <Button
          onClick={() => downloadVoucherPdf(voucherData)}
          variant="destructive"
          className="bg-red-600 hover:bg-red-700 text-white px-6 rounded-none flex items-center gap-2"
        >
          <span>PDF</span>
          <FaFilePdf />
        </Button>
        <Button
          variant="outline"
          className="border border-red-300 text-red-500 hover:bg-red-50 px-6 rounded-none"
             onClick={() => navigate("/payment-voucher")}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default ViewSinglePaymentVoucherList;
