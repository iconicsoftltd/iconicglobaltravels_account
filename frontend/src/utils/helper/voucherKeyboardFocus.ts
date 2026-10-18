const closeOpenVoucherSelect = () => {
  const escapeEvent = new KeyboardEvent("keydown", {
    key: "Escape",
    code: "Escape",
    bubbles: true,
  });

  document.activeElement?.dispatchEvent(escapeEvent);
  document.dispatchEvent(escapeEvent);
};

const focusVoucherAmountByIndex = (index: number) => {
  const amountInput = document.querySelector<HTMLInputElement>(
    `[data-voucher-amount-index="${index}"]:not(:disabled)`,
  );

  amountInput?.focus({ preventScroll: true });
  amountInput?.select();
  return Boolean(amountInput);
};

export const focusNextVoucherParticular = (currentIndex: number) => {
  closeOpenVoucherSelect();

  window.setTimeout(() => {
    const nextTrigger = document.querySelector<HTMLElement>(
      `[data-voucher-particular-index="${currentIndex + 1}"]`,
    );

    if (nextTrigger) {
      nextTrigger.focus({ preventScroll: true });
      return;
    }

    focusVoucherAmountByIndex(0);
  }, 80);
};

export const focusNextVoucherAmount = (currentIndex: number) => {
  window.setTimeout(() => {
    const amountInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        "[data-voucher-amount-index]:not(:disabled)",
      ),
    );
    const nextInput = amountInputs.find((input) => {
      const inputIndex = Number(input.dataset.voucherAmountIndex);
      return inputIndex > currentIndex;
    });

    nextInput?.focus({ preventScroll: true });
    nextInput?.select();
  }, 0);
};
