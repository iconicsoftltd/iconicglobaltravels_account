import toast from "react-hot-toast";
import { FaFileExcel } from "react-icons/fa6";

import { Button } from "@/components/ui/button";
import { exportTablesToExcel } from "@/utils/helper/exportToExcel";

type ExcelReportButtonProps = {
  filename?: string;
  sheetName?: string;
  selector?: string;
  disabled?: boolean;
};

const ExcelReportButton = ({
  filename = "report",
  sheetName = "Report",
  selector = "main",
  disabled,
}: ExcelReportButtonProps) => {
  const handleExport = () => {
    const exported = exportTablesToExcel({ filename, sheetName, selector });

    if (!exported) {
      toast.error("No report data found to export");
      return;
    }

    toast.success("Excel report downloaded");
  };

  return (
    <Button
      type="button"
      variant="green"
      onClick={handleExport}
      disabled={disabled}
    >
      <FaFileExcel />
      Excel
    </Button>
  );
};

export default ExcelReportButton;
