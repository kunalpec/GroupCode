import { useMemo, useState } from "react";
import { getAvatarUrl, getInitials } from "../lib/avatar";
import { cn } from "../lib/utils";

function UserAvatar({ user, name, className, fallbackClassName = "", imageClassName = "" }) {
  const [failed, setFailed] = useState(false);
  const resolvedName = name || user?.name || "User";
  const avatarUrl = useMemo(() => getAvatarUrl(user), [user]);
  const shouldShowImage = avatarUrl && !failed;

  if (shouldShowImage) {
    return (
      <img
        alt={resolvedName}
        className={cn("object-cover", className, imageClassName)}
        onError={() => setFailed(true)}
        src={avatarUrl}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-[#1f3b5b] font-semibold text-[#dbeafe]",
        className,
        fallbackClassName,
      )}
    >
      {getInitials(resolvedName)}
    </div>
  );
}

export default UserAvatar;
