import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "../hooks/use-toast";
import { setPendingEmail, signup } from "../redux/slices/authSlice";

function Signup() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.auth);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    comparePassword: "",
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await dispatch(signup(form)).unwrap();
      dispatch(setPendingEmail(form.email));
      toast({
        title: "OTP sent",
        description: "Check your inbox and verify the account to continue.",
      });
      navigate("/verify-otp");
    } catch (error) {
      toast({ title: "Signup failed", description: error, variant: "destructive" });
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl rounded-[2rem] border border-slate-800 bg-slate-950/70 p-8 shadow-2xl backdrop-blur sm:p-10">
        <h1 className="text-3xl font-bold text-white">Create account</h1>
        <p className="mt-2 text-sm text-slate-400">
          Register first, verify OTP, and the app will log you in automatically.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <Input
            placeholder="Full name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
          <Input
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
          />
          <Input
            placeholder="Confirm password"
            type="password"
            value={form.comparePassword}
            onChange={(event) =>
              setForm((current) => ({ ...current, comparePassword: event.target.value }))
            }
          />
          <Button className="w-full" disabled={loading} type="submit">
            {loading ? "Creating account..." : "Continue"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-slate-400">
          Already have an account?{" "}
          <Link className="font-semibold text-cyan-300" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default Signup;
