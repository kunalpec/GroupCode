import { Github } from "lucide-react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "../hooks/use-toast";
import { login } from "../redux/slices/authSlice";
import { BACKEND_URL } from "../services/api";

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading } = useSelector((state) => state.auth);
  const [form, setForm] = useState({ email: "", password: "" });

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await dispatch(login(form)).unwrap();
      toast({ title: "Welcome back", description: "Your workspace is ready." });
      navigate(location.state?.from || "/dashboard");
    } catch (error) {
      toast({ title: "Login failed", description: error, variant: "destructive" });
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950/70 shadow-2xl backdrop-blur lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden border-r border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_35%),linear-gradient(160deg,_rgba(15,23,42,0.95),_rgba(2,6,23,0.92))] p-10 lg:block">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/70">Browser IDE</p>
          <h1 className="mt-5 max-w-sm text-5xl font-bold leading-tight text-white">
            Ship code together in a live container.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
            Login to launch your Docker-backed workspace, collaborate in realtime, and manage invites from one dashboard.
          </p>
        </section>

        <section className="p-8 sm:p-10">
          <div className="mx-auto max-w-md">
            <h2 className="text-3xl font-bold text-white">Sign in</h2>
            <p className="mt-2 text-sm text-slate-400">
              Use your email or continue with an OAuth provider.
            </p>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
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
              <Button className="w-full" disabled={loading} type="submit">
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <a href={`${BACKEND_URL}/auth/google`}>
                <Button className="w-full" variant="secondary">
                  Google
                </Button>
              </a>
              <a href={`${BACKEND_URL}/auth/github`}>
                <Button className="w-full" variant="secondary">
                  <Github className="mr-2 h-4 w-4" />
                  GitHub
                </Button>
              </a>
            </div>

            <p className="mt-6 text-sm text-slate-400">
              New here?{" "}
              <Link className="font-semibold text-cyan-300" to="/signup">
                Create an account
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Login;
