import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import AppLoader from "../components/AppLoader";
import { getMe, refreshAccessToken } from "../redux/slices/authSlice";

function ProtectedLayout() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { isAuthenticated, isBootstrapping } = useSelector((state) => state.auth);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await dispatch(getMe()).unwrap();
      } catch {
        try {
          await dispatch(refreshAccessToken()).unwrap();
          await dispatch(getMe()).unwrap();
        } catch {
          // ignore
        }
      }
    };

    bootstrap();
  }, [dispatch]);

  if (isBootstrapping) {
    return <AppLoader label="Restoring your session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export default ProtectedLayout;
