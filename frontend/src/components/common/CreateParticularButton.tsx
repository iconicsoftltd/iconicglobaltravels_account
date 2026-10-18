import { useState } from "react";
import { Plus } from "lucide-react";

import CreateParticularAccountModal from "@/components/common/modals/CreateParticularAccountModal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import getPermission from "@/utils/helper/getPermission";

type CreateParticularButtonProps = {
  compact?: boolean;
  title?: string;
};

const CreateParticularButton = ({ compact = false, title = "Create Particular" }: CreateParticularButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!getPermission("Particular", "create")) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size={compact ? "icon" : "default"}
          className={compact ? "h-10 w-10 shrink-0 rounded-md px-0" : "flex items-center gap-2 rounded px-5"}
          title={title}
          aria-label={title}
        >
          <Plus size={18} />
          {!compact && title}
        </Button>
      </DialogTrigger>

      <DialogContent
        className="w-[96vw] max-h-[90vh] overflow-y-auto rounded sm:max-w-[640px]"
        onSubmit={(event) => event.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-secondary">
            Create Particular
          </DialogTitle>
        </DialogHeader>

        <div className="my-3 border-t" />

        <div className="pt-2">
          <CreateParticularAccountModal
            onClose={() => setIsOpen(false)}
            editingParticular={null}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateParticularButton;
