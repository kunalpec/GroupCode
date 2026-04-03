import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "../hooks/use-toast";
import { verifyOtp } from "../redux/slices/authSlice";

function VerifyOtp() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, loading, pendingEmail } = useSelector((state) => state.auth);
  const [otp, setOtp] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await dispatch(verifyOtp({ email: pendingEmail, otp })).unwrap();
      toast({ title: "Verified", description: "Your account is now active." });
      navigate("/dashboard");
    } catch (error) {
      toast({ title: "Verification failed", description: error, variant: "destructive" });
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg rounded-[2rem] border border-slate-800 bg-slate-950/70 p-8 shadow-2xl backdrop-blur sm:p-10">
        <h1 className="text-3xl font-bold text-white">Verify OTP</h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter the 6-digit code sent to {pendingEmail || "your email"}.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <Input
            placeholder="123456"
            value={otp}
            maxLength={6}
            onChange={(event) => setOtp(event.target.value)}
          />
          <Button className="w-full" disabled={loading || !pendingEmail} type="submit">
            {loading ? "Verifying..." : "Verify and continue"}
          </Button>
        </form>
      </div>
    </main>
  );
}

export default VerifyOtp;
