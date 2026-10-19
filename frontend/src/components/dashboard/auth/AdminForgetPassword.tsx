import {
  forgetPasswordSchema,
  ForgetPasswordSchemaType,
} from "@/components/schemas/user/forgetPasswordSchema";
import { useForgetPasswordMutation } from "@/components/store/api/authenticationApi";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function AdminForgetPassword() {
  const [showPassword, setShowPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");

  const [forget, { isLoading: forgetLoading }] = useForgetPasswordMutation();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ForgetPasswordSchemaType>({
    resolver: zodResolver(forgetPasswordSchema),
  });

  // Inject "code" into RHF (no input field shown)
  useEffect(() => {
    if (code) {
      setValue("code", code);
    }
  }, [code, setValue]);

  // Submit handler
  const onSubmit = async (data: ForgetPasswordSchemaType) => {
    try {
      const result = await forget(data).unwrap();

      toast.success(result?.message || "Password has been reset successfully!");
      navigate("/admin-login");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to reset password");
    }
  };

  return (
    <>
      <div className="h-[94vh] flex flex-col md:flex-row overflow-hidden bg-slate-50">
        {/* LEFT SIDE IMAGE */}
        <div className="hidden md:flex md:w-1/2 relative overflow-hidden bg-primary">
          <div className="absolute inset-0 bg-primary" />
          <div className="absolute left-12 top-12 h-24 w-24 rounded-3xl border border-white/25 bg-secondary/20" />
          <div className="absolute right-12 bottom-16 h-28 w-28 rounded-full border border-white/20 bg-white/10" />
          <div className="relative z-10 flex flex-col justify-end p-12 text-white">
            <div className="mb-4 inline-flex rounded-full border border-white/20 bg-secondary px-4 py-1 text-sm font-semibold text-white">
              Reset access securely
            </div>
            <h1 className="text-4xl font-bold mb-4">Accounts Admin Portal</h1>
            <p className="text-lg text-white/90 max-w-md leading-relaxed">
              Manage your business accounts, invoices, and transactions securely
              in one place. Streamlined and powerful — designed for
              professionals.
            </p>
          </div>
        </div>

        {/* RIGHT SIDE FORM */}
        <div className="flex w-full md:w-1/2 justify-center items-center bg-slate-50">
          <div className="w-full max-w-md p-10 bg-white rounded-md shadow-xl border border-gray-100">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 h-1 w-16 rounded-full bg-secondary" />
              <h2 className="text-3xl font-bold text-primary">
                Reset Password
              </h2>
              <p className="text-gray-500 mt-2">Enter your new password</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Hidden Code Field */}
              <input type="hidden" {...register("code")} />

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  New Password
                </label>

                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...register("newPassword")}
                    className="w-full px-4 py-3 pr-12 rounded-lg border border-secondary/20 focus:ring-2 focus:ring-secondary focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-secondary"
                  >
                    👁
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>

                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...register("confirmPassword")}
                    className="w-full px-4 py-3 pr-12 rounded-lg border border-secondary/20 focus:ring-2 focus:ring-secondary focus:outline-none transition-all"
                  />
                </div>

                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={forgetLoading}
                className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all ${
                  forgetLoading
                    ? "bg-secondary/70 cursor-not-allowed"
                    : "bg-secondary hover:-translate-y-0.5 shadow-md hover:shadow-lg"
                }`}
              >
                {forgetLoading ? (
                  <span className="flex items-center justify-center">
                    Processing...
                  </span>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
