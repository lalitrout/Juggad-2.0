// src/hooks/useInternetStatus.js
import { useEffect } from "react";
import Swal from "sweetalert2";

const useInternetStatus = () => {
  useEffect(() => {
    const handleOffline = () => {
      Swal.fire({
        icon: "warning",
        title: "No Internet Connection",
        text: "You don't have a stable internet connection. Some features may not work.",
        confirmButtonText: "OK",
      });
    };

    const handleOnline = () => {
      // You can optionally show "Back Online"
      Swal.fire({
        icon: "success",
        title: "Back Online",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);
};

export default useInternetStatus;
